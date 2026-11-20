<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SellerOrder extends Model
{
    protected $fillable = [
        'order_id',
        'store_id',
        'coins_redeemed_cents', 'cod_due_cents', 'merchandise_cash_cents',
        'subtotal',
        'shipping_fee',
        'shipping_quote',
        'shipping_weight_grams',
        'commission_basis_points',
        'commission_amount',
        'seller_proceeds',
        'status',
        'store_voucher_id',
        'voucher_code',
        'discount_amount',
    ];

    protected function casts(): array
    {
        return ['coins_redeemed_cents' => 'integer', 'cod_due_cents' => 'integer', 'merchandise_cash_cents' => 'integer',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'shipping_quote' => 'array',
            'shipping_weight_grams' => 'integer',
            'commission_basis_points' => 'integer',
            'commission_amount' => 'decimal:2',
            'seller_proceeds' => 'decimal:2',
        ];
    }

    public function coinAllocation(): HasOne
    {
        return $this->hasOne(CoinAllocation::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class);
    }

    public function payout(): HasOne
    {
        return $this->hasOne(SellerPayout::class);
    }

    public function logisticsRemittance(): HasOne
    {
        return $this->hasOne(LogisticsRemittance::class);
    }

    public function parcelReturn(): HasOne
    {
        return $this->hasOne(ParcelReturn::class)->latestOfMany();
    }

    public function parcelReturns(): HasMany
    {
        return $this->hasMany(ParcelReturn::class);
    }
}
