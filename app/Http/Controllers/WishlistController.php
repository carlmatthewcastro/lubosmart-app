<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WishlistController extends Controller
{
    public function update(Request $request, Product $product): RedirectResponse
    {
        abort_unless($request->user()->role === 'buyer' && $request->user()->canOperate(), 403);
        $data = $request->validate(['saved' => ['required', 'boolean']]);
        if ($data['saved']) {
            abort_unless(Product::query()->availableToShoppers()->whereNull('blocked_at')->whereKey($product->id)->exists(), 404);
            DB::table('product_wishlists')->insertOrIgnore(['user_id' => $request->user()->id, 'product_id' => $product->id, 'created_at' => now(), 'updated_at' => now()]);
        } else {
            DB::table('product_wishlists')->where('user_id', $request->user()->id)->where('product_id', $product->id)->delete();
        }

        return back()->with('status', $data['saved'] ? 'Product saved to your wishlist.' : 'Product removed from your wishlist.');
    }
}
