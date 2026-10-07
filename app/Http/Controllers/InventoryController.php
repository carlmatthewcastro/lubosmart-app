<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'seller', 403);
        $store = $request->user()->store;

        return Inertia::render('marketplace/inventory', ['products' => Product::query()->where('store_id', $store?->id)->with('category:id,name')->latest('id')->paginate(12), 'categories' => $this->categories($store?->business_category_id)->get(['id', 'name']), 'store' => $store]);
    }

    public function save(Request $request, ?Product $product = null)
    {
        $store = $request->user()->store;
        abort_unless($request->user()->role === 'seller' && $store?->status === 'approved', 403);
        abort_if($product && $product->store_id !== $store->id, 403);
        $data = $request->validate(['name' => 'required|string|max:160', 'description' => 'nullable|string|max:5000', 'category_id' => ['required', 'integer', Rule::exists('categories', 'id')], 'price' => 'required|numeric|decimal:0,2|min:0.01|max:999999.99', 'stock' => 'required|integer|min:0|max:1000000', 'status' => ['required', Rule::in(['active', 'hidden'])], 'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120']);
        if (! $this->categories($store->business_category_id)->whereKey($data['category_id'])->exists()) {
            throw ValidationException::withMessages(['category_id' => 'Choose an active category within your registered department.']);
        }
        unset($data['image']);
        $imagePath = $request->hasFile('image') ? $request->file('image')->store('products', 'public') : null;
        if ($imagePath) {
            $data['image_path'] = $imagePath;
        }
        try {
            DB::transaction(function () use ($product, $store, $data) {
                if ($product) {
                    Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail()->update($data);
                } else {
                    Product::query()->create([...$data, 'store_id' => $store->id]);
                }
            }, 3);
        } catch (\Throwable $exception) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            throw $exception;
        }

        return back()->with('status', 'Product saved.');
    }

    private function categories(?int $department)
    {
        return Category::query()->where('is_active', true)->where(fn ($q) => $q->whereNull('parent_id')->orWhereHas('parent', fn ($q) => $q->where('is_active', true)))
            ->when($department, fn ($q) => $q->where(fn ($q) => $q->where('id', $department)->orWhere('parent_id', $department)))->orderBy('name');
    }
}
