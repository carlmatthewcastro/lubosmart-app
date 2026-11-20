<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Delivery extends Model
{
    protected static function booted(): void
    {
        static::creating(function (Delivery $delivery) {
            $delivery->tracking_reference = 'LM-'.strtoupper(str_replace('-', '', (string) Str::uuid()));
        });
    }

    public function ensureTrackingReference(): string
    {
        if (! $this->tracking_reference) {
            static::query()->whereKey($this->id)->whereNull('tracking_reference')->update([
                'tracking_reference' => 'LM-'.strtoupper(str_replace('-', '', (string) Str::uuid())),
            ]);
            $this->refresh();
        }

        return $this->tracking_reference;
    }

    protected $appends = ['fulfillment_status'];

    public function getFulfillmentStatusAttribute(): string
    {
        return match (true) {
            (bool) $this->exception_status => $this->exception_status,
            $this->status === 'delivered' => 'delivered',
            $this->status === 'out_for_delivery' => 'out_for_delivery',
            (bool) $this->dispatch_accepted_at => 'handover_confirmed',
            (bool) $this->dispatch_prepared_at => 'delivery_rider_assigned',
            (bool) $this->sorted_at => 'sorted',
            (bool) $this->received_at => 'received_at_hub',
            default => $this->status,
        };
    }

    protected $fillable = [
        'seller_order_id',
        'rider_id',
        'pickup_rider_id',
        'delivery_rider_id',
        'pickup_assigned_at',
        'delivery_assigned_at',
        'custody_type',
        'custody_rider_id',
        'logistics_center_id',
        'service_area_id',
        'pickup_approved_at',
        'received_at',
        'sorted_at',
        'status',
        'proof_photo_path',
        'picked_up_at',
        'delivered_at',
        'return_window_days',
        'receipt_condition',
        'sorting_bin',
        'dispatch_prepared_at',
        'dispatch_reference',
        'dispatch_accepted_at',
        'exception_status',
    ];

    protected function casts(): array
    {
        return [
            'pickup_assigned_at' => 'datetime',
            'delivery_assigned_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'pickup_approved_at' => 'datetime',
            'received_at' => 'datetime',
            'sorted_at' => 'datetime',
            'delivered_at' => 'datetime',
            'return_window_days' => 'integer',
            'dispatch_prepared_at' => 'datetime',
            'dispatch_accepted_at' => 'datetime',
        ];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function scopeWithinReturnWindow(Builder $query, int $defaultDays): void
    {
        // Both supported database engines use the same stored delivery snapshot.
        $deadline = $query->getConnection()->getDriverName() === 'sqlite'
            ? "datetime(delivered_at, '+' || COALESCE(return_window_days, ?) || ' days')"
            : 'TIMESTAMPADD(DAY, COALESCE(return_window_days, ?), delivered_at)';
        $query->whereNotNull('delivered_at')->whereRaw($deadline.' >= ?', [$defaultDays, now()->toDateTimeString()]);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function scopeForRider(Builder $query, User $rider): void
    {
        $query->where('logistics_center_id', $rider->logistics_center_id)->where(fn ($q) => $q
            ->where('rider_id', $rider->id)->orWhere('pickup_rider_id', $rider->id)->orWhere('delivery_rider_id', $rider->id));
    }

    public function riderCan(User $rider, string $action): bool
    {
        $leg = $action === 'picked_up' ? 'pickup' : 'delivery';
        $assigned = $leg === 'pickup' ? ($this->pickup_rider_id ?? $this->rider_id) : ($this->delivery_rider_id ?? ($this->dispatch_prepared_at || in_array($this->status, ['out_for_delivery', 'delivered'], true) ? $this->rider_id : null));

        return $rider->canRide($leg) && $assigned === $rider->id
            && $this->logistics_center_id === $rider->logistics_center_id;
    }

    public function riderActions(User $rider): array
    {
        if ($this->exception_status) {
            return $this->exception_status === 'transfer_pending' && $this->riderCan($rider, 'accept_transfer') ? ['accept_transfer'] : [];
        }
        $actions = match (true) {
            $this->status === 'assigned' => ['picked_up'],
            $this->status === 'in_transit' && $this->dispatch_prepared_at && ! $this->dispatch_accepted_at => ['accept_dispatch'],
            $this->status === 'in_transit' && (bool) $this->dispatch_accepted_at => ['out_for_delivery'],
            $this->status === 'out_for_delivery' => ['delivered', 'failed_attempt'],
            default => [],
        };

        return array_values(array_filter($actions, fn ($action) => $this->riderCan($rider, $action)));
    }
}
