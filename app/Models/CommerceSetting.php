<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommerceSetting extends Model
{
    protected $fillable = [
        'shipping_fee_per_seller_order',
    ];

    protected function casts(): array
    {
        return [
            'shipping_fee_per_seller_order' => 'decimal:2',
        ];
    }
}
