<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class RestorePurchasedStock
{
    // The caller's transaction owns parcel/return replay checks before restoring stock.
    public function handle(Collection $items, bool $enforceLimit = false): void
    {
        $products = Product::query()->whereIn('id', $items->pluck('product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $variants = ProductVariant::query()->whereIn('product_id', $products->keys())->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        foreach ($items as $item) {
            $product = $products->get($item->product_id);
            abort_unless($product, 409, 'The historical product cannot be safely restocked.');
            if ($enforceLimit && $product->stock + $item->quantity > 1000000) {
                throw ValidationException::withMessages(['restock' => 'Receiving this return would exceed the product stock limit.']);
            }
            $variant = $item->product_variant_id ? $variants->get($item->product_variant_id) : null;
            if (! $variant && ($item->variant_name || $variants->contains('product_id', $product->id))) {
                // A base purchase cannot invent a size/color after options were introduced.
                $variant = ProductVariant::query()->firstOrCreate(['product_id' => $product->id, 'is_legacy' => true], ['name' => 'Unallocated original stock #'.$product->id, 'stock' => 0, 'is_active' => false]);
                $variants->put($variant->id, $variant);
            }
            $product->increment('stock', $item->quantity);
            $variant?->increment('stock', $item->quantity);
        }
    }
}
