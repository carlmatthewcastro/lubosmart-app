<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\SellerOrder;
use App\Models\StoreVoucher;
use App\Services\Notifications\NotificationInbox;
use App\Services\ParcelFinance;
use App\Services\PublicShopVouchers;
use App\Services\StoreDiscount;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StoreVoucherController extends Controller
{
    public function available(Request $request)
    {
        $data = $request->validate(['store_id' => 'required|integer|min:1']);

        return response()->json(['data' => app(PublicShopVouchers::class)->forStores([(int) $data['store_id']])]);
    }

    public function index(Request $request)
    {
        $history = SellerOrder::query()->where('store_id', $request->user()->store?->id)->whereNotNull('store_voucher_id')
            ->latest('id')->paginate(15, ['id', 'voucher_code', 'discount_amount', 'status', 'created_at'], 'history_page')->withQueryString();

        return Inertia::render('seller/vouchers', ['vouchers' => StoreVoucher::query()->where('store_id', $request->user()->store?->id)->withCount(['redemptions as used_count' => fn ($q) => $q->where('status', '!=', 'cancelled')])->withSum(['redemptions as used_discount' => fn ($q) => $q->where('status', '!=', 'cancelled')], 'discount_amount')->latest('id')->paginate(15)->withQueryString(), 'templates' => config('shop-vouchers.templates'), 'history' => $history, 'storeApproved' => $request->user()->store?->status === 'approved']);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->store?->status === 'approved', 403);
        if ($request->filled('template_id')) {
            $request->validate(['template_id' => ['required', Rule::in(array_keys(config('shop-vouchers.templates')))], 'activation_confirmed' => 'accepted']);
            $preset = config('shop-vouchers.templates.'.$request->input('template_id'));
            $request->merge(['code' => 'SHOP-'.strtoupper(Str::random(16)), 'is_public' => $request->boolean('is_public', true),
                'amount' => $request->input('amount', ParcelFinance::decimal($preset['amount_cents'])),
                'minimum' => $request->input('minimum', ParcelFinance::decimal($preset['minimum_cents'])),
                'usage_limit' => $request->input('usage_limit', $preset['usage_limit']), 'expires_at' => $request->input('expires_at', now()->addDays($preset['days'])->toIso8601String())]);
        }
        if (! $request->filled('code')) {
            $request->merge(['code' => 'SHOP-'.strtoupper(Str::random(16))]);
        }
        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }
        $data = $request->validate(['is_public' => 'sometimes|boolean', 'code' => 'required|string|min:3|max:30|regex:/^[A-Z0-9-]+$/|unique:store_vouchers,code', 'amount' => 'required|numeric|decimal:0,2|min:0.01|max:999999.99', 'minimum' => 'required|numeric|decimal:0,2|min:0|max:999999.99', 'usage_limit' => 'required|integer|min:1|max:1000000', 'expires_at' => 'required|date|after:now']);
        try {
            DB::transaction(function () use ($request, $data) {
                $voucher = StoreVoucher::query()->create(['store_id' => $request->user()->store->id, 'code' => $data['code'], 'is_public' => $data['is_public'] ?? true, 'amount_cents' => ParcelFinance::cents((string) $data['amount']), 'minimum_cents' => ParcelFinance::cents((string) $data['minimum']), 'usage_limit' => $data['usage_limit'], 'expires_at' => $data['expires_at'], 'is_active' => true]);
                app(NotificationInbox::class)->send($request->user()->id, 'voucher.activated', 'voucher:'.$voucher->id, 'Shop voucher activated', 'Your approved seller-funded voucher '.$voucher->code.' is active.', 'voucher', $voucher->id);
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['code' => 'This voucher code is already in use. Choose another code.']);
        }

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => 'Voucher created.']);
        }

        return back()->with('status', 'Voucher created. Public vouchers appear in your shop, product pages, and buyer bags. Discounts reduce your store sales and proceeds.');
    }

    public function update(Request $request, StoreVoucher $voucher)
    {
        abort_unless($voucher->store_id === $request->user()->store?->id && $request->user()->store?->status === 'approved', 403);
        $voucher->update($request->validate(['is_active' => 'required_without:is_public|boolean', 'is_public' => 'sometimes|boolean']));

        if ($request->routeIs('api.v1.*')) {
            return response()->json(['message' => 'Voucher updated.']);
        }

        return back()->with('status', 'Voucher availability updated. Existing orders keep their agreed discount.');
    }

    public function preview(Request $request, StoreDiscount $discount)
    {
        $data = $request->validate(['voucher_code' => 'required|string|max:30']);
        $items = Cart::query()->where('user_id', $request->user()->id)->first()?->items()->with('product')->get() ?? collect();
        $totals = [];
        foreach ($items as $item) {
            if ($item->product) {
                $totals[$item->product->store_id] = ($totals[$item->product->store_id] ?? 0) + ParcelFinance::cents($item->product->price) * $item->quantity;
            }
        }
        $result = $discount->resolve($data['voucher_code'], $totals, $request->user()->id);

        return response()->json(['code' => $result['voucher']->code, 'discount_cents' => $result['cents']])->header('Cache-Control', 'private, no-store');
    }
}
