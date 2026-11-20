<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\RiderPayment;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\Store;
use App\Models\User;
use App\Models\WeeklyRiderPayment;
use Illuminate\Support\Facades\DB;

class DashboardSummary
{
    public function admin(User $user): array
    {
        $summary = [];
        if ($user->canAdmin('reports')) {
            $summary['orders'] = Order::query()->count();
            $commission = ParcelFinance::cents((string) SellerOrder::query()->where('status', 'completed')->sum('commission_amount'));
            $reversals = (int) ParcelReturn::query()->sum('commission_reversal_cents');
            $summary['commission'] = ParcelFinance::decimal($commission - $reversals);
        }
        if ($user->canAdmin('compliance')) {
            $summary['sellers'] = Store::query()->where('status', 'approved')->whereHas('user', fn ($q) => $q->where('status', 'approved')->whereNotNull('email_verified_at'))->count();
        }
        if ($user->canAdmin('disputes')) {
            $summary['returns'] = ParcelReturn::query()->whereIn('status', ['requested', 'approved'])->count();
        }

        return $summary;
    }

    public function seller(User $user): array
    {
        $orders = SellerOrder::query()->where('store_id', $user->store?->id);
        $end = now();
        $start = $end->copy()->subDays(6)->startOfDay();
        $daily = (clone $orders)->join('deliveries', 'deliveries.seller_order_id', '=', 'seller_orders.id')
            ->where('seller_orders.status', 'completed')->whereBetween('deliveries.delivered_at', [$start, $end])
            ->selectRaw('DATE(deliveries.delivered_at) as day, SUM(seller_orders.subtotal) as sales')
            ->groupByRaw('DATE(deliveries.delivered_at)')->toBase()->get()->keyBy('day');

        return [
            'sales' => (string) (clone $orders)->where('status', 'completed')->sum('subtotal'),
            'activeProducts' => Product::query()->where('store_id', $user->store?->id)->where('status', 'active')->whereNull('blocked_at')->count(),
            'returns' => ParcelReturn::query()->whereIn('seller_order_id', (clone $orders)->select('id'))->count(),
            'received' => ParcelFinance::decimal((int) SellerPayout::query()->whereIn('seller_order_id', (clone $orders)->select('id'))->sum('amount_cents')),
            'series' => collect(range(0, 6))->map(function ($offset) use ($start, $daily) {
                $date = $start->copy()->addDays($offset)->toDateString();

                return ['label' => $date, 'value' => (float) ($daily->get($date)->sales ?? 0)];
            })->all(),
            'period' => $start->toDateString().' – '.$end->toDateString().' · '.config('app.timezone'),
        ];
    }

    public function rider(User $user): array
    {
        $fees = RiderPayment::query()->where('rider_id', $user->id);
        $weekly = WeeklyRiderPayment::query()->where('rider_id', $user->id);

        return [
            'fees' => ParcelFinance::decimal((int) (clone $fees)->sum('amount_cents')),
            'weekly' => ParcelFinance::decimal((int) (clone $weekly)->sum('amount_cents')),
            'paid' => ParcelFinance::decimal((int) (clone $fees)->whereNotNull('paid_at')->sum('amount_cents') + (int) (clone $weekly)->whereNotNull('paid_at')->sum('amount_cents')),
            'returns' => ParcelReturn::query()->where('rider_id', $user->id)->whereHas('task', fn ($q) => $q->whereIn('status', ['assigned', 'seller_assigned', 'seller_in_transit']))->count(),
        ];
    }

    public function logistics(User $user): array
    {
        $ids = $user->logisticsCenters()->operational()->select('logistics_centers.id');
        $parcels = Delivery::query()->whereIn('logistics_center_id', $ids);

        return [
            'atCenter' => (clone $parcels)->whereNotNull('received_at')->whereNull('dispatch_accepted_at')->where('status', '!=', 'delivered')->count(),
            'outForDelivery' => (clone $parcels)->where('status', 'out_for_delivery')->count(),
            'deliveredToday' => (clone $parcels)->where('status', 'delivered')->whereBetween('delivered_at', [today(), now()])->count(),
            'receivedCod' => (string) DB::table('cod_collections')->whereIn('delivery_id', (clone $parcels)->select('id'))->sum('received_amount'),
            'returns' => ParcelReturn::query()->whereHas('sellerOrder.delivery', fn ($q) => $q->whereIn('logistics_center_id', $ids))
                ->whereHas('task', fn ($q) => $q->whereIn('status', ['requested', 'assigned', 'collected', 'facility_received', 'seller_assigned', 'seller_in_transit']))->count(),
        ];
    }
}
