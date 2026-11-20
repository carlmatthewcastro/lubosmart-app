<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Services\Logistics\LogisticsContacts;
use App\Services\ParcelFinance;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request, LogisticsContacts $contacts)
    {
        [$orders, $filters] = $this->orders($request, $contacts);
        $totals = ['Completed Parcels' => (clone $orders)->count(), 'Shipping Fees' => (clone $orders)->sum('shipping_fee'), 'COD Value' => ParcelFinance::decimal((int) (clone $orders)->selectRaw('COALESCE(SUM(COALESCE(cod_due_cents, ROUND(subtotal * 100) + ROUND(shipping_fee * 100) - coins_redeemed_cents)), 0) as cash_total')->value('cash_total'))];
        $records = $orders->with(['store:id,name', 'delivery.rider:id,name'])->latest('id')->paginate(15, ['id', 'order_id', 'store_id', 'subtotal', 'shipping_fee', 'cod_due_cents', 'coins_redeemed_cents'])->withQueryString();

        return Inertia::render('logistics/reports', compact('records', 'totals', 'filters'));
    }

    public function export(Request $request, LogisticsContacts $contacts)
    {
        [$orders] = $this->orders($request, $contacts);
        $orders->with(['store:id,name', 'delivery.rider:id,name']);

        return response()->streamDownload(function () use ($orders) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Parcel', 'Store', 'Rider', 'Delivered At', 'Shipping Fee (PHP)', 'COD Value (PHP)'], ',', '"', '');
            foreach ($orders->lazyById(200) as $order) {
                $safe = fn ($value) => preg_match('/^[\s]*[=+@-]/u', $value ?? '') ? "'".$value : ($value ?? '');
                fputcsv($file, [$order->id, $safe($order->store->name), $safe($order->delivery->rider?->name), $order->delivery->delivered_at?->toIso8601String(), $order->shipping_fee, ParcelFinance::decimal(ParcelFinance::expected($order))], ',', '"', '');
            }
            fclose($file);
        }, 'logistics-deliveries-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function orders(Request $request, LogisticsContacts $contacts): array
    {
        $filters = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', $request->filled('from') ? 'after_or_equal:from' : 'nullable']]);
        $orders = $contacts->parcels($request->user())->where('status', 'completed')
            ->when($filters['from'] ?? null, fn ($query, $date) => $query->whereHas('delivery', fn ($query) => $query->whereDate('delivered_at', '>=', $date)))
            ->when($filters['to'] ?? null, fn ($query, $date) => $query->whereHas('delivery', fn ($query) => $query->whereDate('delivered_at', '<=', $date)));

        return [$orders, $filters];
    }
}
