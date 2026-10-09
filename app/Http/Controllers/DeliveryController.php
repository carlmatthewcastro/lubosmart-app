<?php

namespace App\Http\Controllers;

use App\Models\CommerceSetting;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\User;
use App\Notifications\OrderDeliveryUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DeliveryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['courier', 'sorting_center', 'admin']), 403);
        $centers = $user->sortingCenters()->operational()->get(['sorting_centers.id', 'name']);
        $relations = ['sellerOrder.items', 'sellerOrder.order', 'sellerOrder.store:id,name,user_id', 'sellerOrder.store.user:id,name', 'sellerOrder.store.user.addresses:id,user_id,line1,barangay,city,province,phone', 'rider:id,name'];
        $query = Delivery::query()->with($relations);
        if ($user->role === 'courier') {
            $query->where('rider_id', $user->id);
        } elseif ($user->role === 'sorting_center') {
            $query->whereIn('sorting_center_id', $centers->pluck('id'));
        }
        $filters = $request->validate(['stage' => 'nullable|in:all,pickups,incoming,sorting,dispatch,monitoring', 'search' => 'nullable|string|max:100']);
        $query->when($filters['search'] ?? null, fn ($q, $search) => $q->whereHas('sellerOrder.store', fn ($q) => $q->where('name', 'like', '%'.$search.'%')));
        if ($user->role === 'sorting_center') {
            match ($filters['stage'] ?? 'all') {
                'pickups' => $query->where('status', 'unassigned')->whereNull('pickup_approved_at')->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped')),
                'incoming' => $query->whereIn('status', ['assigned', 'picked_up', 'in_transit'])->whereNull('received_at'),
                'sorting' => $query->whereNotNull('received_at')->whereNull('sorted_at')->where('status', '!=', 'delivered'),
                'dispatch' => $query->whereNotNull('sorted_at')->whereIn('status', ['picked_up', 'in_transit']),
                'monitoring' => $query->whereIn('status', ['in_transit', 'out_for_delivery', 'delivered']),
                default => null,
            };
        }
        $deliveries = $query->latest('id')->paginate(10)->withQueryString();
        $available = $user->role === 'sorting_center' && $centers->isNotEmpty()
            ? Delivery::query()->whereNull('sorting_center_id')->where('status', 'unassigned')->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped'))->with($relations)->latest('id')->limit(50)->get()
            : [];
        foreach (collect($deliveries->items())->merge($available) as $parcel) {
            $store = $parcel->sellerOrder->store;
            $store->setAttribute('pickup_address', $store->user?->addresses->first()?->only(['line1', 'barangay', 'city', 'province', 'phone']));
            $store->unsetRelation('user');
        }
        $riders = $user->role === 'sorting_center' ? User::query()->where('role', 'courier')->where('status', 'approved')->whereNotNull('email_verified_at')
            ->whereIn('sorting_center_id', $centers->pluck('id'))->get(['id', 'name', 'sorting_center_id']) : collect();
        $areaLinks = DB::table('rider_service_area')->whereIn('rider_id', $riders->pluck('id'))->get()->groupBy('rider_id');
        $riders->each(fn ($rider) => $rider->setAttribute('service_area_ids', ($areaLinks->get($rider->id) ?? collect())->pluck('service_area_id')));
        $areas = DB::table('service_areas')->whereIn('sorting_center_id', $centers->pluck('id'))->where('is_active', true)->orderBy('name')->get(['id', 'name', 'sorting_center_id']);
        $cod = DB::table('cod_collections')->whereIn('delivery_id', $deliveries->pluck('id'))->get()->keyBy('delivery_id');

        return Inertia::render($user->role === 'sorting_center' ? 'logistics/parcels' : 'marketplace/deliveries', compact('deliveries', 'available', 'centers', 'riders', 'areas', 'cod', 'filters') + ['role' => $user->role]);
    }

    public function update(Request $request, Delivery $delivery)
    {
        $data = $request->validate(['action' => 'required|in:claim,approve_pickup,receive,sort,assign,picked_up,in_transit,out_for_delivery,delivered,receive_cod,reconcile_cod', 'sorting_center_id' => 'nullable|integer', 'rider_id' => 'nullable|integer', 'service_area_id' => 'required_if:action,assign|nullable|integer', 'proof' => 'nullable|image|mimes:jpg,jpeg,png|max:5120']);
        $path = null;
        try {
            DB::transaction(function () use ($request, $delivery, $data, &$path) {
                // Lock the parent first: all deliveries of a split order share its completion status.
                $orderId = $delivery->sellerOrder->order_id;
                $order = Order::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::query()->whereKey($delivery->id)->lockForUpdate()->firstOrFail();
                $sellerOrder = SellerOrder::query()->whereKey($delivery->seller_order_id)->lockForUpdate()->firstOrFail();
                $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                abort_unless($user->canOperate(), 403);
                $action = $data['action'];
                if (in_array($action, ['claim', 'approve_pickup', 'receive', 'sort', 'assign', 'receive_cod'])) {
                    abort_unless($user->role === 'sorting_center', 403);
                    $centerId = $action === 'claim' ? ($data['sorting_center_id'] ?? null) : $delivery->sorting_center_id;
                    abort_unless($centerId && $user->sortingCenters()->where('sorting_centers.id', $centerId)->operational()->exists(), 403);
                } elseif ($action === 'reconcile_cod') {
                    abort_unless($user->role === 'admin', 403);
                } else {
                    abort_unless($user->role === 'courier' && $delivery->rider_id === $user->id && $user->sorting_center_id === $delivery->sorting_center_id, 403);
                    abort_unless($user->sortingCenters()->where('sorting_centers.id', $delivery->sorting_center_id)->operational()->exists(), 403);
                }
                if ($action === 'claim') {
                    abort_unless(! $delivery->sorting_center_id && $delivery->status === 'unassigned' && $sellerOrder->status === 'shipped', 409);
                    $delivery->forceFill(['sorting_center_id' => $centerId, 'pickup_approved_at' => now()])->save();
                } elseif ($action === 'approve_pickup') {
                    abort_unless($delivery->status === 'unassigned' && ! $delivery->pickup_approved_at && $sellerOrder->status === 'shipped', 409);
                    $delivery->update(['pickup_approved_at' => now()]);
                } elseif ($action === 'receive') {
                    abort_unless(in_array($delivery->status, ['picked_up', 'in_transit'], true) && ! $delivery->received_at, 409);
                    $delivery->update(['received_at' => now()]);
                } elseif ($action === 'sort') {
                    abort_unless($delivery->received_at && ! $delivery->sorted_at && in_array($delivery->status, ['picked_up', 'in_transit'], true), 409);
                    $delivery->update(['sorted_at' => now()]);
                } elseif ($action === 'assign') {
                    $initial = $delivery->status === 'unassigned';
                    abort_unless($initial || ($delivery->sorted_at && in_array($delivery->status, ['picked_up', 'in_transit'], true)), 409);
                    if ($initial && ($sellerOrder->shipping_quote['basis'] ?? '') === 'destination_and_weight') {
                        abort_unless($delivery->pickup_approved_at && $sellerOrder->status === 'shipped', 409);
                    }
                    $area = DB::table('service_areas')->where('id', $data['service_area_id'])->where('sorting_center_id', $delivery->sorting_center_id)->where('is_active', true)->first();
                    if (! $area || strcasecmp($area->province_name ?? '', $order->shipping_province) !== 0 || strcasecmp($area->city_name ?? '', $order->shipping_city) !== 0 || strcasecmp($area->barangay_name ?? '', $order->shipping_barangay) !== 0) {
                        throw ValidationException::withMessages(['service_area_id' => 'Choose an active service area matching the delivery address.']);
                    }
                    $rider = User::query()->whereKey($data['rider_id'] ?? null)->where('role', 'courier')->where('status', 'approved')->whereNotNull('email_verified_at')->where('sorting_center_id', $delivery->sorting_center_id)->lockForUpdate()->first();
                    if (! $rider) {
                        throw ValidationException::withMessages(['rider_id' => 'Choose an approved rider assigned to this sorting center.']);
                    }
                    if (! DB::table('rider_service_area')->where('rider_id', $rider->id)->where('service_area_id', $area->id)->exists()) {
                        throw ValidationException::withMessages(['rider_id' => 'Choose a courier assigned to this service area.']);
                    }
                    $delivery->update(['rider_id' => $rider->id, 'service_area_id' => $area->id, 'status' => $initial ? 'assigned' : 'in_transit']);
                } elseif (in_array($action, ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'])) {
                    $expected = ['picked_up' => 'assigned', 'in_transit' => 'picked_up', 'out_for_delivery' => 'in_transit', 'delivered' => 'out_for_delivery'][$action];
                    abort_unless($delivery->status === $expected, 409, 'This parcel has already changed. Refresh the page.');
                    $changes = ['status' => $action];
                    if (($sellerOrder->shipping_quote['basis'] ?? '') === 'destination_and_weight' && in_array($action, ['in_transit', 'out_for_delivery', 'delivered'], true)) {
                        abort_unless($delivery->sorted_at, 409, 'The sorting center must receive and sort this parcel before dispatch.');
                    }
                    if ($action === 'picked_up') {
                        $changes['picked_up_at'] = now();
                    }
                    if ($action === 'delivered') {
                        if (! $request->hasFile('proof')) {
                            throw ValidationException::withMessages(['proof' => 'Upload a delivery photo before confirming delivery and COD collection.']);
                        }
                        $path = $request->file('proof')->store('delivery-proofs', 'local');
                        $changes += ['delivered_at' => now(), 'proof_photo_path' => $path];
                        $cents = (int) round((float) $sellerOrder->subtotal * 100) + (int) round((float) $sellerOrder->shipping_fee * 100);
                        DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $user->id, 'reference' => (string) Str::uuid(), 'amount' => number_format($cents / 100, 2, '.', ''), 'status' => 'collected', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
                        $subtotalCents = (int) round((float) $sellerOrder->subtotal * 100);
                        $rate = $sellerOrder->commission_basis_points ?? CommerceSetting::query()->findOrFail(1)->platform_commission_basis_points;
                        $commissionCents = intdiv($subtotalCents * $rate + 5000, 10000);
                        $sellerOrder->update(['status' => 'completed', 'commission_basis_points' => $rate, 'commission_amount' => number_format($commissionCents / 100, 2, '.', ''), 'seller_proceeds' => number_format(($subtotalCents - $commissionCents) / 100, 2, '.', '')]);
                        if (! SellerOrder::query()->where('order_id', $order->id)->where('status', '!=', 'completed')->exists()) {
                            $order->update(['status' => 'completed']);
                        }
                    }
                    $delivery->update($changes);
                    $recipients = User::query()->whereIn('id', [$order->buyer_id, $sellerOrder->store->user_id])->get();
                    foreach ($recipients as $recipient) {
                        $recipient->notify(new OrderDeliveryUpdated($order->id, $sellerOrder->id, $action));
                    }
                } else {
                    $collection = DB::table('cod_collections')->where('delivery_id', $delivery->id)->lockForUpdate()->first();
                    abort_unless($collection && $collection->status === ($action === 'receive_cod' ? 'collected' : 'handed_over'), 409);
                    $changes = $action === 'receive_cod' ? ['status' => 'handed_over', 'received_by' => $user->id, 'handed_over_at' => now()] : ['status' => 'reconciled', 'reconciled_by' => $user->id, 'reconciled_at' => now()];
                    DB::table('cod_collections')->where('id', $collection->id)->update($changes + ['updated_at' => now()]);
                }
                DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'sorting_center_id' => $delivery->sorting_center_id, 'actor_id' => $user->id, 'type' => $action, 'reference' => (string) Str::uuid(), 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return back()->with('status', 'Parcel updated.');
    }

    public function proof(Request $request, Delivery $delivery)
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' || ($user->role === 'courier' && $delivery->rider_id === $user->id) || ($user->role === 'sorting_center' && $user->sortingCenters()->where('sorting_centers.id', $delivery->sorting_center_id)->operational()->exists()) || ($user->role === 'buyer' && $delivery->sellerOrder->order->buyer_id === $user->id) || ($user->role === 'seller' && $delivery->sellerOrder->store_id === $user->store?->id), 403);
        abort_unless($delivery->proof_photo_path, 404);

        return Storage::disk('local')->download($delivery->proof_photo_path, 'delivery-'.$delivery->id.'.'.pathinfo($delivery->proof_photo_path, PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store']);
    }
}
