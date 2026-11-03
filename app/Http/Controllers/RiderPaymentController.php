<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\RiderPayment;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'totals' => ['fees' => (clone $query)->sum('amount_cents'), 'paid' => (clone $query)->whereNotNull('paid_at')->sum('amount_cents')],
            'riders' => $user->role === 'logistics' ? User::query()->managedRiders($user)->where('role', 'rider')->get(['id', 'name']) : [],
            'work' => $user->role === 'logistics' ? Delivery::query()->whereIn('logistics_center_id', $ids)->where(fn ($q) => $q->whereExists(fn ($events) => $events->selectRaw('1')->from('parcel_events')->whereColumn('parcel_events.delivery_id', 'deliveries.id')->whereIn('type', ['picked_up', 'delivered']))->orWhereExists(fn ($returns) => $returns->selectRaw('1')->from('parcel_returns')->whereColumn('parcel_returns.seller_order_id', 'deliveries.seller_order_id')->whereNotNull('received_at')))->latest('id')->paginate(15, ['id', 'seller_order_id', 'tracking_reference'], 'work_page')->withQueryString() : null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['delivery_id' => 'required|integer', 'rider_id' => 'required|integer', 'leg' => 'required|in:pickup,delivery,return', 'amount' => 'required|numeric|decimal:0,2|min:0.01|max:999999.99', 'notes' => 'required|string|min:3|max:500']);
        try {
            DB::transaction(function () use ($request, $data) {
                $delivery = Delivery::query()->whereKey($data['delivery_id'])->lockForUpdate()->firstOrFail();
                $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                abort_unless($actor->role === 'logistics' && $actor->canOperate() && $actor->logisticsCenters()->operational()->whereKey($delivery->logistics_center_id)->exists(), 403);
                $rider = User::query()->managedRiders($actor)->whereKey($data['rider_id'])->where('role', 'rider')->lockForUpdate()->first();
                abort_unless($rider && $rider->logisticsCenters()->whereKey($delivery->logistics_center_id)->exists(), 403);
                $worked = $data['leg'] === 'return'
                    ? DB::table('parcel_returns')->where('seller_order_id', $delivery->seller_order_id)->where('rider_id', $rider->id)->whereNotNull('received_at')->exists()
                    : DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('actor_id', $rider->id)->where('type', $data['leg'] === 'pickup' ? 'picked_up' : 'delivered')->exists();
                abort_unless($worked, 409, 'Record a fee only after this rider completed the corresponding physical work.');
                abort_if(RiderPayment::query()->where('delivery_id', $delivery->id)->where('rider_id', $rider->id)->where('leg', $data['leg'])->exists(), 409, 'This work already has a fee record.');
                RiderPayment::query()->create(['delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'logistics_center_id' => $delivery->logistics_center_id, 'recorded_by' => $request->user()->id, 'leg' => $data['leg'], 'amount_cents' => (int) round((float) $data['amount'] * 100), 'notes' => $data['notes']]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['delivery_id' => 'A fee for this rider and parcel leg has already been recorded.']);
        }

        return back()->with('status', 'Rider fee recorded by Logistics. COD and shipping totals are separate from this fee.');
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
        }, 3);

        return back()->with('status', 'Manual rider payment recorded by Logistics. No bank transfer was initiated.');
    }
}
