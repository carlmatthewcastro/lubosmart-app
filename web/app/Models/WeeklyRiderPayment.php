<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyRiderPayment extends Model
{
    protected $fillable = ['rider_id', 'logistics_center_id', 'recorded_by', 'period_start', 'period_end', 'amount_cents', 'payment_date', 'payment_reference', 'paid_at', 'paid_by', 'notes'];

    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'period_start' => 'date', 'period_end' => 'date', 'payment_date' => 'date', 'paid_at' => 'datetime'];
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
