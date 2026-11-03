<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Services\Admin\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductReviewController extends Controller
{
    public function show(Request $request, Product $product)
    {
        abort_unless(Product::query()->availableToShoppers()->whereKey($product->id)->exists(), 404);
        $product->load(['store:id,name', 'category:id,name', 'variants'])->loadAvg('reviews', 'rating')->loadCount('reviews');

        return Inertia::render('marketplace/product', ['product' => $product, 'reviews' => $product->reviews()->latest('id')->paginate(10, ['id', 'rating', 'body', 'created_at']), 'saved' => $request->user()?->role === 'buyer' && DB::table('product_wishlists')->where('user_id', $request->user()->id)->where('product_id', $product->id)->exists()]);
    }

    public function store(Request $request, OrderItem $item)
    {
        abort_unless($item->sellerOrder->order->buyer_id === $request->user()->id, 403);
        abort_unless($item->sellerOrder->status === 'completed' && $item->sellerOrder->delivery?->status === 'delivered' && $item->product_id, 409, 'Only delivered purchases can be reviewed.');
        $data = $request->validate(['rating' => 'required|integer|min:1|max:5', 'body' => 'required|string|min:3|max:2000']);
        DB::transaction(function () use ($item, $request, $data) {
            OrderItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            ProductReview::query()->updateOrCreate(['order_item_id' => $item->id], [...$data, 'user_id' => $request->user()->id, 'product_id' => $item->product_id]);
        }, 3);

        return back()->with('status', 'Your verified-purchase review was saved. Moderated reviews remain hidden.');
    }

    public function index()
    {
        return Inertia::render('admin/product-reviews', ['reviews' => ProductReview::query()->latest('id')->paginate(20)]);
    }

    public function moderate(Request $request, ProductReview $review, AuditLogger $audit)
    {
        $data = $request->validate(['is_visible' => 'required|boolean', 'reason' => 'required|string|min:3|max:500']);
        DB::transaction(function () use ($review, $data, $audit, $request) {
            $review = ProductReview::query()->whereKey($review->id)->lockForUpdate()->firstOrFail();
            $review->update(['is_visible' => $data['is_visible'], 'moderation_reason' => $data['reason']]);
            $audit->record(['actor_id' => $request->user()->id, 'subject_type' => 'product', 'subject_id' => $review->product_id, 'action' => 'review_moderated', 'changes' => ['review_id' => $review->id, 'visible' => $data['is_visible'], 'reason' => $data['reason']]]);
        });

        return back()->with('status', 'Review visibility updated.');
    }
}
