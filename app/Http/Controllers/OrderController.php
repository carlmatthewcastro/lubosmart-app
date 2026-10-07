<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SellerOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            $products = Product::query()->whereIn('id', $items->pluck('product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($items as $item) {
                $products->get($item->product_id)?->increment('stock', $item->quantity);
            }
            SellerOrder::query()->whereIn('id', $parcels->pluck('id'))->update(['status' => 'cancelled']);
            $order->update(['status' => 'cancelled']);
        }, 3);

        return back()->with('status', 'Order cancelled. Stock has been restored.');
    }

    public function waybill(Request $request, SellerOrder $sellerOrder)
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' || ($user->role === 'seller' && $sellerOrder->store_id === $user->store?->id), 403);

        return Inertia::render('marketplace/waybill', ['order' => $sellerOrder->load(['order', 'items', 'store:id,name'])]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['buyer', 'seller', 'admin']), 403);
        $orders = SellerOrder::query()->with(['items', 'delivery', 'store:id,name', 'order'])
            ->when($user->role === 'buyer', fn ($q) => $q->whereHas('order', fn ($q) => $q->where('buyer_id', $user->id)))
            ->when($user->role === 'seller', fn ($q) => $q->where('store_id', $user->store?->id))
            ->latest('id')->paginate(10);
        $ids = $orders->pluck('id');
        $messages = DB::table('order_messages')->join('users', 'users.id', '=', 'order_messages.user_id')->whereIn('seller_order_id', $ids)->orderBy('order_messages.id')->get(['order_messages.id', 'seller_order_id', 'body', 'users.name', 'order_messages.created_at'])->groupBy('seller_order_id');

        return Inertia::render('marketplace/orders', ['orders' => $orders, 'messages' => $messages, 'role' => $user->role]);
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

        return back()->with('status', $data['status'] === 'shipped' ? 'Parcel ready for sorting center pickup.' : 'Order preparation started.');
    }

    public function message(Request $request, SellerOrder $sellerOrder)
    {
        $user = $request->user();
        abort_unless(($user->role === 'buyer' && $sellerOrder->order->buyer_id === $user->id) || ($user->role === 'seller' && $sellerOrder->store_id === $user->store?->id), 403);
        $data = $request->validate(['body' => 'required|string|max:2000']);
        DB::table('order_messages')->insert([...$data, 'seller_order_id' => $sellerOrder->id, 'user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);

        return back()->with('status', 'Message sent.');
    }
}
