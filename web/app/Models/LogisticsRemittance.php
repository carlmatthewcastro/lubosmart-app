<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogisticsRemittance extends Model
{
    protected $fillable = ['seller_order_id', 'logistics_center_id', 'recorded_by', 'amount_cents', 'reference', 'external_reference', 'received_on', 'notes'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'received_on' => 'date'];
    }
}
