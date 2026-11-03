<?php

namespace App\Http\Controllers;

use App\Models\ParcelReturn;
use App\Models\SellerCost;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SellerCostController extends Controller
{
    public function index(Request $request)
    {
        $storeId = $request->user()->store?->id;
        $parcels = SellerOrder::query()->where('store_id', $storeId)->where('status', 'completed');
        $costs = SellerCost::query()->where('store_id', $storeId);
        $proceeds = (int) round((float) (clone $parcels)->sum('seller_proceeds') * 100);
        $refunds = ParcelReturn::query()->whereHas('sellerOrder', fn ($q) => $q->where('store_id', $storeId))->sum('seller_debit_cents');
        $paid = SellerPayout::query()->whereHas('sellerOrder', fn ($q) => $q->where('store_id', $storeId))->sum('amount_cents');
        $cost = (clone $costs)->whereNull('voided_at')->sum('amount_cents');

        return Inertia::render('finance/seller-costs', ['costs' => $costs->latest('incurred_on')->latest('id')->paginate(15), 'totals' => ['proceeds' => $proceeds, 'refunds' => (int) $refunds, 'costs' => (int) $cost, 'profit' => $proceeds - $refunds - $cost, 'paid' => (int) $paid, 'balance' => $proceeds - $refunds - $paid], 'canRecord' => $request->user()->store?->status === 'approved']);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->store?->status === 'approved', 403);
        $data = $request->validate(['incurred_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Asia/Manila')->toDateString()], 'category' => 'required|in:goods,packaging,operations,other', 'description' => 'required|string|min:3|max:500', 'amount' => 'required|numeric|decimal:0,2|min:0.01|max:99999999.99']);
        SellerCost::query()->create(['store_id' => $request->user()->store->id, 'recorded_by' => $request->user()->id, 'incurred_on' => $data['incurred_on'], 'category' => $data['category'], 'description' => $data['description'], 'amount_cents' => (int) round((float) $data['amount'] * 100)]);

        return back()->with('status', 'Seller cost recorded. Profit depends on the completeness of your recorded costs.');
    }

    public function void(Request $request, SellerCost $cost)
    {
        abort_unless($cost->store_id === $request->user()->store?->id, 403);
        $data = $request->validate(['reason' => 'required|string|min:3|max:500']);
        DB::transaction(function () use ($cost, $data) {
            $cost = SellerCost::query()->whereKey($cost->id)->lockForUpdate()->firstOrFail();
            abort_if($cost->voided_at, 409, 'This cost is already void.');
            $cost->update(['voided_at' => now(), 'void_reason' => $data['reason']]);
        });

        return back()->with('status', 'Cost voided with its history retained.');
    }
}
