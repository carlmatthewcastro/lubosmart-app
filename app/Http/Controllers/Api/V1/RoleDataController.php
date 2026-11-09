<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\ParcelResource;
use App\Http\Resources\Api\ProductResource;
use App\Http\Resources\Api\UserResource;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\RiderPayment;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\StoreVoucher;
use App\Models\SupportCase;
use App\Services\WorkspaceStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class RoleDataController extends Controller
{
    public function policies()
    {
        return response()->json(['data' => DB::table('platform_contents')->where('kind', 'policy')->where('published', true)->orderBy('id')->get(['id', 'title', 'body'])]);
    }

    public function workspace(Request $request, WorkspaceStatus $status)
    {
        return response()->json(['data' => $status->data($request->user())]);
    }

    public function settings(Request $request)
    {
        $user = $request->user();

        return response()->json(['data' => ['user' => new UserResource($user), 'phone' => $user->phone,
            'store' => $user->store?->only(['id', 'name', 'status', 'business_category_id']),
            'application' => $user->application?->only(['id', 'status', 'requested_role', 'rejection_reason']),
            'vehicle' => $user->role === 'rider' ? DB::table('rider_profiles')->where('user_id', $user->id)->first(['vehicle_type', 'plate_number', 'license_expires_at']) : null,
        ]]);
    }

    public function products(Request $request)
    {
        $data = $request->validate(['search' => 'nullable|string|max:100', 'page' => 'sometimes|integer|min:1']);
        $query = Product::query()->where('store_id', $request->user()->store?->id ?? 0)
            ->when($data['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', '%'.$search.'%'))->with('variants', 'category');

        return response()->json(['data' => $query->latest('id')->paginate(20)->through(fn ($product) => $this->inventory($product))]);
    }

    public function product(Request $request, Product $product)
    {
        abort_unless($product->store_id === $request->user()->store?->id, 404);

        return response()->json(['data' => $this->inventory($product->load('variants', 'category'))]);
    }

    private function inventory(Product $product): array
    {
        return [...$product->only(['id', 'category_id', 'name', 'description', 'price', 'stock', 'weight_grams', 'status', 'image_url']),
            'blocked' => (bool) $product->blocked_at,
            'variants' => $product->variants->map(fn ($variant) => $variant->only(['id', 'name', 'stock', 'is_active', 'is_legacy'])),
        ];
    }

    public function wishlist(Request $request)
    {
        return ProductResource::collection(Product::query()->availableToShoppers()->whereIn('id', DB::table('product_wishlists')->where('user_id', $request->user()->id)->select('product_id'))
            ->with('store', 'category', 'variants')->withCount('reviews')->withAvg('reviews', 'rating')->latest('id')->paginate(20));
    }

    public function reviews(Product $product)
    {
        abort_unless(Product::query()->availableToShoppers()->whereKey($product->id)->exists(), 404);

        return response()->json(['data' => $product->reviews()->latest('id')->paginate(20, ['id', 'rating', 'body', 'created_at'])]);
    }

    public function ownReviews(Request $request)
    {
        return response()->json(['data' => ProductReview::query()->where('user_id', $request->user()->id)->latest('id')->paginate(20, ['id', 'order_item_id', 'rating', 'body', 'is_visible'])]);
    }

    public function vouchers(Request $request)
    {
        return response()->json(['data' => StoreVoucher::query()->where('store_id', $request->user()->store?->id ?? 0)->latest('id')
            ->paginate(20, ['id', 'code', 'amount_cents', 'minimum_cents', 'usage_limit', 'expires_at', 'is_active'])]);
    }

    public function waybill(Request $request, SellerOrder $sellerOrder)
    {
        abort_unless($sellerOrder->store_id === $request->user()->store?->id, 404);
        $sellerOrder->delivery?->ensureTrackingReference();

        return new ParcelResource($sellerOrder->load('order', 'store', 'items', 'delivery'));
    }

    public function messages(Request $request, SellerOrder $sellerOrder)
    {
        abort_unless(($request->user()->role === 'buyer' && $sellerOrder->order->buyer_id === $request->user()->id)
            || ($request->user()->role === 'seller' && $sellerOrder->store_id === $request->user()->store?->id), 404);

        return response()->json(['data' => DB::table('order_messages')->join('users', 'users.id', '=', 'order_messages.user_id')
            ->where('seller_order_id', $sellerOrder->id)->orderByDesc('order_messages.id')->paginate(30, ['order_messages.id', 'body', 'users.name as author_name', 'order_messages.created_at'])]);
    }

    public function returns(Request $request)
    {
        $user = $request->user();
        $query = ParcelReturn::query()->when($user->role === 'buyer', fn ($q) => $q->where('buyer_id', $user->id))
            ->when($user->role === 'seller', fn ($q) => $q->whereHas('sellerOrder', fn ($p) => $p->where('store_id', $user->store?->id ?? 0)))
            ->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id)->whereHas('sellerOrder.delivery', fn ($d) => $d->where('logistics_center_id', $user->logistics_center_id)))
            ->with('events', 'sellerOrder.order', 'sellerOrder.store', 'sellerOrder.items', 'sellerOrder.delivery')
            ->with(['sellerOrder.store.user.addresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')]);

        return response()->json(['data' => $query->latest('id')->paginate(20)->through(fn ($return) => [
            ...$return->only(['id', 'seller_order_id', 'status', 'reason', 'decision_reason', 'condition', 'restocked', 'collected_at', 'received_at']),
            'refund_cents' => $user->role === 'rider' ? null : $return->refund_cents,
            'refund_reference' => $user->role === 'rider' ? null : $return->refund_reference,
            'parcel' => new ParcelResource($return->sellerOrder),
            'return_destination' => $return->sellerOrder->shipping_quote['pickup_address']
                ?? $return->sellerOrder->store->user?->addresses->first()?->only(['recipient_name', 'phone', 'line1', 'barangay', 'city', 'province']),
            'allowed_actions' => match (true) {
                $user->role === 'seller' && $return->status === 'collected' => ['receive'],
                $user->role === 'rider' && $return->status === 'assigned' => ['collect'],
                default => [],
            },
            'events' => $return->events->map(fn ($event) => $event->only(['id', 'action', 'notes', 'created_at'])),
        ])]);
    }

    public function earnings(Request $request)
    {
        $query = RiderPayment::query()->where('rider_id', $request->user()->id);

        return response()->json(['data' => ['totals' => ['fees' => (int) (clone $query)->sum('amount_cents'), 'paid' => (int) (clone $query)->whereNotNull('paid_at')->sum('amount_cents')],
            'entries' => $query->latest('id')->paginate(20, ['id', 'delivery_id', 'leg', 'amount_cents', 'notes', 'payment_reference', 'paid_at']),
        ]]);
    }

    public function settlements(Request $request)
    {
        return response()->json(['data' => SellerPayout::query()->whereHas('sellerOrder', fn ($q) => $q->where('store_id', $request->user()->store?->id ?? 0))
            ->latest('id')->paginate(20, ['id', 'seller_order_id', 'amount_cents', 'reference', 'notes', 'created_at'])]);
    }

    public function support(Request $request)
    {
        return response()->json(['data' => SupportCase::query()->whereHas('participants', fn ($q) => $q->where('users.id', $request->user()->id))
            ->latest('updated_at')->orderByDesc('id')->paginate(20, ['id', 'seller_order_id', 'kind', 'subject', 'status', 'resolution', 'updated_at'])]);
    }

    public function conversation(Request $request, SupportCase $case)
    {
        Gate::authorize('view', $case);

        return response()->json(['data' => ['case' => $case->only(['id', 'subject', 'kind', 'status', 'resolution']),
            'messages' => $case->messages()->with('author:id,name')->latest('id')->paginate(30)->through(fn ($message) => [
                ...$message->only(['id', 'body', 'created_at']), 'author_name' => $message->author?->name,
                'has_attachment' => (bool) $message->attachment_path,
            ]),
        ]]);
    }
}
