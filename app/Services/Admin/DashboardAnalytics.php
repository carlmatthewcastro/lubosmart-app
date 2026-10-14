<?php

namespace App\Services\Admin;

use App\Models\Delivery;
use App\Models\SellerOrder;

class DashboardAnalytics
{
    public function data(): array
    {
        $end = now();
        $start = $end->copy()->subDays(6)->startOfDay();
        $daily = SellerOrder::query()
            ->join('deliveries', 'deliveries.seller_order_id', '=', 'seller_orders.id')
            ->where('seller_orders.status', 'completed')
            ->whereBetween('deliveries.delivered_at', [$start, $end])
            ->selectRaw('DATE(deliveries.delivered_at) as day, SUM(seller_orders.subtotal) as sales, SUM(seller_orders.commission_amount) as commission, COUNT(*) as parcels')
            ->groupByRaw('DATE(deliveries.delivered_at)')
            ->toBase()->get()->keyBy('day');

        $series = collect(range(0, 6))->map(function ($offset) use ($start, $daily) {
            $date = $start->copy()->addDays($offset)->toDateString();
            $row = $daily->get($date);

            return ['date' => $date, 'sales' => (float) ($row->sales ?? 0), 'commission' => (float) ($row->commission ?? 0), 'parcels' => (int) ($row->parcels ?? 0)];
        });
        $statuses = Delivery::query()->whereBetween('created_at', [$start, $end])
            ->selectRaw('status, COUNT(*) as total')->groupBy('status')->toBase()->get()
            ->map(fn ($row) => ['status' => $row->status, 'total' => (int) $row->total])->values();

        return [
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'timezone' => config('app.timezone'),
            'series' => $series->all(),
            'sales' => $series->sum('sales'),
            'commission' => $series->sum('commission'),
            'completedParcels' => $series->sum('parcels'),
            'deliveryStatuses' => $statuses->all(),
        ];
    }
}
