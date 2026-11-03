<?php

namespace App\Services\Logistics;

use Illuminate\Database\Eloquent\Builder;

class ParcelQueues
{
    public const STAGES = ['all', 'pickups', 'incoming', 'sorting', 'dispatch', 'monitoring', 'exceptions', 'cash'];

    public function filter(Builder $query, string $stage): Builder
    {
        return match ($stage) {
            'pickups' => $query->where('status', 'unassigned')->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped')),
            'incoming' => $query->whereIn('status', ['assigned', 'picked_up', 'in_transit'])->whereNull('received_at')->whereNull('exception_status'),
            'sorting' => $query->whereNotNull('received_at')->whereNull('sorted_at')->where('status', '!=', 'delivered')->whereNull('exception_status'),
            'dispatch' => $query->whereNotNull('sorted_at')->whereNull('dispatch_accepted_at')->whereIn('status', ['picked_up', 'in_transit'])->whereNull('exception_status'),
            'monitoring' => $query->whereIn('status', ['in_transit', 'out_for_delivery', 'delivered']),
            'exceptions' => $query->whereNotNull('exception_status'),
            'cash' => $query->whereExists(fn ($q) => $q->selectRaw('1')->from('cod_collections')->whereColumn('cod_collections.delivery_id', 'deliveries.id')->where(fn ($q) => $q->where('cod_collections.status', 'collected')->orWhere(fn ($q) => $q->where('cod_collections.status', 'handed_over')->whereNull('cod_collections.received_amount')))),
            default => $query,
        };
    }
}
