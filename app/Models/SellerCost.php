<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerCost extends Model
{
    protected $fillable = ['store_id', 'recorded_by', 'incurred_on', 'category', 'description', 'amount_cents', 'void_reason', 'voided_at'];

    protected function casts(): array
    {
        return ['incurred_on' => 'date:Y-m-d', 'voided_at' => 'datetime', 'amount_cents' => 'integer'];
    }
}
