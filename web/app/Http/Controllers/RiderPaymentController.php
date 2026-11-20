<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\ParcelReturn;
use App\Models\ReturnTask;
use App\Models\RiderPayment;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Models\WeeklyRiderPayment;
use App\Services\Admin\AuditLogger;
use App\Services\Notifications\NotificationInbox;
use App\Services\ParcelFinance;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RiderPaymentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $ids = $user->role === 'logistics' ? $user->logisticsCenters()->operational()->pluck('logistics_centers.id') : collect();
        $query = RiderPayment::query()->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id), fn ($q) => $q->whereIn('logistics_center_id', $ids));

        return Inertia::render('finance/rider-payments', ['role' => $user->role, 'entries' => (clone $query)->with('rider:id,name')->latest('id')->paginate(15, ['*'], 'payments_page')->withQueryString(),
            'weekly' => WeeklyRiderPayment::query()->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id), fn ($q) => $q->whereIn('logistics_center_id', $ids))->with('rider:id,name')->latest('period_start')->paginate(15, ['*'], 'weekly_page')->withQueryString(),
            'totals' => ['fees' => (clone $query)->sum('amount_cents'), 'paid' => (clone $query)->whereNotNull('paid_at')->sum('amount_cents')],
            'riders' => $user->role === 'logistics' ? User::query()->managedRiders($user)->where('role', 'rider')->get(['id', 'name']) : [],
            'work' => $user->role === 'logistics' ? Delivery::query()->whereIn('logistics_center_id', $ids)->where(fn ($q) => $q->whereExists(fn ($events) => $events->selectRaw('1')->from('parcel_events')->whereColumn('parcel_events.delivery_id', 'deliveries.id')->whereIn('type', ['picked_up', 'delivered']))->orWhereExists(fn ($returns) => $returns->selectRaw('1')->from('parcel_returns')->whereColumn('parcel_returns.seller_order_id', 'deliveries.seller_order_id')->whereNotNull('received_at')))->latest('id')->paginate(15, ['id', 'seller_order_id', 'tracking_reference'], 'work_page')->withQueryString()->through(fn (Delivery $delivery) => $delivery->withoutAppends()) : null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['return_task_id' => 'nullable|integer', 'delivery_id' => 'required|integer', 'rider_id' => 'required|integer', 'leg' => 'required|in:pickup,delivery,return,return_collection', 'amount' => 'required|numeric|decimal:0,2|min:0.01|max:999999.99', 'notes' => 'required|string|min:3|max:500']);
        try {
            DB::transaction(function () use ($request, $data) {
                $source = Delivery::query()->findOrFail($data['delivery_id']);
                Store::query()->whereKey($source->sellerOrder->store_id)->lockForUpdate()->firstOrFail();
                SellerOrder::query()->whereKey($source->seller_order_id)->lockForUpdate()->firstOrFail();
                ParcelReturn::query()->where('seller_order_id', $source->seller_order_id)->orderBy('id')->lockForUpdate()->get();
                $delivery = Delivery::query()->whereKey($data['delivery_id'])->lockForUpdate()->firstOrFail();
                $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                abort_unless($actor->role === 'logistics' && $actor->canOperate() && $actor->logisticsCenters()->operational()->whereKey($delivery->logistics_center_id)->exists(), 403);
                $rider = User::query()->managedRiders($actor)->whereKey($data['rider_id'])->where('role', 'rider')->lockForUpdate()->first();
                abort_unless($rider && $rider->logisticsCenters()->whereKey($delivery->logistics_center_id)->exists(), 403);
                $task = null;
                if (in_array($data['leg'], ['return', 'return_collection'], true)) {
                    $tasks = ReturnTask::query()->whereHas('parcelReturn', fn ($q) => $q->where('seller_order_id', $delivery->seller_order_id))
                        ->when($data['return_task_id'] ?? null, fn ($q, $id) => $q->whereKey($id))->lockForUpdate()->get();
                    if ($tasks->count() > 1 || (! empty($data['return_task_id']) && $tasks->isEmpty())) {
                        throw ValidationException::withMessages(['return_task_id' => 'Choose the linked return task for this completed work.']);
                    }
                    $task = $tasks->first();
                }
                $worked = $data['leg'] === 'return_collection'
                    ? DB::table('parcel_returns')->where('seller_order_id', $delivery->seller_order_id)->where('collection_rider_id', $rider->id)->whereNotNull('facility_received_at')->exists()
                    : ($data['leg'] === 'return'
                    ? DB::table('parcel_returns')->where('seller_order_id', $delivery->seller_order_id)->where('rider_id', $rider->id)->whereNotNull('received_at')->exists()
                    : DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('actor_id', $rider->id)->where('type', $data['leg'] === 'pickup' ? 'picked_up' : 'delivered')->exists());
                if ($task) {
                    $case = $task->parcelReturn;
                    $worked = $data['leg'] === 'return_collection' ? ($case->collection_rider_id === $rider->id && $case->facility_received_at) : ($case->seller_return_rider_id === $rider->id && $task->seller_delivered_at);
                }
                abort_unless($worked, 409, 'Record a fee only after this rider completed the corresponding physical work.');
                $workedAt = $data['leg'] === 'return_collection'
                    ? DB::table('parcel_returns')->where('seller_order_id', $delivery->seller_order_id)->value('collected_at')
                    : ($data['leg'] === 'return'
                    ? DB::table('parcel_returns')->where('seller_order_id', $delivery->seller_order_id)->value('received_at')
                    : DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('actor_id', $rider->id)->where('type', $data['leg'] === 'pickup' ? 'picked_up' : 'delivered')->value('occurred_at'));
                if ($task) {
                    $workedAt = $data['leg'] === 'return_collection' ? $case->collected_at : $task->seller_delivered_at;
                }
                $workDate = CarbonImmutable::parse($workedAt)->timezone('Asia/Manila')->toDateString();
                abort_if(WeeklyRiderPayment::query()->where('rider_id', $rider->id)->whereDate('period_start', '<=', $workDate)->whereDate('period_end', '>=', $workDate)->exists(), 409, 'Weekly compensation already covers this work.');
                $key = ($task ? 'return:'.$task->id : 'delivery:'.$delivery->id).':'.$rider->id.':'.$data['leg'];
                abort_if(RiderPayment::query()->where('operation_key', $key)->exists(), 409, 'This work already has a fee record.');
                $amount = ParcelFinance::cents((string) $data['amount']);
                $payment = RiderPayment::query()->create(['operation_key' => $key, 'return_task_id' => $task?->id, 'delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'logistics_center_id' => $delivery->logistics_center_id, 'recorded_by' => $request->user()->id, 'leg' => $data['leg'], 'amount_cents' => $amount, 'notes' => $data['notes']]);
                if ($task) {
                    $case->increment('return_shipping_cents', $amount);
                    DB::table('refund_fund_entries')->insert(['type' => 'return_shipping_obligation', 'amount_cents' => $amount, 'parcel_return_id' => $case->id,
                        'actor_id' => $actor->id, 'operation_key' => 'return-fee:'.$payment->id, 'reference' => 'RTF-'.Str::uuid(),
                        'responsibility' => $case->return_shipping_responsibility, 'logistics_center_id' => $delivery->logistics_center_id,
                        'notes' => 'Actual completed return work fee owed to rider by Logistics; transport cost borne by '.($case->return_shipping_responsibility ?? 'legacy policy under review').'. No cash transfer or buyer wallet debit.', 'created_at' => now()]);
                }
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['delivery_id' => 'A fee for this rider and parcel leg has already been recorded.']);
        }

        return back()->with('status', 'Rider fee recorded by Logistics. COD and shipping totals are separate from this fee.');
    }

    public function weekly(Request $request)
    {
        $data = $request->validate(['rider_id' => 'required|integer', 'period_start' => 'required|date_format:Y-m-d|after_or_equal:'.now('Asia/Manila')->toDateString(),
            'amount' => 'required|numeric|decimal:0,2|min:0.01|max:999999.99', 'payment_date' => 'required|date_format:Y-m-d|after_or_equal:period_start', 'notes' => 'nullable|string|max:500']);
        DB::transaction(function () use ($request, $data) {
            $actor = $request->user();
            $rider = User::query()->managedRiders($actor)->whereKey($data['rider_id'])->lockForUpdate()->firstOrFail();
            abort_unless($actor->role === 'logistics' && $actor->canOperate() && $rider->canOperate() && $rider->role === 'rider'
                && $actor->logisticsCenters()->operational()->whereKey($rider->logistics_center_id)->exists(), 403);
            $end = CarbonImmutable::parse($data['period_start'], 'Asia/Manila')->addDays(6)->toDateString();
            abort_if(WeeklyRiderPayment::query()->where('rider_id', $rider->id)->whereDate('period_start', '<=', $end)->whereDate('period_end', '>=', $data['period_start'])->exists(), 409, 'This rider already has compensation covering these dates.');
            // New periods start today or later, so historical work is never silently converted.
            abort_if(RiderPayment::query()->where('rider_id', $rider->id)->whereBetween('created_at', [CarbonImmutable::parse($data['period_start'], 'Asia/Manila')->utc(), CarbonImmutable::parse($end, 'Asia/Manila')->endOfDay()->utc()])->exists(), 409, 'Parcel fees already exist in this period. Start a later period.');
            $payment = WeeklyRiderPayment::query()->create(['rider_id' => $rider->id, 'logistics_center_id' => $rider->logistics_center_id, 'recorded_by' => $actor->id,
                'period_start' => $data['period_start'], 'period_end' => $end, 'amount_cents' => ParcelFinance::cents((string) $data['amount']), 'payment_date' => $data['payment_date'], 'notes' => $data['notes'] ?? null]);
            app(AuditLogger::class)->record(['actor_id' => $actor->id, 'subject_type' => 'rider_compensation', 'subject_id' => $payment->id, 'action' => 'weekly_compensation_agreed', 'changes' => $payment->toArray()]);
        }, 3);

        return back()->with('status', 'Weekly compensation agreed. COD remains separate.');
    }

    public function payWeekly(Request $request, WeeklyRiderPayment $payment)
    {
        $data = $request->validate(['payment_reference' => 'required|string|min:3|max:100|unique:weekly_rider_payments,payment_reference']);
        DB::transaction(function () use ($request, $payment, $data) {
            $payment = WeeklyRiderPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            $actor = $request->user();
            abort_unless($actor->role === 'logistics' && $actor->canOperate() && $actor->logisticsCenters()->operational()->whereKey($payment->logistics_center_id)->exists(), 403);
            abort_if($payment->paid_at, 409, 'This weekly payment is already recorded.');
            $payment->update([...$data, 'paid_by' => $actor->id, 'paid_at' => now()]);
            app(NotificationInbox::class)->send($payment->rider_id, 'compensation.paid', 'weekly:'.$payment->id, 'Weekly compensation paid', 'Your weekly compensation payment has been recorded.', 'compensation', $payment->id);
        }, 3);

        return back()->with('status', 'Weekly rider payment recorded.');
    }

    public function pay(Request $request, RiderPayment $payment)
    {
        abort_unless($request->user()->logisticsCenters()->operational()->whereKey($payment->logistics_center_id)->exists(), 403);
        $data = $request->validate(['payment_reference' => 'required|string|min:3|max:100']);
        DB::transaction(function () use ($request, $payment, $data) {
            $payment = RiderPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->role === 'logistics' && $actor->canOperate() && $actor->logisticsCenters()->operational()->whereKey($payment->logistics_center_id)->exists(), 403);
            abort_if($payment->paid_at, 409, 'This rider payment is already recorded.');
            $payment->update([...$data, 'paid_by' => $request->user()->id, 'paid_at' => now()]);
            app(NotificationInbox::class)->send($payment->rider_id, 'compensation.paid', 'parcel:'.$payment->id, 'Rider payment recorded', 'Your completed parcel work payment has been recorded.', 'parcel_compensation', $payment->id);
        }, 3);

        return back()->with('status', 'Manual rider payment recorded by Logistics. No bank transfer was initiated.');
    }
}
