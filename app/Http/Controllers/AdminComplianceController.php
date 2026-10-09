<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use App\Notifications\SellerComplianceNotice;
use App\Services\Admin\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdminComplianceController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);
        $filters = $request->validate(['search' => 'nullable|string|max:160', 'status' => ['nullable', Rule::in(['all', 'blocked', 'mismatch'])]]);
        $query = Product::query()->with(['store.businessCategory:id,name', 'category:id,name,parent_id']);
        $query->when($filters['search'] ?? null, fn ($q, $search) => $q->where('products.name', 'like', '%'.$search.'%'));
        if (($filters['status'] ?? '') === 'blocked') {
            $query->whereNotNull('blocked_at');
        } elseif (($filters['status'] ?? '') === 'mismatch') {
            $query->join('stores', 'stores.id', '=', 'products.store_id')->join('categories', 'categories.id', '=', 'products.category_id')
                ->whereNotNull('stores.business_category_id')->whereRaw('stores.business_category_id != COALESCE(categories.parent_id, categories.id)')->select('products.*');
        }
        $products = $query->orderByDesc('products.id')->paginate(12)->withQueryString();
        $history = DB::table('product_moderations')->whereIn('product_id', $products->pluck('id'))->orderByDesc('id')->get()->groupBy('product_id');

        return Inertia::render('admin/compliance', compact('products', 'filters', 'history'));
    }

    public function update(Request $request, Product $product)
    {
        abort_unless($request->user()->role === 'admin', 403);
        $data = $request->validate(['action' => ['required', Rule::in(['warn', 'hide', 'restore', 'suspend'])], 'reason' => 'required|string|max:2000']);
        DB::transaction(function () use ($request, $product, $data) {
            $seller = User::query()->whereKey($product->store->user_id)->lockForUpdate()->firstOrFail();
            abort_unless($seller->role === 'seller', 422);
            $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            if (in_array($data['action'], ['hide', 'suspend'])) {
                $product->forceFill(['status' => 'hidden', 'blocked_at' => now()])->save();
            } elseif ($data['action'] === 'restore') {
                $category = $product->category;
                $department = $product->store->business_category_id;
                abort_unless($category?->is_active && (! $category->parent_id || $category->parent?->is_active)
                    && (! $department || (int) ($category->parent_id ?: $category->id) === (int) $department), 422, 'Correct the listing category before restoring it.');
                $product->forceFill(['status' => 'active', 'blocked_at' => null])->save();
            }
            if ($data['action'] === 'suspend') {
                abort_unless($seller->status === 'approved', 409);
                $seller->forceFill(['status' => 'suspended'])->save();
                app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'user', 'subject_id' => $seller->id, 'action' => 'suspended', 'changes' => json_encode(['from' => 'approved', 'to' => 'suspended', 'reason' => $data['reason']]), 'occurred_at' => now()]);
            }
            DB::table('product_moderations')->insert(['product_id' => $product->id, 'actor_id' => $request->user()->id, 'action' => $data['action'], 'reason' => $data['reason'], 'created_at' => now(), 'updated_at' => now()]);
            app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'product', 'subject_id' => $product->id, 'action' => $data['action'], 'changes' => json_encode(['reason' => $data['reason']]), 'occurred_at' => now()]);
            $seller->notify(new SellerComplianceNotice($product->name, $data['action'], $data['reason']));
        });

        return back()->with('status', 'Listing review saved. Seller email queued.');
    }
}
