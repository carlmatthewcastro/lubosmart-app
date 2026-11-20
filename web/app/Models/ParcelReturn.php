<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ParcelReturn extends Model
{
    public function task(): HasOne
    {
        return $this->hasOne(ReturnTask::class);
    }

    public function requestedItems(): HasMany
    {
        return $this->hasMany(ReturnItem::class);
    }

    public function riderActions(User $rider): array
    {
        if ($rider->role !== 'rider' || $this->rider_id !== $rider->id || $this->sellerOrder->delivery?->logistics_center_id !== $rider->logistics_center_id) {
            return [];
        }

        return match (true) {
            $this->task?->status === 'assigned' && $rider->canRide('delivery') => ['collect'],
            $this->task?->status === 'seller_assigned' && $rider->canRide('pickup') => ['accept_seller_dispatch'],
            $this->task?->status === 'seller_in_transit' && $rider->canRide('pickup') => ['deliver_seller'],
            default => [],
        };
    }

    protected $fillable = ['seller_recovered_cents', 'logistics_recovered_cents', 'refund_offer_id', 'refund_method', 'coins_refunded_cents', 'cash_refunded_cents', 'workflow_version', 'reason_kind', 'description', 'evidence_paths', 'collection_rider_id', 'seller_return_rider_id', 'facility_received_at', 'seller_dispatched_at', 'logistics_debit_cents', 'platform_expense_cents', 'return_shipping_cents', 'seller_order_id', 'buyer_id', 'rider_id', 'status', 'reason', 'decision_reason', 'decided_by', 'collected_at', 'received_at', 'condition', 'restocked', 'refund_cents', 'seller_debit_cents', 'commission_reversal_cents', 'refund_reference', 'refunded_by', 'refunded_at', 'responsibility', 'responsibility_reason', 'responsibility_reviewed_by', 'responsibility_reviewed_at', 'product_refund_cents', 'shipping_refund_cents'];

    protected function casts(): array
    {
        return ['physical_return_required' => 'boolean', 'requested_shipping_cents' => 'integer', 'seller_recovered_cents' => 'integer', 'logistics_recovered_cents' => 'integer', 'refund_offer_id' => 'integer', 'workflow_version' => 'integer', 'coins_refunded_cents' => 'integer', 'cash_refunded_cents' => 'integer', 'evidence_paths' => 'array', 'facility_received_at' => 'datetime', 'seller_dispatched_at' => 'datetime', 'collected_at' => 'datetime', 'received_at' => 'datetime', 'refunded_at' => 'datetime', 'restocked' => 'boolean', 'refund_cents' => 'integer', 'seller_debit_cents' => 'integer', 'commission_reversal_cents' => 'integer', 'responsibility_reviewed_at' => 'datetime', 'product_refund_cents' => 'integer', 'shipping_refund_cents' => 'integer'];
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
