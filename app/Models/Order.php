<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'buyer_id',
        'address_id',
        'shipping_recipient_name',
        'shipping_phone',
        'shipping_line1',
        'shipping_line2',
        'shipping_barangay',
        'shipping_city',
        'shipping_province',
        'shipping_region',
        'shipping_zip',
        'subtotal',
        'shipping_total',
        'payment_method',
        'total',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'shipping_total' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function address(): BelongsTo
    {
        return $this->belongsTo(Address::class);
    }

    public function sellerOrders(): HasMany
    {
        return $this->hasMany(SellerOrder::class);
    }
}
