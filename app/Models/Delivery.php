<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    protected $fillable = [
        'seller_order_id',
        'rider_id',
        'sorting_center_id',
        'service_area_id',
        'pickup_approved_at',
        'received_at',
        'sorted_at',
        'status',
        'proof_photo_path',
        'picked_up_at',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'picked_up_at' => 'datetime',
            'pickup_approved_at' => 'datetime',
            'received_at' => 'datetime',
            'sorted_at' => 'datetime',
            'delivered_at' => 'datetime',
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
