<?php

namespace App\Services\Seller;

use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class SellerWorkspace
{
    public const QUEUES = ['all', 'pending', 'processing', 'ready', 'transit', 'issues', 'completed', 'cancelled'];

    public function orders(User $user): Builder
    {
        return SellerOrder::query()->where('store_id', $user->store?->id);
    }

    public function filter(Builder $query, string $stage): Builder
    {
        return match ($stage) {
            'ready' => $query->where('status', 'shipped')->whereHas('delivery', fn ($q) => $q->whereIn('status', ['unassigned', 'assigned'])->whereNull('exception_status')),
            'transit' => $query->where('status', 'shipped')->whereHas('delivery', fn ($q) => $q->whereIn('status', ['picked_up', 'in_transit', 'out_for_delivery'])->whereNull('exception_status')),
            'issues' => $query->whereNotIn('status', ['completed', 'cancelled'])->whereHas('delivery', fn ($q) => $q->whereNotNull('exception_status')),
            'pending', 'processing', 'completed', 'cancelled' => $query->where('status', $stage),
            default => $query,
        };
    }

    public function queueCounts(User $user): array
    {
        $query = $this->orders($user);
        $counts = [];
        foreach (self::QUEUES as $stage) {
            $counts[$stage] = $this->filter(clone $query, $stage)->count();
        }
        $counts['lowStock'] = Product::query()->where('store_id', $user->store?->id)->where('stock', '<', 5)->count();

        return $counts;
    }

    public function data(User $user): array
    {
        $orders = $this->orders($user);
        $products = Product::query()->where('store_id', $user->store?->id);

        return [
            'store' => $user->store?->only(['name', 'status']),
            'queues' => $this->queueCounts($user),
            'productCount' => (clone $products)->count(),
            'completedProceeds' => (string) (clone $orders)->where('status', 'completed')->sum('seller_proceeds'),
            'activeCount' => (clone $orders)->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'recentOrders' => $orders->with(['delivery', 'order:id,shipping_recipient_name,shipping_city'])
                ->latest('id')->limit(8)->get()->map(fn ($parcel) => [
                    'id' => $parcel->id, 'status' => $parcel->status,
                    'deliveryStatus' => $parcel->delivery?->status,
                    'exception' => $parcel->delivery?->exception_status,
                    'tracking' => $parcel->delivery?->tracking_reference,
                    'recipient' => $parcel->order->shipping_recipient_name,
                    'destination' => $parcel->order->shipping_city,
                    'subtotal' => $parcel->subtotal,
                ]),
        ];
    }
}
