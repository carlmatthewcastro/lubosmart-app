<?php

namespace App\Http\Controllers;

use App\Models\CommerceSetting;
use App\Models\SellerOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin', 'seller', 'logistics', 'rider']), 403);
        $filters = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', $request->filled('from') ? 'after_or_equal:from' : 'nullable']]);
        $orders = SellerOrder::query()->where('status', 'completed');
        $orders->when($filters['from'] ?? null, fn ($q, $date) => $q->whereHas('delivery', fn ($q) => $q->whereDate('delivered_at', '>=', $date)));
        $orders->when($filters['to'] ?? null, fn ($q, $date) => $q->whereHas('delivery', fn ($q) => $q->whereDate('delivered_at', '<=', $date)));
        if ($user->role === 'seller') {
            $orders->where('store_id', $user->store?->id);
        } elseif (in_array($user->role, ['logistics', 'rider'])) {
            $orders->whereHas('delivery', fn ($q) => $user->role === 'rider' ? $q->where('rider_id', $user->id) : $q->whereIn('sorting_center_id', $user->sortingCenters()->where('is_active', true)->pluck('sorting_centers.id')));
        }
        $financial = in_array($user->role, ['admin', 'seller']);
        $columns = $financial ? ['*'] : ['id', 'order_id', 'store_id', 'subtotal', 'shipping_fee'];
        $records = (clone $orders)->with('store:id,name')->latest('id')->paginate(15, $columns)->withQueryString();
        $totals = ['Completed parcels' => (clone $orders)->count()];
        if ($financial) {
            $totals += ['Product sales' => (clone $orders)->sum('subtotal'), 'Commission' => (clone $orders)->sum('commission_amount'), 'Seller proceeds' => (clone $orders)->sum('seller_proceeds')];
        } else {
            $totals += ['Parcel COD value' => (float) (clone $orders)->sum('subtotal') + (float) (clone $orders)->sum('shipping_fee')];
        }

        return Inertia::render('marketplace/reports', ['role' => $user->role, 'records' => $records, 'totals' => $totals, 'settings' => null, 'filters' => $filters]);
    }

    public function commission(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);

        return Inertia::render('admin/commission', ['settings' => CommerceSetting::query()->findOrFail(1)]);
    }

    public function export(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);
        $filters = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', $request->filled('from') ? 'after_or_equal:from' : 'nullable'], 'type' => 'required|in:sales,commission']);
        $orders = SellerOrder::query()->where('status', 'completed')->with('store:id,name')
            ->when($filters['from'] ?? null, fn ($q, $date) => $q->whereHas('delivery', fn ($q) => $q->whereDate('delivered_at', '>=', $date)))
            ->when($filters['to'] ?? null, fn ($q, $date) => $q->whereHas('delivery', fn ($q) => $q->whereDate('delivered_at', '<=', $date)));

        return response()->streamDownload(function () use ($orders, $filters) {
            $file = fopen('php://output', 'w');
            $commission = $filters['type'] === 'commission';
            fputcsv($file, $commission ? ['Parcel', 'Store', 'Product sales (PHP)', 'Commission (PHP)', 'Seller proceeds (PHP)'] : ['Parcel', 'Store', 'Product sales (PHP)', 'Shipping (PHP)'], ',', '"', '');
            foreach ($orders->lazyById(200) as $order) {
                $name = $order->store->name;
                if (preg_match('/^[\s]*[=+@-]/u', $name)) {
                    $name = "'".$name;
                }
                fputcsv($file, $commission ? [$order->id, $name, $order->subtotal, $order->commission_amount, $order->seller_proceeds] : [$order->id, $name, $order->subtotal, $order->shipping_fee], ',', '"', '');
            }
            fclose($file);
        }, $filters['type'].'-report-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function update(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);
        $data = $request->validate(['shipping_fee_per_seller_order' => 'required|numeric|decimal:0,2|min:0|max:9999.99', 'platform_commission_basis_points' => 'required|integer|min:0|max:10000'], [
            'platform_commission_basis_points.required' => 'Enter a commission percentage.',
            'platform_commission_basis_points.integer' => 'Enter a valid commission percentage.',
            'platform_commission_basis_points.min' => 'Commission must be between 0% and 100%.',
            'platform_commission_basis_points.max' => 'Commission must be between 0% and 100%.',
            'shipping_fee_per_seller_order.*' => 'Enter a delivery fee between PHP 0 and PHP 9,999.99, with up to two decimal places.',
        ]);
        DB::transaction(function () use ($request, $data) {
            $settings = CommerceSetting::query()->whereKey(1)->lockForUpdate()->firstOrFail();
            $before = $settings->only(array_keys($data));
            $settings->update($data);
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'commerce_settings', 'subject_id' => 1, 'action' => 'updated', 'changes' => json_encode(['before' => $before, 'after' => $data]), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Rates saved. Existing orders retain their original rates.');
    }
}
