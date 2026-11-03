<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParcelReturn extends Model
{
    protected $fillable = ['seller_order_id', 'buyer_id', 'rider_id', 'status', 'reason', 'decision_reason', 'decided_by', 'collected_at', 'received_at', 'condition', 'restocked', 'refund_cents', 'seller_debit_cents', 'commission_reversal_cents', 'refund_reference', 'refunded_by', 'refunded_at'];

    protected function casts(): array
    {
        return ['collected_at' => 'datetime', 'received_at' => 'datetime', 'refunded_at' => 'datetime', 'restocked' => 'boolean', 'refund_cents' => 'integer', 'seller_debit_cents' => 'integer', 'commission_reversal_cents' => 'integer'];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ReturnEvent::class);
    }
}
