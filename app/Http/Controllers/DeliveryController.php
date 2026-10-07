<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\User;
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
        abort_unless(in_array($user->role, ['rider', 'logistics', 'admin']), 403);
        $centers = $user->sortingCenters()->where('is_active', true)->get(['sorting_centers.id', 'name']);
        $query = Delivery::query()->with(['sellerOrder.items', 'sellerOrder.order', 'sellerOrder.store:id,name', 'rider:id,name']);
        if ($user->role === 'rider') {
            $query->where('rider_id', $user->id);
        } elseif ($user->role === 'logistics') {
            $query->whereIn('sorting_center_id', $centers->pluck('id'));
        }
        $deliveries = $query->latest('id')->paginate(10);
        $available = $user->role === 'logistics' && $centers->isNotEmpty()
            ? Delivery::query()->whereNull('sorting_center_id')->where('status', 'unassigned')->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped'))->with('sellerOrder.store:id,name')->latest('id')->limit(50)->get()
            : [];
        $riders = $user->role === 'logistics' ? User::query()->where('role', 'rider')->where('status', 'active')->whereNotNull('email_verified_at')
            ->whereHas('sortingCenters', fn ($q) => $q->whereIn('sorting_centers.id', $centers->pluck('id'))->where('is_active', true))->get(['id', 'name']) : [];
        $cod = DB::table('cod_collections')->whereIn('delivery_id', $deliveries->pluck('id'))->get()->keyBy('delivery_id');

        return Inertia::render('marketplace/deliveries', compact('deliveries', 'available', 'centers', 'riders', 'cod') + ['role' => $user->role]);
    }

    public function update(Request $request, Delivery $delivery)
    {
        $data = $request->validate(['action' => 'required|in:claim,assign,picked_up,in_transit,delivered,receive_cod,reconcile_cod', 'sorting_center_id' => 'nullable|integer', 'rider_id' => 'nullable|integer', 'proof' => 'nullable|image|mimes:jpg,jpeg,png|max:5120']);
        $path = null;
        try {
            DB::transaction(function () use ($request, $delivery, $data, &$path) {
                // Lock the parent first: all deliveries of a split order share its completion status.
                $orderId = $delivery->sellerOrder->order_id;
                $order = Order::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::query()->whereKey($delivery->id)->lockForUpdate()->firstOrFail();
                $sellerOrder = SellerOrder::query()->whereKey($delivery->seller_order_id)->lockForUpdate()->firstOrFail();
                $user = $request->user();
                $action = $data['action'];
                if (in_array($action, ['claim', 'assign', 'receive_cod'])) {
                    abort_unless($user->role === 'logistics', 403);
                    $centerId = $action === 'claim' ? ($data['sorting_center_id'] ?? null) : $delivery->sorting_center_id;
                    abort_unless($centerId && $user->sortingCenters()->where('sorting_centers.id', $centerId)->where('is_active', true)->exists(), 403);
                } elseif ($action === 'reconcile_cod') {
                    abort_unless($user->role === 'admin', 403);
                } else {
                    abort_unless($user->role === 'rider' && $delivery->rider_id === $user->id, 403);
                    abort_unless($user->sortingCenters()->where('sorting_centers.id', $delivery->sorting_center_id)->where('is_active', true)->exists(), 403);
                }
                if ($action === 'claim') {
                    abort_unless(! $delivery->sorting_center_id && $delivery->status === 'unassigned' && $sellerOrder->status === 'shipped', 409);
                    $delivery->forceFill(['sorting_center_id' => $centerId])->save();
                } elseif ($action === 'assign') {
                    abort_unless($delivery->status === 'unassigned', 409);
                    $rider = User::query()->whereKey($data['rider_id'] ?? null)->where('role', 'rider')->where('status', 'active')->whereNotNull('email_verified_at')->whereHas('sortingCenters', fn ($q) => $q->where('sorting_centers.id', $delivery->sorting_center_id)->where('is_active', true))->first();
                    if (! $rider) {
                        throw ValidationException::withMessages(['rider_id' => 'Choose an approved rider assigned to this sorting center.']);
                    }
                    $delivery->update(['rider_id' => $rider->id, 'status' => 'assigned']);
                } elseif (in_array($action, ['picked_up', 'in_transit', 'delivered'])) {
                    $expected = ['picked_up' => 'assigned', 'in_transit' => 'picked_up', 'delivered' => 'in_transit'][$action];
                    abort_unless($delivery->status === $expected, 409, 'This parcel has already changed. Refresh the page.');
                    $changes = ['status' => $action];
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
                        $sellerOrder->update(['status' => 'completed']);
                        if (! SellerOrder::query()->where('order_id', $order->id)->where('status', '!=', 'completed')->exists()) {
                            $order->update(['status' => 'completed']);
                        }
                    }
                    $delivery->update($changes);
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
        abort_unless($user->role === 'admin' || ($user->role === 'rider' && $delivery->rider_id === $user->id) || ($user->role === 'logistics' && $user->sortingCenters()->where('sorting_centers.id', $delivery->sorting_center_id)->where('is_active', true)->exists()) || ($user->role === 'buyer' && $delivery->sellerOrder->order->buyer_id === $user->id) || ($user->role === 'seller' && $delivery->sellerOrder->store_id === $user->store?->id), 403);
        abort_unless($delivery->proof_photo_path, 404);

        return Storage::disk('local')->download($delivery->proof_photo_path, 'delivery-'.$delivery->id.'.'.pathinfo($delivery->proof_photo_path, PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store']);
    }
}
