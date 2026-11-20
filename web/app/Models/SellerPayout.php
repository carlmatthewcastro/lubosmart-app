<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerPayout extends Model
{
    protected $fillable = ['seller_order_id', 'recorded_by', 'amount_cents', 'reference', 'notes'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer'];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }
}
