<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreVoucher extends Model
{
    protected $fillable = ['is_public', 'store_id', 'code', 'amount_cents', 'minimum_cents', 'usage_limit', 'expires_at', 'is_active'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(SellerOrder::class);
    }

    protected function casts(): array
    {
        return ['is_public' => 'boolean', 'amount_cents' => 'integer', 'minimum_cents' => 'integer', 'usage_limit' => 'integer', 'expires_at' => 'datetime', 'is_active' => 'boolean'];
    }
}
