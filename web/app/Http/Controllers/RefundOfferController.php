<?php

namespace App\Http\Controllers;

use App\Models\ParcelReturn;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RefundOfferController extends Controller
{
    public function store(Request $request, ParcelReturn $return)
    {
        abort_unless($request->user()->canAdmin('finance'), 403);
        throw ValidationException::withMessages(['approval' => 'Use the combined refund approval form. Offers and buyer acceptance are no longer required.']);
    }

    public function accept(Request $request, ParcelReturn $return)
    {
        abort_unless($request->user()->role === 'buyer' && $return->buyer_id === $request->user()->id, 403);

        return $request->routeIs('api.v1.*') ? response()->json(['message' => 'Buyer acceptance is not required. Admin approval credits your wallet automatically.']) : back()->with('status', 'Buyer acceptance is not required. Admin approval credits your wallet automatically.');
    }
}
