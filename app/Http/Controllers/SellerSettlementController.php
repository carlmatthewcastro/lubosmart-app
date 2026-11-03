<?php

namespace App\Http\Controllers;

use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\Store;
use App\Services\Admin\AuditLogger;
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
        $query = SellerOrder::query()->where('status', 'completed')
            ->when($user->role === 'seller', fn ($q) => $q->where('store_id', $user->store?->id))
            ->with(['store:id,name', 'payout', 'parcelReturn', 'delivery:id,seller_order_id,status']);
        $parcels = $query->latest('id')->paginate(15);
        $storeIds = $parcels->getCollection()->pluck('store_id')->unique();
        $earned = SellerOrder::query()->whereIn('store_id', $storeIds)->where('status', 'completed')->selectRaw('store_id, SUM(seller_proceeds) as total')->groupBy('store_id')->pluck('total', 'store_id');
        $paid = SellerPayout::query()->join('seller_orders', 'seller_orders.id', '=', 'seller_payouts.seller_order_id')->whereIn('seller_orders.store_id', $storeIds)->selectRaw('seller_orders.store_id, SUM(amount_cents) as total')->groupBy('seller_orders.store_id')->pluck('total', 'store_id');
        $debits = DB::table('parcel_returns')->join('seller_orders', 'seller_orders.id', '=', 'parcel_returns.seller_order_id')->whereIn('seller_orders.store_id', $storeIds)->selectRaw('seller_orders.store_id, SUM(seller_debit_cents) as total')->groupBy('seller_orders.store_id')->pluck('total', 'store_id');
        $collections = DB::table('cod_collections')->whereIn('delivery_id', $parcels->getCollection()->pluck('delivery.id'))->get()->keyBy('delivery_id');
        $parcels->through(function ($parcel) use ($collections, $earned, $paid, $debits) {
            $cash = $collections->get($parcel->delivery?->id);
            $expected = (int) round(((float) $parcel->subtotal + (float) $parcel->shipping_fee) * 100);
            $reconciled = $cash && $cash->status === 'reconciled' && (int) round((float) $cash->amount * 100) === $expected && $cash->received_amount !== null && (int) round((float) $cash->received_amount * 100) === $expected;
            $held = $parcel->parcelReturn && ! in_array($parcel->parcelReturn->status, ['rejected', 'refunded', 'closed'], true);
            $amount = max(0, (int) round((float) $parcel->seller_proceeds * 100) - ($parcel->parcelReturn?->seller_debit_cents ?? 0));
            $available = (int) round((float) $earned->get($parcel->store_id, 0) * 100) - (int) $paid->get($parcel->store_id, 0) - (int) $debits->get($parcel->store_id, 0);

            return ['id' => $parcel->id, 'store' => $parcel->store->name, 'amount_cents' => $amount, 'payout' => $parcel->payout, 'can_pay' => $reconciled && ! $held && ! $parcel->payout && $amount > 0 && $available >= $amount, 'hold_reason' => ! $reconciled ? 'Awaiting full COD reconciliation' : ($held ? 'Return/refund under review' : ($amount === 0 ? 'No seller balance due' : ($available < $amount ? 'Store balance reserved against earlier payouts/refunds' : null)))];
        });

        return Inertia::render('finance/settlements', ['role' => $user->role, 'parcels' => $parcels]);
    }

    public function store(Request $request, SellerOrder $parcel, AuditLogger $audit)
    {
        $data = $request->validate(['amount' => 'required|numeric|decimal:0,2|min:0.01|max:99999999.99', 'reference' => 'required|string|min:3|max:100|unique:seller_payouts,reference', 'notes' => 'nullable|string|max:500']);
        try {
            DB::transaction(function () use ($request, $parcel, $data, $audit) {
                // All payout/refund operations serialize on the store before parcel locks.
                Store::query()->whereKey($parcel->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($parcel->id)->lockForUpdate()->firstOrFail();
                abort_unless($parcel->status === 'completed' && $parcel->delivery?->status === 'delivered' && $parcel->seller_proceeds !== null && ! $parcel->payout()->exists(), 409, 'This parcel is not available for settlement.');
                $return = $parcel->parcelReturn()->lockForUpdate()->first();
                abort_if($return && ! in_array($return->status, ['rejected', 'refunded', 'closed'], true), 409, 'Resolve the return before paying the seller.');
                $cash = DB::table('cod_collections')->where('delivery_id', $parcel->delivery->id)->lockForUpdate()->first();
                $expected = (int) round(((float) $parcel->subtotal + (float) $parcel->shipping_fee) * 100);
                abort_unless($cash && $cash->status === 'reconciled' && $cash->received_amount !== null && (int) round((float) $cash->amount * 100) === $expected && (int) round((float) $cash->received_amount * 100) === $expected, 409, 'Full COD receipt and reconciliation are required.');
                $amount = (int) round((float) $parcel->seller_proceeds * 100) - ($return?->seller_debit_cents ?? 0);
                $storeParcels = SellerOrder::query()->where('store_id', $parcel->store_id)->where('status', 'completed');
                $earned = (int) round((float) (clone $storeParcels)->sum('seller_proceeds') * 100);
                $paid = SellerPayout::query()->whereIn('seller_order_id', (clone $storeParcels)->select('id'))->sum('amount_cents');
                $debits = DB::table('parcel_returns')->whereIn('seller_order_id', (clone $storeParcels)->select('id'))->sum('seller_debit_cents');
                abort_if($earned - $paid - $debits < $amount, 409, 'Earlier refunds or payouts reserve this store balance. Resolve the outstanding balance before another payout.');
                if ($amount < 1 || (int) round((float) $data['amount'] * 100) !== $amount) {
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
