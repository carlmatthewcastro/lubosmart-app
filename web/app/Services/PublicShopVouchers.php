<?php

namespace App\Services;

use App\Models\StoreVoucher;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PublicShopVouchers
{
    public function forStores(array $storeIds, ?int $buyerId = null, ?array $subtotals = null): Collection
    {
        return StoreVoucher::query()->whereIn('store_id', $storeIds)->where('is_public', true)->where('is_active', true)->where('expires_at', '>', now())
            ->whereHas('store', fn ($q) => $q->where('status', 'approved')->whereHas('user', fn ($u) => $u->where('status', 'approved')->whereNotNull('email_verified_at')))
            ->withCount(['redemptions as used_count' => fn ($q) => $q->where('status', '!=', 'cancelled')])->orderByDesc('amount_cents')->orderBy('id')->limit(100)->get()
            ->filter(fn ($voucher) => $voucher->used_count < $voucher->usage_limit)->map(function ($voucher) use ($buyerId, $subtotals) {
                $eligible = null;
                $discount = null;
                if ($subtotals !== null && $buyerId) {
                    try {
                        $discount = app(StoreDiscount::class)->resolve($voucher->code, $subtotals, $buyerId)['cents'];
                        $eligible = true;
                    } catch (ValidationException) {
                        $eligible = false;
                    }
                }

                return ['id' => $voucher->id, 'store_id' => $voucher->store_id, 'code' => $voucher->code, 'amount_cents' => $voucher->amount_cents,
                    'minimum_cents' => $voucher->minimum_cents, 'expires_at' => $voucher->expires_at->toIso8601String(), 'eligible' => $eligible, 'discount_cents' => $discount];
            })->sort(fn ($a, $b) => (($b['discount_cents'] ?? $b['amount_cents']) <=> ($a['discount_cents'] ?? $a['amount_cents'])) ?: $a['id'] <=> $b['id'])->values();
    }
}
