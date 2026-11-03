<?php

namespace App\Services\Rider;

use App\Models\Delivery;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class RiderWorkspace
{
    public const QUEUES = ['all', 'pickups', 'dispatch', 'monitoring', 'exceptions', 'cash', 'completed'];

    public function filter(Builder $query, string $queue): Builder
    {
        return match ($queue) {
            'pickups' => $query->whereIn('status', ['assigned', 'picked_up'])->whereNull('received_at')->whereNull('exception_status'),
            'dispatch' => $query->where('status', 'in_transit')->whereNotNull('dispatch_prepared_at')->whereNull('exception_status'),
            'monitoring' => $query->where('status', 'out_for_delivery')->whereNull('exception_status'),
            'exceptions' => $query->whereNotNull('exception_status'),
            'completed' => $query->where('status', 'delivered'),
            'cash' => $query->whereExists(fn ($q) => $q->selectRaw('1')->from('cod_collections')->whereColumn('cod_collections.delivery_id', 'deliveries.id')->where('cod_collections.status', 'collected')),
            default => $query,
        };
    }

    public function queueCounts(User $user): array
    {
        $query = Delivery::query()->where('rider_id', $user->id);
        $counts = [];
        foreach (self::QUEUES as $queue) {
            $counts[$queue] = $this->filter(clone $query, $queue)->count();
        }

        return $counts;
    }

    public function data(User $user): array
    {
        $query = Delivery::query()->where('rider_id', $user->id);
        $cash = DB::table('cod_collections')->where('rider_id', $user->id)
            ->whereIn('delivery_id', (clone $query)->select('id'))->where('status', 'collected')->sum('amount');

        return [
            'companyName' => $user->logisticsCenter?->name,
            'queues' => $this->queueCounts($user),
            'pendingCod' => (string) $cash,
            'activeCount' => (clone $query)->where('status', '!=', 'delivered')->count(),
            'recentParcels' => $query->with(['sellerOrder.store:id,name', 'sellerOrder.order:id,shipping_recipient_name,shipping_barangay,shipping_city'])
                ->latest('id')->limit(8)->get()->map(fn ($parcel) => [
                    'id' => $parcel->id, 'status' => $parcel->status, 'exception' => $parcel->exception_status,
                    'tracking' => $parcel->tracking_reference, 'store' => $parcel->sellerOrder->store->name,
                    'recipient' => $parcel->sellerOrder->order->shipping_recipient_name,
                    'destination' => implode(', ', array_filter([$parcel->sellerOrder->order->shipping_barangay, $parcel->sellerOrder->order->shipping_city])),
                    'cod' => number_format((float) $parcel->sellerOrder->subtotal + (float) $parcel->sellerOrder->shipping_fee, 2, '.', ''),
                ]),
        ];
    }
}
