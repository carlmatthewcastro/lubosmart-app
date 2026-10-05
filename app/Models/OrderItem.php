<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'seller_order_id',
        'product_id',
        'product_name',
        'quantity',
        'price_each',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'price_each' => 'decimal:2',
        ];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
