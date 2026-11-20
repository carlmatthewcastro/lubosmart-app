<?php

namespace App\Http\Controllers;

use App\Actions\Checkout\CreateOrderFromCart;
use App\Http\Resources\Api\AddressResource;
use App\Http\Resources\Api\OrderResource;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\User;
use App\Services\Logistics\ShippingQuotes;
use App\Services\ParcelFinance;
use App\Services\PublicShopVouchers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MarketplaceController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'store' => 'nullable|integer|exists:stores,id',
            'search' => 'nullable|string|max:100',
            'category' => 'nullable|integer',
            'min_price' => 'nullable|numeric|min:0|max:99999999.99',
            'max_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99', ...($request->filled('min_price') ? ['gte:min_price'] : [])],
            'availability' => 'nullable|in:in_stock,out_of_stock',
            'rating' => 'nullable|integer|between:1,5',
            'sort' => 'nullable|in:latest,price_asc,price_desc,rating',
        ]);
        $products = Product::query()->with(['store:id,name', 'category:id,name', 'variants'])
            ->withAvg('reviews', 'rating')->withCount('reviews')
            ->availableToShoppers()->when($filters['store'] ?? null, fn ($q, $id) => $q->where('store_id', $id))
            ->when($request->routeIs('wishlist.index'), fn ($q) => $q->whereIn('id', DB::table('product_wishlists')->where('user_id', $request->user()->id)->select('product_id')))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', '%'.$search.'%'))
            ->when($filters['category'] ?? null, fn ($q, $id) => $q->where(fn ($q) => $q->where('category_id', $id)->orWhereHas('category', fn ($q) => $q->where('parent_id', $id))))
            ->when(isset($filters['min_price']), fn ($q) => $q->where('price', '>=', $filters['min_price']))
            ->when(isset($filters['max_price']), fn ($q) => $q->where('price', '<=', $filters['max_price']))
            ->when($filters['availability'] ?? null, function ($q, $availability) {
                $inStock = fn ($stock) => $stock->where('stock', '>', 0)
                    ->where(fn ($options) => $options->whereDoesntHave('variants')->orWhereHas('variants', fn ($variant) => $variant->where('is_active', true)->where('stock', '>', 0)));
                $q->whereIn('id', Product::query()->select('id')->where($inStock), 'and', $availability === 'out_of_stock');
            })
            ->when($filters['rating'] ?? null, fn ($q, $rating) => $q->where(
                ProductReview::query()->selectRaw('AVG(rating)')->whereColumn('product_id', 'products.id')->where('is_visible', true), '>=', (int) $rating
            ));

        match ($filters['sort'] ?? 'latest') {
            'price_asc' => $products->orderBy('price'),
            'price_desc' => $products->orderByDesc('price'),
            'rating' => $products->orderByDesc('reviews_avg_rating')->orderByDesc('reviews_count'),
            default => $products,
        };
        $products = $products->latest('id')->paginate(24)->withQueryString();

        $categories = Category::query()->with('parent:id,name')->where('is_active', true)->where(fn ($q) => $q->whereNull('parent_id')->orWhereHas('parent', fn ($parent) => $parent->where('is_active', true)))->orderBy('name')->get(['id', 'name', 'parent_id'])->map(fn ($category) => ['id' => $category->id, 'parent_id' => $category->parent_id, 'name' => $category->parent ? $category->parent->name.' / '.$category->name : $category->name]);

        return Inertia::render('marketplace/catalog', ['shopName' => isset($filters['store']) ? Store::query()->whereKey($filters['store'])->value('name') : null, 'publicVouchers' => isset($filters['store']) ? app(PublicShopVouchers::class)->forStores([(int) $filters['store']]) : [], 'products' => $products, 'categories' => $categories, 'filters' => $filters, 'wishlist' => $request->routeIs('wishlist.index'), 'favoriteIds' => $request->user()?->role === 'buyer' ? DB::table('product_wishlists')->where('user_id', $request->user()->id)->pluck('product_id') : []]);
    }

    public function cart(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $cart = Cart::query()->with(['items.product.store:id,name', 'items.variant'])->where('user_id', $request->user()->id)->first();
        $availableIds = Product::query()->availableToShoppers()->whereIn('id', $cart?->items->pluck('product_id') ?? [])->pluck('id');
        $cart?->items->each(function ($item) use ($availableIds) {
            $item->product?->setAttribute('is_available', $availableIds->contains($item->product_id));
        });

        $storeTotals = [];
        foreach ($cart?->items ?? [] as $item) {
            if ($item->product) {
                $storeTotals[$item->product->store_id] = ($storeTotals[$item->product->store_id] ?? 0) + ParcelFinance::cents($item->product->price) * $item->quantity;
            }
        }
        $publicVouchers = app(PublicShopVouchers::class)->forStores(array_keys($storeTotals), $request->user()->id, $storeTotals);

        return Inertia::render('marketplace/cart', ['publicVouchers' => $publicVouchers, 'items' => $cart?->items ?? [], 'addresses' => Address::query()->where('user_id', $request->user()->id)->orderByDesc('is_default')->latest('id')->get(), 'shippingFee' => CommerceSetting::query()->findOrFail(1)->shipping_fee_per_seller_order, 'walletBalanceCents' => (int) DB::table('buyer_wallets')->where('buyer_id', $request->user()->id)->value('balance_cents'), 'logisticsPricing' => app(ShippingQuotes::class)->enabled()]);
    }

    public function shippingQuote(Request $request, ShippingQuotes $quotes)
    {
        $data = $request->validate(['address_id' => 'required|integer']);
        $address = Address::query()->where('user_id', $request->user()->id)->whereKey($data['address_id'])->firstOrFail();
        $cart = Cart::query()->with('items.product.store:id,user_id,name')->where('user_id', $request->user()->id)->first();
        $items = $cart?->items ?? collect();
        $products = $items->pluck('product')->filter()->keyBy('id');

        $availability = $items->isNotEmpty() && $products->count() === $items->pluck('product_id')->unique()->count()
            ? $quotes->availability($address, $items, $products)
            : ['options' => [], 'unavailable' => [], 'message' => 'Your bag contains no shippable items. Review or remove unavailable items before checkout.'];

        return response()->json($availability)->header('Cache-Control', 'private, no-store');
    }

    public function updateCart(Request $request, Product $product)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['quantity' => 'required|integer|min:0|max:999', 'add' => $request->routeIs('api.v1.*') ? 'prohibited' : 'sometimes|boolean', 'product_variant_id' => 'nullable|integer']);
        DB::transaction(function () use ($request, $product, $data) {
            $buyer = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($buyer->role === 'buyer' && $buyer->canOperate(), 403);
            $cart = Cart::query()->firstOrCreate(['user_id' => $request->user()->id]);
            $variantId = $data['product_variant_id'] ?? null;
            $line = ['cart_id' => $cart->id, 'product_id' => $product->id, 'variant_key' => $variantId ? (string) $variantId : 'base'];
            if ($data['add'] ?? false) {
                $data['quantity'] += CartItem::query()->where($line)->value('quantity') ?? 0;
            }
            if ($data['quantity'] === 0) {
                CartItem::query()->where($line)->delete();

                return;
            }
            $product->refresh()->load('store');
            if (! Product::query()->availableToShoppers()->whereKey($product->id)->exists()) {
                throw ValidationException::withMessages(['quantity' => 'This product is no longer available. Remove it or choose another product.']);
            }
            $variant = $variantId ? ProductVariant::query()->where('product_id', $product->id)->whereKey($variantId)->where('is_active', true)->first() : null;
            if (($variantId && ! $variant) || (! $variantId && $product->variants()->exists()) || ($variant && $variant->stock < $data['quantity'])) {
                throw ValidationException::withMessages(['quantity' => 'Choose an available size/color option with enough stock.']);
            }
            if ($product->status !== 'active' || $product->blocked_at || $product->store->status !== 'approved' || $product->store->user->role !== 'seller' || ! $product->store->user->canOperate() || $product->stock < $data['quantity'] || $data['quantity'] > 999) {
                throw ValidationException::withMessages(['quantity' => 'This quantity is unavailable. Please check the remaining stock.']);
            }
            CartItem::query()->updateOrCreate($line, ['quantity' => $data['quantity'], 'product_variant_id' => $variantId]);
        }, 3);

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => $data['quantity'] ? 'Cart updated.' : 'Item removed.']);
        }

        return back()->with('status', $data['quantity'] ? 'Cart updated.' : 'Item removed.');
    }

    public function address(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['label' => 'required|string|max:40', 'recipient_name' => 'required|string|max:160', 'phone' => 'required|string|max:30', 'line1' => 'required|string|max:200', 'line2' => 'nullable|string|max:200', 'barangay' => 'required|string|max:100', 'city' => 'required|string|max:100', 'province' => 'required|string|max:100', 'region' => 'required|string|max:100', 'zip' => 'required|string|max:10']);
        $address = Address::query()->create([...$data, 'user_id' => $request->user()->id]);

        if ($request->routeIs('api.v1.*')) {
            return (new AddressResource($address->refresh()))->response()->setStatusCode(201);
        }

        return back()->with('status', 'Delivery address saved.');
    }

    public function checkout(Request $request, CreateOrderFromCart $checkout)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['coins_to_redeem_cents' => 'nullable|integer|min:0|max:9999999999', 'address_id' => 'required|integer', 'checkout_key' => 'required|uuid', 'expected_items_subtotal' => 'nullable|numeric|decimal:0,2|min:0', 'logistics_center_id' => 'nullable|integer', 'voucher_code' => 'nullable|string|max:30', 'expected_discount_total' => 'required_with:voucher_code|nullable|numeric|decimal:0,2|min:0', 'expected_shipping_total' => [app(ShippingQuotes::class)->enabled() ? 'required' : 'nullable', 'numeric', 'decimal:0,2', 'min:0']]);
        if ($request->routeIs('api.v1.*')) {
            $request->validate([
                'expected_items_subtotal' => 'required|numeric|decimal:0,2|min:0',
                'expected_shipping_total' => 'required|numeric|decimal:0,2|min:0',
            ]);
        }
        $order = DB::transaction(function () use ($request, $data, $checkout) {
            User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $existing = Order::query()->where('buyer_id', $request->user()->id)->where('checkout_key', $data['checkout_key'])->first();
            if ($existing) {
                return $existing;
            }
            $order = $checkout->handle($request->user(), $data['address_id'], $data['logistics_center_id'] ?? null, isset($data['expected_shipping_total']) ? (int) round((float) $data['expected_shipping_total'] * 100) : null, $data['voucher_code'] ?? null, isset($data['expected_discount_total']) ? (int) round((float) $data['expected_discount_total'] * 100) : null, isset($data['expected_items_subtotal']) ? ParcelFinance::cents((string) $data['expected_items_subtotal']) : null, (int) ($data['coins_to_redeem_cents'] ?? 0));
            $order->forceFill(['checkout_key' => $data['checkout_key']])->save();

            return $order;
        }, 3);

        if ($request->routeIs('api.v1.*')) {
            return (new OrderResource($order->load('sellerOrders.items', 'sellerOrders.delivery', 'sellerOrders.store', 'sellerOrders.order')))->response()->setStatusCode(201);
        }

        return to_route('orders.index')->with('status', 'Order #'.$order->id.' placed. Pay cash upon delivery.');
    }
}
