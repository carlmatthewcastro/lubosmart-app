<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommerceSetting extends Model
{
    protected $fillable = [
        'shipping_fee_per_seller_order',
        'platform_commission_basis_points',
    ];

    protected function casts(): array
    {
        return [
            'shipping_fee_per_seller_order' => 'decimal:2',
            'platform_commission_basis_points' => 'integer',
            'logistics_shipping_enabled' => 'boolean',
        ];
    }
}
