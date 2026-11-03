<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiderPayment extends Model
{
    protected $fillable = ['delivery_id', 'rider_id', 'logistics_center_id', 'recorded_by', 'leg', 'amount_cents', 'notes', 'payment_reference', 'paid_by', 'paid_at'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'paid_at' => 'datetime'];
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }
}
