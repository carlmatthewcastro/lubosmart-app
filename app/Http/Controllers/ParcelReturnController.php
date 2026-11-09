<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\RestorePurchasedStock;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ParcelReturnController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $filters = $request->validate(['parcel' => 'nullable|integer']);
        $ids = $user->role === 'logistics' ? $user->logisticsCenters()->operational()->pluck('logistics_centers.id') : collect();
        $query = ParcelReturn::query()
            ->when($user->role === 'buyer', fn ($q) => $q->where('buyer_id', $user->id))
            ->when($user->role === 'seller', fn ($q) => $q->whereHas('sellerOrder', fn ($p) => $p->where('store_id', $user->store?->id)))
            ->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id))
            ->when($user->role === 'logistics', fn ($q) => $q->whereHas('sellerOrder.delivery', fn ($d) => $d->whereIn('logistics_center_id', $ids)))
            ->with(['events', 'sellerOrder:id,order_id,store_id,subtotal,shipping_fee,shipping_quote', 'sellerOrder.store:id,user_id,name', 'sellerOrder.items:id,seller_order_id,product_name,variant_name,quantity', 'sellerOrder.order:id,shipping_recipient_name,shipping_phone,shipping_line1,shipping_barangay,shipping_city,shipping_province', 'sellerOrder.delivery:id,seller_order_id,tracking_reference,logistics_center_id']);
        $eligible = $user->role === 'buyer' ? SellerOrder::query()->whereHas('order', fn ($q) => $q->where('buyer_id', $user->id))->where('status', 'completed')->whereHas('delivery', fn ($q) => $q->where('status', 'delivered'))->whereDoesntHave('parcelReturn')
            ->when($filters['parcel'] ?? null, fn ($q, $id) => $q->whereKey($id))->with('store:id,name')->latest('id')->limit(100)->get(['id', 'store_id']) : [];

        $returns = $query->latest('id')->paginate(15);
        $addresses = in_array($user->role, ['logistics', 'rider'], true) ? Address::query()->whereIn('user_id', $returns->getCollection()->pluck('sellerOrder.store.user_id'))->orderByDesc('is_default')->latest('id')->get(['user_id', 'recipient_name', 'phone', 'line1', 'barangay', 'city', 'province'])->groupBy('user_id') : collect();
        $returns->through(function ($return) use ($addresses, $user) {
            $return->makeHidden(['seller_debit_cents', 'commission_reversal_cents']);
            if (in_array($user->role, ['logistics', 'rider'], true)) {
                $return->makeHidden(['refund_cents', 'refund_reference', 'refunded_by']);
                $return->setAttribute('pickup_address', $return->sellerOrder->shipping_quote['pickup_address'] ?? $addresses->get($return->sellerOrder->store->user_id)?->first());
            }

            return $return;
        });

        return Inertia::render('finance/returns', ['role' => $user->role, 'returns' => $returns, 'eligible' => $eligible,
            'riders' => $user->role === 'logistics' ? User::query()->managedRiders($user)->where('role', 'rider')->where('status', 'approved')->get(['id', 'name']) : [],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['seller_order_id' => 'required|integer', 'reason' => 'required|string|min:10|max:2000']);
        $source = SellerOrder::query()->findOrFail($data['seller_order_id']);
        try {
            DB::transaction(function () use ($request, $data, $source) {
                Store::query()->whereKey($source->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($data['seller_order_id'])->lockForUpdate()->firstOrFail();
                abort_unless($parcel->order->buyer_id === $request->user()->id, 403);
                abort_unless($parcel->status === 'completed' && $parcel->delivery?->status === 'delivered' && ! $parcel->parcelReturn()->exists(), 409, 'Only delivered parcels without an existing return request can be requested.');
                $return = ParcelReturn::query()->create(['seller_order_id' => $parcel->id, 'buyer_id' => $request->user()->id, 'reason' => $data['reason']]);
                $return->events()->create(['actor_id' => $request->user()->id, 'action' => 'requested', 'notes' => $data['reason']]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['seller_order_id' => 'A return request already exists for this parcel.']);
        }

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => 'Return requested for review.']);
        }

        return back()->with('status', 'Return requested for the whole parcel. Admin will review it before any return transport or refund.');
    }

    public function update(Request $request, ParcelReturn $return, AuditLogger $audit)
    {
        $data = $request->validate(['action' => 'required|in:approve,reject,assign,collect,receive,refund,close', 'reason' => 'required|string|min:3|max:500', 'rider_id' => 'required_if:action,assign|nullable|integer', 'tracking_reference' => 'required_if:action,collect,receive|nullable|string|max:40', 'condition' => 'required_if:action,receive|nullable|in:intact,damaged', 'restock' => 'required_if:action,receive|boolean', 'amount' => 'required_if:action,refund|nullable|numeric|decimal:0,2|min:0.01|max:99999999.99', 'reference' => 'required_if:action,refund|nullable|string|min:3|max:100']);
        try {
            DB::transaction(function () use ($request, $return, $data, $audit) {
                Store::query()->whereKey($return->sellerOrder->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($return->seller_order_id)->lockForUpdate()->firstOrFail();
                $return = ParcelReturn::query()->whereKey($return->id)->lockForUpdate()->firstOrFail();
                $actor = $request->user();
                $delivery = $parcel->delivery;
                $action = $data['action'];
                if (in_array($action, ['approve', 'reject', 'refund', 'close'], true)) {
                    abort_unless($actor->canAdmin($action === 'refund' ? 'finance' : 'disputes'), 403);
                } elseif ($action === 'assign') {
                    abort_unless($actor->role === 'logistics' && $actor->logisticsCenters()->operational()->whereKey($delivery?->logistics_center_id)->exists(), 403);
                } elseif ($action === 'collect') {
                    abort_unless($actor->role === 'rider' && $return->rider_id === $actor->id && $actor->logisticsCenters()->operational()->whereKey($delivery?->logistics_center_id)->exists(), 403);
                } else {
                    abort_unless($actor->role === 'seller' && $parcel->store_id === $actor->store?->id, 403);
                }
                if (in_array($action, ['collect', 'receive'], true)) {
                    if (! $delivery?->tracking_reference || ! hash_equals($delivery->tracking_reference, $data['tracking_reference'])) {
                        throw ValidationException::withMessages(['tracking_reference' => 'Scan or enter the tracking reference attached to this return parcel.']);
                    }
                }
                $changes = [];
                if (in_array($action, ['approve', 'reject'], true)) {
                    abort_unless($return->status === 'requested', 409, 'This return already has a decision.');
                    $changes = ['status' => $action === 'approve' ? 'approved' : 'rejected', 'decision_reason' => $data['reason'], 'decided_by' => $actor->id];
                } elseif ($action === 'assign') {
                    abort_unless(in_array($return->status, ['approved', 'assigned'], true), 409, 'Only an approved, uncollected return can be assigned.');
                    $rider = User::query()->managedRiders($actor)->whereKey($data['rider_id'])->where('role', 'rider')->first();
                    abort_unless($rider && $rider->canOperate() && $rider->logisticsCenters()->operational()->whereKey($delivery->logistics_center_id)->exists(), 403);
                    if ($delivery->service_area_id && (! DB::table('service_areas')->where('id', $delivery->service_area_id)->where('logistics_center_id', $delivery->logistics_center_id)->where('is_active', true)->exists()
                        || ! DB::table('rider_service_area')->where('rider_id', $rider->id)->where('service_area_id', $delivery->service_area_id)->exists())) {
                        throw ValidationException::withMessages(['rider_id' => 'Choose a rider who covers this parcel destination in your active service area.']);
                    }
                    $changes = ['status' => 'assigned', 'rider_id' => $rider->id];
                } elseif ($action === 'collect') {
                    abort_unless($return->status === 'assigned', 409, 'This return is not awaiting collection.');
                    $changes = ['status' => 'collected', 'collected_at' => now()];
                } elseif ($action === 'receive') {
                    abort_unless($return->status === 'collected', 409, 'Confirm receipt only after the assigned rider collected the return.');
                    if ($data['restock'] && $data['condition'] !== 'intact') {
                        throw ValidationException::withMessages(['restock' => 'Damaged goods cannot be automatically restocked.']);
                    }
                    if ($data['restock']) {
                        app(RestorePurchasedStock::class)->handle($parcel->items()->get(), true);
                    }
                    $changes = ['status' => 'received', 'received_at' => now(), 'condition' => $data['condition'], 'restocked' => $data['restock']];
                } elseif ($action === 'close') {
                    abort_unless($return->status === 'received' && $return->received_at && ! $return->refunded_at, 409, 'Only a received return without a recorded refund can be closed without payment.');
                    $changes = ['status' => 'closed', 'decision_reason' => $data['reason']];
                } else {
                    abort_unless($return->status === 'received' && $return->received_at && ! $return->refunded_at, 409, 'Confirmed seller receipt is required before a refund.');
                    $cash = DB::table('cod_collections')->where('delivery_id', $delivery->id)->lockForUpdate()->first();
                    $expected = (int) round(((float) $parcel->subtotal + (float) $parcel->shipping_fee) * 100);
                    abort_unless($cash && $cash->status === 'reconciled' && $cash->received_amount !== null && (int) round((float) $cash->amount * 100) === $expected && (int) round((float) $cash->received_amount * 100) === $expected, 409, 'Reconcile the actual full COD receipt before recording the refund.');
                    $amount = (int) round((float) $data['amount'] * 100);
                    if ($amount > $expected) {
                        throw ValidationException::withMessages(['amount' => 'The refund cannot exceed the amount actually collected for this parcel.']);
                    }
                    $products = min($amount, (int) round((float) $parcel->subtotal * 100));
                    $subtotalCents = (int) round((float) $parcel->subtotal * 100);
                    $recognizedCommission = (int) round((float) $parcel->commission_amount * 100);
                    $commission = $subtotalCents > 0 ? min($recognizedCommission, intdiv($products * $recognizedCommission + intdiv($subtotalCents, 2), $subtotalCents)) : 0;
                    $changes = ['status' => 'refunded', 'refund_cents' => $amount, 'seller_debit_cents' => $products - $commission, 'commission_reversal_cents' => $commission, 'refund_reference' => $data['reference'], 'refunded_by' => $actor->id, 'refunded_at' => now()];
                    $audit->record(['actor_id' => $actor->id, 'subject_type' => 'seller_order', 'subject_id' => $parcel->id, 'action' => 'manual_refund_recorded', 'changes' => ['return_id' => $return->id, ...$changes, 'refunded_at' => now()->toIso8601String(), 'reason' => $data['reason']]]);
                }
                $return->update($changes);
                if (in_array($action, ['approve', 'reject', 'close'], true)) {
                    $audit->record(['actor_id' => $actor->id, 'subject_type' => 'parcel_return', 'subject_id' => $return->id, 'action' => 'return_'.$action, 'changes' => ['status' => $changes['status'], 'reason' => $data['reason']]]);
                }
                $return->events()->create(['actor_id' => $actor->id, 'action' => $action, 'notes' => $data['reason']]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['reference' => 'This refund reference is already recorded.']);
        }

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => 'Return action recorded.']);
        }

        return back()->with('status', 'Return action recorded. A refund record confirms a manual payment, not an automatic bank transfer.');
    }
}
