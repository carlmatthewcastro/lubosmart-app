<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\AddressResource;
use App\Http\Resources\Api\DeliveryResource;
use App\Http\Resources\Api\OrderResource;
use App\Http\Resources\Api\ParcelResource;
use App\Http\Resources\Api\ProductResource;
use App\Http\Resources\Api\UserResource;
use App\Models\Cart;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\User;
use App\Services\Logistics\ParcelQueues;
use App\Services\Logistics\ShippingQuotes;
use App\Services\Rider\RiderWorkspace;
use App\Services\Seller\SellerWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MarketplaceReadController extends Controller
{
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function products(Request $request)
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:100', 'category' => 'nullable|integer|min:1',
            'page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:50',
        ]);
        $products = $this->catalog()->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', '%'.$search.'%'))
            ->when($filters['category'] ?? null, fn ($q, $id) => $q->where(fn ($q) => $q->where('category_id', $id)->orWhereHas('category', fn ($q) => $q->where('parent_id', $id))))
            ->orderByDesc('id')->paginate($filters['per_page'] ?? 20)->withQueryString();

        return ProductResource::collection($products);
    }

    public function product(int $product): ProductResource
    {
        return new ProductResource($this->catalog()->whereKey($product)->firstOrFail());
    }

    private function catalog(): Builder
    {
        return Product::query()->availableToShoppers()->with(['store:id,name', 'category:id,name', 'variants'])
            ->withCount('reviews')->withAvg('reviews', 'rating');
    }

    public function categories()
    {
        return response()->json(['data' => Category::query()->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('parent_id')->orWhereHas('parent', fn ($parent) => $parent->where('is_active', true)))
            ->orderBy('name')->orderBy('id')->get(['id', 'name', 'parent_id'])]);
    }

    public function cart(Request $request, ShippingQuotes $quotes)
    {
        $cart = Cart::query()->where('user_id', $request->user()->id)->with(['items.product', 'items.variant'])->first();
        $available = Product::query()->availableToShoppers()->whereIn('id', $cart?->items->pluck('product_id') ?? [])->pluck('id');

        return response()->json(['data' => [
            'items' => $cart?->items->map(fn ($item) => [
                'product_id' => $item->product_id, 'product_variant_id' => $item->product_variant_id,
                'store_id' => $item->product?->store_id,
                'quantity' => $item->quantity, 'name' => $item->product?->name,
                'price' => $item->product?->price, 'stock' => $item->variant?->stock ?? $item->product?->stock,
                'variant_name' => $item->variant?->name,
                'is_available' => $available->contains($item->product_id)
                    && (! $item->product_variant_id || ($item->variant?->is_active && ! $item->variant?->is_legacy)),
            ]) ?? [],
            'currency' => 'PHP', 'logistics_pricing' => $quotes->enabled(),
            'shipping_fee_per_seller_order' => CommerceSetting::query()->findOrFail(1)->shipping_fee_per_seller_order,
        ]]);
    }

    public function addresses(Request $request)
    {
        return AddressResource::collection($request->user()->addresses()->orderByDesc('is_default')->orderByDesc('id')->get());
    }

    public function orders(Request $request)
    {
        $this->pagination($request);

        return OrderResource::collection(Order::query()->where('buyer_id', $request->user()->id)
            ->with('sellerOrders.items', 'sellerOrders.delivery', 'sellerOrders.store', 'sellerOrders.order')
            ->orderByDesc('id')->paginate($request->integer('per_page', 20))->withQueryString());
    }

    public function order(Request $request, int $order): OrderResource
    {
        return new OrderResource(Order::query()->where('buyer_id', $request->user()->id)->whereKey($order)
            ->with('sellerOrders.items', 'sellerOrders.delivery', 'sellerOrders.store', 'sellerOrders.order')->firstOrFail());
    }

    public function parcels(Request $request, SellerWorkspace $workspace)
    {
        $this->pagination($request);
        $filters = $request->validate(['stage' => ['nullable', Rule::in(SellerWorkspace::QUEUES)]]);
        $query = SellerOrder::query()->where('store_id', $request->user()->store?->id ?? 0)->with('order', 'items', 'delivery', 'store');
        $workspace->filter($query, $filters['stage'] ?? 'all');

        return ParcelResource::collection($query->orderByDesc('id')->paginate($request->integer('per_page', 20))->withQueryString());
    }

    public function deliveries(Request $request, RiderWorkspace $riders, ParcelQueues $queues)
    {
        $this->pagination($request);
        $filters = $request->validate([
            'stage' => ['nullable', Rule::in($request->user()->role === 'rider' ? RiderWorkspace::QUEUES : ParcelQueues::STAGES)],
            'search' => 'nullable|string|max:100',
        ]);
        $query = $this->deliveryQuery($request);
        if ($request->user()->role === 'rider') {
            $riders->filter($query, $filters['stage'] ?? 'all');
        } elseif ($request->user()->role === 'logistics') {
            $queues->filter($query, $filters['stage'] ?? 'all');
        }
        $query->when($filters['search'] ?? null, fn ($q, $search) => $q->where('tracking_reference', strtoupper(trim($search))));

        return DeliveryResource::collection($query->orderByDesc('id')->paginate($request->integer('per_page', 20))->withQueryString());
    }

    public function delivery(Request $request, int $delivery): DeliveryResource
    {
        return new DeliveryResource($this->deliveryQuery($request)->whereKey($delivery)->firstOrFail());
    }

    private function deliveryQuery(Request $request): Builder
    {
        $user = $request->user();

        return Delivery::query()->with('sellerOrder.order', 'sellerOrder.items', 'sellerOrder.store', 'sellerOrder.delivery')
            ->with(['sellerOrder.store.user.addresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')])
            ->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id)->where('logistics_center_id', $user->logistics_center_id))
            ->when($user->role === 'logistics', fn ($q) => $q->whereIn('logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id')));
    }

    public function logisticsConfiguration(Request $request)
    {
        $centers = $request->user()->logisticsCenters()->operational()->orderBy('logistics_centers.id')->get(['logistics_centers.id', 'name']);
        $riders = User::query()->managedRiders($request->user())->where('role', 'rider')->where('status', 'approved')->whereNotNull('email_verified_at')
            ->whereIn('logistics_center_id', $centers->pluck('id'))->orderBy('id')->get(['id', 'name', 'logistics_center_id']);
        $areas = DB::table('service_areas')->whereIn('logistics_center_id', $centers->pluck('id'))->where('is_active', true)
            ->orderBy('id')->get(['id', 'logistics_center_id', 'name', 'province_name', 'city_name', 'barangay_name']);
        $links = DB::table('rider_service_area')->whereIn('rider_id', $riders->pluck('id'))->whereIn('service_area_id', $areas->pluck('id'))->get()->groupBy('rider_id');

        return response()->json(['data' => [
            'centers' => $centers->map(fn ($center) => ['id' => $center->id, 'name' => $center->name]),
            'areas' => $areas,
            'riders' => $riders->map(fn ($rider) => [
                'id' => $rider->id, 'name' => $rider->name, 'logistics_center_id' => $rider->logistics_center_id,
                'service_area_ids' => ($links->get($rider->id) ?? collect())->pluck('service_area_id'),
            ]),
        ]]);
    }

    public function availablePickups(Request $request)
    {
        $this->pagination($request);
        abort_unless($request->user()->logisticsCenters()->operational()->exists(), 403);

        return DeliveryResource::collection(Delivery::query()->whereNull('logistics_center_id')->where('status', 'unassigned')
            ->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped'))
            ->with('sellerOrder.order', 'sellerOrder.items', 'sellerOrder.store', 'sellerOrder.delivery')
            ->with(['sellerOrder.store.user.addresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')])
            ->orderByDesc('id')->paginate($request->integer('per_page', 20))->withQueryString());
    }

    private function pagination(Request $request): void
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:50']);
    }
}
