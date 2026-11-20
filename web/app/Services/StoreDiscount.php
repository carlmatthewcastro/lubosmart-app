<?php

namespace App\Services;

use App\Models\SellerOrder;
use App\Models\StoreVoucher;
use Illuminate\Validation\ValidationException;

class StoreDiscount
{
    public function resolve(?string $code, array $storeSubtotals, int $buyerId, bool $lock = false): array
    {
        if (! $code || trim($code) === '') {
            return ['voucher' => null, 'cents' => 0];
        }
        $query = StoreVoucher::query()->where('code', strtoupper(trim($code)));
        if ($lock) {
            $query->lockForUpdate();
        }
        $voucher = $query->first();
        $subtotal = $voucher ? ($storeSubtotals[$voucher->store_id] ?? 0) : 0;
        if (! $voucher || ! $voucher->is_active || $voucher->expires_at->isPast() || $subtotal < $voucher->minimum_cents || $subtotal <= 0) {
            throw ValidationException::withMessages(['voucher_code' => 'This voucher is unavailable, expired, or does not meet its store minimum.']);
        }
        $uses = SellerOrder::query()->join('orders', 'orders.id', '=', 'seller_orders.order_id')->where('store_voucher_id', $voucher->id)->where('seller_orders.status', '!=', 'cancelled');
        if ($lock) {
            $uses->lockForUpdate();
        }
        $redemptions = $uses->get(['seller_orders.id', 'orders.buyer_id']);
        if ($redemptions->count() >= $voucher->usage_limit || $redemptions->contains('buyer_id', $buyerId)) {
            throw ValidationException::withMessages(['voucher_code' => 'This voucher has reached its limit or you have already used it.']);
        }

        return ['voucher' => $voucher, 'cents' => min($subtotal, $voucher->amount_cents)];
    }
}
