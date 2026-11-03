<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreVoucher extends Model
{
    protected $fillable = ['store_id', 'code', 'amount_cents', 'minimum_cents', 'usage_limit', 'expires_at', 'is_active'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'minimum_cents' => 'integer', 'usage_limit' => 'integer', 'expires_at' => 'datetime', 'is_active' => 'boolean'];
    }
}
