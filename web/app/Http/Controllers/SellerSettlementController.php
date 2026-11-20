<?php

namespace App\Http\Controllers;

use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\Store;
use App\Services\Admin\AuditLogger;
use App\Services\ParcelFinance;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SellerSettlementController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->canAdmin('finance') || $user->role === 'seller', 403);
        $query = SellerOrder::query()->where('status', 'completed')
            ->when($user->role === 'seller', fn ($q) => $q->where('store_id', $user->store?->id))
            ->with(['store:id,name', 'payout', 'parcelReturns', 'logisticsRemittance', 'coinAllocation', 'delivery:id,seller_order_id,status,logistics_center_id,tracking_reference']);
        $parcels = $query->latest('id')->paginate(15);
        $storeIds = $parcels->getCollection()->pluck('store_id')->unique();
        $earned = ParcelFinance::fundedParcels(SellerOrder::query()->whereIn('store_id', $storeIds))
            ->whereDoesntHave('parcelReturns', fn ($q) => $q->whereNotIn('refund_status', ['rejected', 'credited', 'approved_no_refund']))
            ->selectRaw('store_id, SUM(ROUND(seller_proceeds * 100)) as total')->groupBy('store_id')->pluck('total', 'store_id');
        $paid = SellerPayout::query()->join('seller_orders', 'seller_orders.id', '=', 'seller_payouts.seller_order_id')->whereIn('seller_orders.store_id', $storeIds)->selectRaw('seller_orders.store_id, SUM(amount_cents) as total')->groupBy('seller_orders.store_id')->pluck('total', 'store_id');
        $debits = DB::table('parcel_returns')->join('seller_orders', 'seller_orders.id', '=', 'parcel_returns.seller_order_id')->whereIn('seller_orders.store_id', $storeIds)->selectRaw('seller_orders.store_id, SUM(seller_debit_cents - seller_recovered_cents) as total')->groupBy('seller_orders.store_id')->pluck('total', 'store_id');
        $collections = DB::table('cod_collections')->whereIn('delivery_id', $parcels->getCollection()->pluck('delivery.id'))->get()->keyBy('delivery_id');
        $parcels->through(function ($parcel) use ($collections, $earned, $paid, $debits) {
            $cash = $collections->get($parcel->delivery?->id);
            $reconciled = ParcelFinance::reconciled($parcel, $cash) && ParcelFinance::funded($parcel);
            $held = $parcel->parcelReturns->contains(fn ($case) => ! in_array($case->refund_status, ['rejected', 'credited', 'approved_no_refund'], true));
            $amount = max(0, ParcelFinance::cents((string) $parcel->seller_proceeds) - $parcel->parcelReturns->sum('seller_debit_cents'));
            $available = (int) $earned->get($parcel->store_id, 0) - (int) $paid->get($parcel->store_id, 0) - (int) $debits->get($parcel->store_id, 0);

            return ['tracking_reference' => $parcel->delivery?->tracking_reference, 'platform_receipt' => $parcel->logisticsRemittance?->received_on?->toDateString(), 'funded' => ParcelFinance::funded($parcel), 'breakdown' => ['gross_cents' => ParcelFinance::cents($parcel->subtotal) + ParcelFinance::cents($parcel->discount_amount ?? '0'), 'voucher_cents' => ParcelFinance::cents($parcel->discount_amount ?? '0'), 'net_cents' => ParcelFinance::cents($parcel->subtotal), 'commission_cents' => ParcelFinance::cents($parcel->commission_amount ?? '0'), 'seller_proceeds_cents' => ParcelFinance::cents($parcel->seller_proceeds ?? '0'), 'refund_deductions_cents' => $parcel->parcelReturns->sum('seller_debit_cents'), 'paid_cents' => $parcel->payout?->amount_cents ?? 0, 'store_available_cents' => $available], 'id' => $parcel->id, 'store' => $parcel->store->name, 'amount_cents' => $amount, 'payout' => $parcel->payout, 'can_pay' => $reconciled && ! $held && ! $parcel->payout && $amount > 0 && $available >= $amount, 'hold_reason' => $parcel->payout ? null : (! $reconciled ? 'Awaiting full COD reconciliation and platform product-cash receipt' : ($held ? 'Return/refund under review' : ($amount === 0 ? 'No seller balance due' : ($available < $amount ? 'Store balance reserved against earlier payouts/refunds' : null))))];
        });

        return Inertia::render('finance/settlements', ['role' => $user->role, 'parcels' => $parcels]);
    }

    public function store(Request $request, SellerOrder $parcel, AuditLogger $audit)
    {
        abort_unless($request->user()->canAdmin('finance'), 403);
        $data = $request->validate(['amount' => 'required|numeric|decimal:0,2|min:0.01|max:99999999.99', 'reference' => 'required|string|min:3|max:100|unique:seller_payouts,reference', 'notes' => 'nullable|string|max:500']);
        try {
            DB::transaction(function () use ($request, $parcel, $data, $audit) {
                // All payout/refund operations serialize on the store before parcel locks.
                Store::query()->whereKey($parcel->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($parcel->id)->lockForUpdate()->firstOrFail();
                abort_unless($parcel->status === 'completed' && $parcel->delivery?->status === 'delivered' && $parcel->seller_proceeds !== null && ! $parcel->payout()->exists(), 409, 'This parcel is not available for settlement.');
                $returns = $parcel->parcelReturns()->lockForUpdate()->get();
                abort_if($returns->contains(fn ($case) => ! in_array($case->refund_status, ['rejected', 'credited', 'approved_no_refund'], true)), 409, 'Resolve the return before paying the seller.');
                $cash = DB::table('cod_collections')->where('delivery_id', $parcel->delivery->id)->lockForUpdate()->first();
                abort_unless(ParcelFinance::reconciled($parcel, $cash) && ParcelFinance::funded($parcel), 409, 'Full COD reconciliation and actual product-cash remittance to the platform are required.');
                $amount = ParcelFinance::cents((string) $parcel->seller_proceeds) - $returns->sum('seller_debit_cents');
                $storeParcels = SellerOrder::query()->where('store_id', $parcel->store_id)->where('status', 'completed');
                $earned = (int) ParcelFinance::fundedParcels(clone $storeParcels)
                    ->whereDoesntHave('parcelReturns', fn ($q) => $q->whereNotIn('refund_status', ['rejected', 'credited', 'approved_no_refund']))->selectRaw('COALESCE(SUM(ROUND(seller_proceeds * 100)), 0) as cents')->value('cents');
                $paid = SellerPayout::query()->whereIn('seller_order_id', (clone $storeParcels)->select('id'))->sum('amount_cents');
                $debits = DB::table('parcel_returns')->whereIn('seller_order_id', (clone $storeParcels)->select('id'))->selectRaw('COALESCE(SUM(seller_debit_cents - seller_recovered_cents), 0) as cents')->value('cents');
                abort_if($earned - $paid - $debits < $amount, 409, 'Earlier refunds or payouts reserve this store balance. Resolve the outstanding balance before another payout.');
                if ($amount < 1 || ParcelFinance::cents((string) $data['amount']) !== $amount) {
                    throw ValidationException::withMessages(['amount' => 'Record exactly the remaining seller proceeds shown for this parcel.']);
                }
                $payout = SellerPayout::query()->create(['seller_order_id' => $parcel->id, 'recorded_by' => $request->user()->id, 'amount_cents' => $amount, 'reference' => $data['reference'], 'notes' => $data['notes'] ?? null]);
                $audit->record(['actor_id' => $request->user()->id, 'subject_type' => 'seller_order', 'subject_id' => $parcel->id, 'action' => 'seller_payout_recorded', 'changes' => ['payout_id' => $payout->id, 'amount_cents' => $amount, 'reference' => $data['reference']]]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['reference' => 'This payout or payment reference has already been recorded.']);
        }

        return back()->with('status', 'Manual seller payout recorded. No bank transfer was initiated by the system.');
    }
}
