<?php

namespace App\Http\Controllers;

use App\Actions\Checkout\CreateOrderFromCart;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MarketplaceController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate(['search' => 'nullable|string|max:100', 'category' => 'nullable|integer']);
        $products = Product::query()->with(['store:id,name', 'category:id,name'])
            ->where('status', 'active')->whereHas('store', fn ($q) => $q->where('status', 'approved')->whereHas('user', fn ($user) => $user->where('role', 'seller')->where('status', 'approved')->whereNotNull('email_verified_at')))
            ->whereHas('category', fn ($q) => $q->where('is_active', true)->where(fn ($q) => $q->whereNull('parent_id')->orWhereHas('parent', fn ($q) => $q->where('is_active', true))))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', '%'.$search.'%'))
            ->when($filters['category'] ?? null, fn ($q, $id) => $q->where(fn ($q) => $q->where('category_id', $id)->orWhereHas('category', fn ($q) => $q->where('parent_id', $id))))
            ->latest('id')->paginate(12)->withQueryString();

        $categories = Category::query()->with('parent:id,name')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'parent_id'])->map(fn ($category) => ['id' => $category->id, 'name' => $category->parent ? $category->parent->name.' / '.$category->name : $category->name]);

        return Inertia::render('marketplace/catalog', ['products' => $products, 'categories' => $categories, 'filters' => $filters]);
    }

    public function cart(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $cart = Cart::query()->with('items.product.store:id,name')->where('user_id', $request->user()->id)->first();

        return Inertia::render('marketplace/cart', ['items' => $cart?->items ?? [], 'addresses' => Address::query()->where('user_id', $request->user()->id)->orderByDesc('is_default')->latest('id')->get(), 'shippingFee' => CommerceSetting::query()->findOrFail(1)->shipping_fee_per_seller_order]);
    }

    public function updateCart(Request $request, Product $product)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['quantity' => 'required|integer|min:0|max:999', 'add' => 'sometimes|boolean']);
        DB::transaction(function () use ($request, $product, $data) {
            $buyer = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($buyer->role === 'buyer' && $buyer->canOperate(), 403);
            $cart = Cart::query()->firstOrCreate(['user_id' => $request->user()->id]);
            if ($data['add'] ?? false) {
                $data['quantity'] += CartItem::query()->where('cart_id', $cart->id)->where('product_id', $product->id)->value('quantity') ?? 0;
            }
            if ($data['quantity'] === 0) {
                CartItem::query()->where('cart_id', $cart->id)->where('product_id', $product->id)->delete();

                return;
            }
            $product->refresh()->load('store');
            if ($product->status !== 'active' || $product->blocked_at || $product->store->status !== 'approved' || $product->store->user->role !== 'seller' || ! $product->store->user->canOperate() || $product->stock < $data['quantity'] || $data['quantity'] > 999) {
                throw ValidationException::withMessages(['quantity' => 'This quantity is unavailable. Please check the remaining stock.']);
            }
            CartItem::query()->updateOrCreate(['cart_id' => $cart->id, 'product_id' => $product->id], ['quantity' => $data['quantity']]);
        }, 3);

        return back()->with('status', $data['quantity'] ? 'Cart updated.' : 'Item removed.');
    }

    public function address(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['label' => 'required|string|max:40', 'recipient_name' => 'required|string|max:160', 'phone' => 'required|string|max:30', 'line1' => 'required|string|max:200', 'line2' => 'nullable|string|max:200', 'barangay' => 'required|string|max:100', 'city' => 'required|string|max:100', 'province' => 'required|string|max:100', 'region' => 'required|string|max:100', 'zip' => 'required|string|max:10']);
        Address::query()->create([...$data, 'user_id' => $request->user()->id]);

        return back()->with('status', 'Delivery address saved.');
    }

    public function checkout(Request $request, CreateOrderFromCart $checkout)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['address_id' => 'required|integer', 'checkout_key' => 'required|uuid']);
        $order = DB::transaction(function () use ($request, $data, $checkout) {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $existing = Order::query()->where('buyer_id', $request->user()->id)->where('checkout_key', $data['checkout_key'])->first();
            if ($existing) {
                return $existing;
            }
            $order = $checkout->handle($request->user(), $data['address_id']);
            $order->forceFill(['checkout_key' => $data['checkout_key']])->save();

            return $order;
        }, 3);

        return to_route('orders.index')->with('status', 'Order #'.$order->id.' placed. Pay cash upon delivery.');
    }
}
