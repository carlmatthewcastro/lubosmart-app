<?php

namespace App\Models;

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

    protected $fillable = [
        'seller_order_id',
        'rider_id',
        'logistics_center_id',
        'service_area_id',
        'pickup_approved_at',
        'received_at',
        'sorted_at',
        'status',
        'proof_photo_path',
        'picked_up_at',
        'delivered_at',
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
            'picked_up_at' => 'datetime',
            'pickup_approved_at' => 'datetime',
            'received_at' => 'datetime',
            'sorted_at' => 'datetime',
            'delivered_at' => 'datetime',
            'dispatch_prepared_at' => 'datetime',
            'dispatch_accepted_at' => 'datetime',
        ];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }
}
