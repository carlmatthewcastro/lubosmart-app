<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductVariantController extends Controller
{
    public function update(Request $request, Product $product)
    {
        abort_unless($request->user()->role === 'seller' && $product->store_id === $request->user()->store?->id && $request->user()->store?->status === 'approved', 403);
        $data = $request->validate([
            'expected_stock' => 'sometimes|integer|min:0|max:1000000',
            'variants' => 'required|array|min:1|max:51',
            'variants.*.id' => 'nullable|integer|distinct',
            'variants.*.name' => 'required|string|max:100',
            'variants.*.stock' => 'required|integer|min:0|max:1000000',
            'variants.*.expected_stock' => 'nullable|integer|min:0|max:1000000',
            'variants.*.is_active' => 'required|boolean',
        ]);
        $names = array_map(fn ($row) => mb_strtolower(trim($row['name'])), $data['variants']);
        if (count(array_unique($names)) !== count($names) || in_array('', $names, true)) {
            throw ValidationException::withMessages(['variants' => 'Give each option a different, non-empty size/color name.']);
        }
        try {
            DB::transaction(function () use ($product, $data) {
                $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
                $existing = $product->variants()->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                if (isset($data['expected_stock']) && $product->stock !== (int) $data['expected_stock']) {
                    throw ValidationException::withMessages(['variants' => 'Stock changed while this form was open. Close and reopen the size/color editor before saving.']);
                }
                $submitted = collect($data['variants'])->pluck('id')->filter();
                if ($submitted->diff($existing->keys())->isNotEmpty()) {
                    throw ValidationException::withMessages(['variants' => 'An option does not belong to this product. Refresh and try again.']);
                }
                if ($existing->where('is_legacy', false)->count() + collect($data['variants'])->filter(fn ($row) => empty($row['id']))->count() > 50) {
                    throw ValidationException::withMessages(['variants' => 'A product supports up to 50 options, including retired options.']);
                }
                foreach ($data['variants'] as $row) {
                    if (isset($row['id'], $row['expected_stock']) && $existing[$row['id']]->stock !== (int) $row['expected_stock']) {
                        throw ValidationException::withMessages(['variants' => 'Option stock changed while this form was open. Close and reopen the size/color editor before saving.']);
                    }
                    if (str_starts_with(mb_strtolower(trim($row['name'])), 'unallocated original stock') && ! ($existing->get($row['id'] ?? null)?->is_legacy)) {
                        throw ValidationException::withMessages(['variants' => 'Unallocated original stock is reserved for restored historical purchases.']);
                    }
                    if ($existing->contains(fn ($variant) => mb_strtolower($variant->name) === mb_strtolower(trim($row['name'])) && $variant->id !== ($row['id'] ?? null))) {
                        throw ValidationException::withMessages(['variants' => 'An existing or retired option already uses this name. Edit that option instead.']);
                    }
                }
                $retiredStock = $existing->whereNotIn('id', $submitted)->sum('stock');
                if ($retiredStock + collect($data['variants'])->sum('stock') > 1000000) {
                    throw ValidationException::withMessages(['variants' => 'Total stock across all options cannot exceed 1,000,000 units.']);
                }
                // Keep historical option identities; omitted options are retired, never deleted.
                $product->variants()->whereNotIn('id', $submitted)->update(['is_active' => false]);
                foreach ($data['variants'] as $row) {
                    $values = ['name' => trim($row['name']), 'stock' => $row['stock'], 'is_active' => $row['is_active']];
                    if ($row['id'] ?? null) {
                        if ($existing[$row['id']]->is_legacy) {
                            $values['name'] = $existing[$row['id']]->name;
                            $values['is_active'] = false;
                        }
                        $existing[$row['id']]->update($values);
                    } else {
                        ProductVariant::query()->create([...$values, 'product_id' => $product->id]);
                    }
                }
                $product->update(['stock' => $product->variants()->sum('stock')]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['variants' => 'An option name is already in use. Choose distinct names or edit the existing option.']);
        }

        return back()->with('status', 'Size/color options saved. Stock is tracked per option; all options share the product price and packed weight.');
    }
}
