<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoinAllocation extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'restored_at' => 'datetime'];
    }
}
