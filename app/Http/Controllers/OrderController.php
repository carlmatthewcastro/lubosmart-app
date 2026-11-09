<?php

namespace App\Http\Controllers;

use App\Http\Resources\Api\OrderResource;
use App\Http\Resources\Api\ParcelResource;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductReview;
use App\Models\SellerOrder;
use App\Services\RestorePurchasedStock;
use App\Services\Seller\SellerWorkspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function cancel(Request $request, Order $order)
    {
        abort_unless($request->user()->role === 'buyer' && $order->buyer_id === $request->user()->id, 403);
        DB::transaction(function () use ($order) {
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $parcels = $order->sellerOrders()->orderBy('id')->lockForUpdate()->get();
            abort_unless($order->status === 'pending' && $parcels->every(fn ($parcel) => $parcel->status === 'pending'), 409, 'Preparation has already started. Contact your seller through the order conversation.');
            $items = OrderItem::query()->whereIn('seller_order_id', $parcels->pluck('id'))->get();
            app(RestorePurchasedStock::class)->handle($items);
            SellerOrder::query()->whereIn('id', $parcels->pluck('id'))->update(['status' => 'cancelled']);
            $order->update(['status' => 'cancelled']);
        }, 3);

        if ($request->routeIs('api.v1.*')) {
            return new OrderResource($order->refresh()->load('sellerOrders.items', 'sellerOrders.delivery', 'sellerOrders.store', 'sellerOrders.order'));
        }

        return back()->with('status', 'Order cancelled. Stock has been restored.');
    }

    public function waybill(Request $request, SellerOrder $sellerOrder)
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' || ($user->role === 'seller' && $sellerOrder->store_id === $user->store?->id), 403);

        $sellerOrder->load(['order', 'items', 'store:id,name', 'delivery']);
        $sellerOrder->delivery?->ensureTrackingReference();

        return Inertia::render('marketplace/waybill', ['order' => $sellerOrder]);
    }

    public function printWaybill(Request $request, SellerOrder $sellerOrder)
    {
        $user = $request->user();
        abort_unless($user->canOperate() && ($user->role === 'admin' || ($user->role === 'seller' && $sellerOrder->store_id === $user->store?->id)), 403);
        $data = $request->validate(['packages' => 'required|integer|in:1', 'request_key' => 'required|uuid']);
        DB::transaction(function () use ($sellerOrder, $user, $data) {
            $delivery = Delivery::query()->where('seller_order_id', $sellerOrder->id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('parcel_events')->where('reference', $data['request_key'])->first();
            if ($existing) {
                abort_unless($existing->delivery_id === $delivery->id && $existing->actor_id === $user->id && in_array($existing->type, ['label_print_requested', 'label_reprint_requested'], true), 409);

                return;
            }
            $reference = $delivery->ensureTrackingReference();
            $reprint = DB::table('parcel_events')->where('delivery_id', $delivery->id)->whereIn('type', ['label_print_requested', 'label_reprint_requested'])->exists();
            DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $delivery->logistics_center_id, 'actor_id' => $user->id, 'type' => $reprint ? 'label_reprint_requested' : 'label_print_requested', 'reference' => $data['request_key'], 'notes' => json_encode(['tracking_reference' => $reference, 'packages' => 1], JSON_THROW_ON_ERROR), 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        });

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => 'Print request recorded. One label per physical parcel.']);
        }

        return back()->with('status', 'Label print request recorded. Attach this label to one physical parcel only.');
    }

    public function index(Request $request, SellerWorkspace $workspace)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['buyer', 'seller', 'admin']), 403);
        $filters = in_array($user->role, ['buyer', 'seller'], true) ? $request->validate([
            'stage' => ['nullable', Rule::in(SellerWorkspace::QUEUES)],
            'search' => 'nullable|string|max:100',
        ]) : [];
        $query = SellerOrder::query()->with(['items', 'delivery', 'store:id,name', 'order'])
            ->when($user->role === 'buyer', fn ($q) => $q->whereHas('order', fn ($q) => $q->where('buyer_id', $user->id)))
            ->when($user->role === 'seller', fn ($q) => $q->where('store_id', $user->store?->id));
        if (in_array($user->role, ['buyer', 'seller'], true)) {
            $workspace->filter($query, $filters['stage'] ?? 'all');
            $search = trim($filters['search'] ?? '');
            if ($search !== '') {
                $query->where(function ($q) use ($search, $user) {
                    if (ctype_digit($search)) {
                        $q->where('id', $search)->orWhere('order_id', $search);
                    } else {
                        $q->whereHas('delivery', fn ($d) => $d->where('tracking_reference', 'like', '%'.$search.'%'))
                            ->orWhereHas('order', fn ($o) => $o->where('shipping_recipient_name', 'like', '%'.$search.'%'));
                        if ($user->role === 'buyer') {
                            $q->orWhereHas('items', fn ($items) => $items->where('product_name', 'like', '%'.$search.'%'))
                                ->orWhereHas('store', fn ($store) => $store->where('name', 'like', '%'.$search.'%'));
                        }
                    }
                });
            }
        }
        $orders = $query->latest('id')->paginate(10)->withQueryString();
        $ids = $orders->pluck('id');
        $messages = DB::table('order_messages')->join('users', 'users.id', '=', 'order_messages.user_id')->whereIn('seller_order_id', $ids)->orderBy('order_messages.id')->get(['order_messages.id', 'seller_order_id', 'body', 'users.name', 'order_messages.created_at'])->groupBy('seller_order_id');
        $reviews = $user->role === 'buyer' ? ProductReview::query()->where('user_id', $user->id)->whereIn('order_item_id', $orders->getCollection()->flatMap(fn ($parcel) => $parcel->items->pluck('id')))->get()->keyBy('order_item_id') : [];

        return Inertia::render('marketplace/orders', ['orders' => $orders, 'messages' => $messages, 'role' => $user->role, 'filters' => $filters, 'reviews' => $reviews]);
    }

    public function prepare(Request $request, SellerOrder $sellerOrder)
    {
        abort_unless($request->user()->role === 'seller' && $sellerOrder->store_id === $request->user()->store?->id, 403);
        $data = $request->validate(['status' => 'required|in:processing,shipped']);
        DB::transaction(function () use ($sellerOrder, $data) {
            $order = $sellerOrder->order()->lockForUpdate()->firstOrFail();
            $sellerOrder = SellerOrder::query()->whereKey($sellerOrder->id)->lockForUpdate()->firstOrFail();
            $expected = $data['status'] === 'processing' ? 'pending' : 'processing';
            abort_unless($sellerOrder->status === $expected, 409, 'This order has already changed. Refresh the page.');
            $sellerOrder->update($data);
            $order->update(['status' => 'processing']);
        }, 3);

        if ($request->routeIs('api.v1.*')) {
            return new ParcelResource($sellerOrder->refresh()->load('order', 'items', 'store', 'delivery'));
        }

        return back()->with('status', $data['status'] === 'shipped' ? 'Parcel ready for logistics company pickup.' : 'Order preparation started.');
    }

    public function message(Request $request, SellerOrder $sellerOrder)
    {
        $user = $request->user();
        abort_unless(($user->role === 'buyer' && $sellerOrder->order->buyer_id === $user->id) || ($user->role === 'seller' && $sellerOrder->store_id === $user->store?->id), 403);
        $data = $request->validate(['body' => 'required|string|max:2000']);
        DB::table('order_messages')->insert([...$data, 'seller_order_id' => $sellerOrder->id, 'user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => 'Message sent.']);
        }

        return back()->with('status', 'Message sent.');
    }
}
