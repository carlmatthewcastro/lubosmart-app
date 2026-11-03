<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\StoreVoucher;
use App\Services\StoreDiscount;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StoreVoucherController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('seller/vouchers', ['vouchers' => StoreVoucher::query()->where('store_id', $request->user()->store?->id)->latest('id')->paginate(15), 'storeApproved' => $request->user()->store?->status === 'approved']);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->store?->status === 'approved', 403);
        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }
        $data = $request->validate(['code' => 'required|string|min:3|max:30|regex:/^[A-Z0-9-]+$/|unique:store_vouchers,code', 'amount' => 'required|numeric|decimal:0,2|min:0.01|max:999999.99', 'minimum' => 'required|numeric|decimal:0,2|min:0|max:999999.99', 'usage_limit' => 'required|integer|min:1|max:1000000', 'expires_at' => 'required|date|after:now']);
        try {
            StoreVoucher::query()->create(['store_id' => $request->user()->store->id, 'code' => $data['code'], 'amount_cents' => (int) round($data['amount'] * 100), 'minimum_cents' => (int) round($data['minimum'] * 100), 'usage_limit' => $data['usage_limit'], 'expires_at' => $data['expires_at'], 'is_active' => true]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['code' => 'This voucher code is already in use. Choose another code.']);
        }

        return back()->with('status', 'Voucher created. Share its code with buyers. Discounts reduce your store sales and proceeds.');
    }

    public function update(Request $request, StoreVoucher $voucher)
    {
        abort_unless($voucher->store_id === $request->user()->store?->id && $request->user()->store?->status === 'approved', 403);
        $voucher->update($request->validate(['is_active' => 'required|boolean']));

        return back()->with('status', 'Voucher availability updated. Existing orders keep their agreed discount.');
    }

    public function preview(Request $request, StoreDiscount $discount)
    {
        $data = $request->validate(['voucher_code' => 'required|string|max:30']);
        $items = Cart::query()->where('user_id', $request->user()->id)->first()?->items()->with('product')->get() ?? collect();
        $totals = [];
        foreach ($items as $item) {
            if ($item->product) {
                $totals[$item->product->store_id] = ($totals[$item->product->store_id] ?? 0) + (int) round((float) $item->product->price * 100) * $item->quantity;
            }
        }
        $result = $discount->resolve($data['voucher_code'], $totals, $request->user()->id);

        return response()->json(['code' => $result['voucher']->code, 'discount_cents' => $result['cents']])->header('Cache-Control', 'private, no-store');
    }
}
