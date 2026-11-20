<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnTask extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['buyer_address' => 'array', 'seller_address' => 'array', 'seller_delivered_at' => 'datetime', 'confirmed_at' => 'datetime'];
    }

    public function parcelReturn(): BelongsTo
    {
        return $this->belongsTo(ParcelReturn::class);
    }
}
