<?php

namespace App\Services;

use App\Models\SellerOrder;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

class ParcelFinance
{
    // Existing DECIMAL snapshots remain authoritative; arithmetic uses centavos.
    public static function cents(string|int $amount): int
    {
        if (! preg_match('/^(-?)(\d+)(?:\.(\d{1,2}))?$/D', $amount, $parts)) {
            throw new InvalidArgumentException('Money must have at most two decimal places.');
        }

        $value = (int) $parts[2] * 100 + (int) str_pad($parts[3] ?? '', 2, '0');

        return ($parts[1] ?? '') === '-' ? -$value : $value;
    }

    public static function decimal(int $cents): string
    {
        $absolute = abs($cents);

        return ($cents < 0 ? '-' : '').intdiv($absolute, 100).'.'.str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
    }

    public static function commission(int $products, int $basisPoints): int
    {
        if ($products < 0 || $basisPoints < 0 || $basisPoints > 10000) {
            throw new InvalidArgumentException('Invalid commission snapshot.');
        }

        [$whole, $remainder] = self::proportion($products, $basisPoints, 10000);

        return $whole + ($remainder >= 5000 ? 1 : 0);
    }

    /** Exact amount * part / total without overflowing an intermediate product. */
    public static function proportion(int $amount, int $part, int $total): array
    {
        if ($amount < 0 || $part < 0 || $total < 1 || $part > $total) {
            throw new InvalidArgumentException('Invalid monetary allocation.');
        }
        $whole = $remainder = 0;
        foreach (str_split(decbin($amount)) as $bit) {
            $whole *= 2;
            if ($remainder >= $total - $remainder) {
                $remainder -= $total - $remainder;
                $whole++;
            } else {
                $remainder *= 2;
            }
            if ($bit === '1') {
                if ($remainder >= $total - $part) {
                    $remainder -= $total - $part;
                    $whole++;
                } else {
                    $remainder += $part;
                }
            }
        }

        return [$whole, $remainder];
    }

    public static function expected(SellerOrder $parcel): int
    {
        return $parcel->cod_due_cents ?? (self::cents($parcel->subtotal) - (int) $parcel->coins_redeemed_cents + self::cents($parcel->shipping_fee));
    }

    public static function reconciled(SellerOrder $parcel, ?object $cash): bool
    {
        return $parcel->status === 'completed' && $parcel->delivery?->status === 'delivered'
            && $cash && $cash->status === 'reconciled' && $cash->received_amount !== null
            && empty($cash->discrepancy_reason)
            && self::cents((string) $cash->amount) === self::expected($parcel)
            && self::cents((string) $cash->received_amount) === self::expected($parcel);
    }

    public static function reconciledParcels(Builder $query): Builder
    {
        return $query->where('seller_orders.status', 'completed')
            ->whereHas('delivery', fn ($delivery) => $delivery->where('status', 'delivered')
                ->whereExists(fn ($cash) => $cash->selectRaw('1')->from('cod_collections')
                    ->whereColumn('cod_collections.delivery_id', 'deliveries.id')
                    ->where('cod_collections.status', 'reconciled')
                    ->whereNull('cod_collections.discrepancy_reason')
                    ->whereRaw('ROUND(cod_collections.amount * 100) = COALESCE(seller_orders.cod_due_cents, ROUND(seller_orders.subtotal * 100) + ROUND(seller_orders.shipping_fee * 100) - seller_orders.coins_redeemed_cents)')
                    ->whereRaw('ROUND(cod_collections.received_amount * 100) = COALESCE(seller_orders.cod_due_cents, ROUND(seller_orders.subtotal * 100) + ROUND(seller_orders.shipping_fee * 100) - seller_orders.coins_redeemed_cents)')));
    }

    public static function merchandiseCash(SellerOrder $parcel): int
    {
        return $parcel->merchandise_cash_cents ?? (self::cents($parcel->subtotal) - (int) $parcel->coins_redeemed_cents);
    }

    public static function funded(SellerOrder $parcel): bool
    {
        $cashDue = self::merchandiseCash($parcel);
        $cashFunded = $cashDue === 0 || ($parcel->logisticsRemittance && $parcel->logisticsRemittance->amount_cents === $cashDue
            && $parcel->logisticsRemittance->logistics_center_id === $parcel->delivery?->logistics_center_id);
        $coinsFunded = ! $parcel->coins_redeemed_cents || ($parcel->coinAllocation && ! $parcel->coinAllocation->restored_at && $parcel->coinAllocation->amount_cents === $parcel->coins_redeemed_cents);

        return $cashFunded && $coinsFunded;
    }

    public static function fundedParcels(Builder $query): Builder
    {
        return self::reconciledParcels($query)->where(fn ($q) => $q->whereRaw('ROUND(seller_orders.subtotal * 100) - seller_orders.coins_redeemed_cents = 0')
            ->orWhereHas('logisticsRemittance', fn ($r) => $r->whereRaw('logistics_remittances.amount_cents = ROUND(seller_orders.subtotal * 100) - seller_orders.coins_redeemed_cents')
                ->whereExists(fn ($d) => $d->selectRaw('1')->from('deliveries')->whereColumn('deliveries.seller_order_id', 'seller_orders.id')->whereColumn('deliveries.logistics_center_id', 'logistics_remittances.logistics_center_id'))))
            ->where(fn ($q) => $q->where('seller_orders.coins_redeemed_cents', 0)->orWhereHas('coinAllocation', fn ($a) => $a->whereNull('restored_at')->whereColumn('amount_cents', 'seller_orders.coins_redeemed_cents')));
    }

    public static function refundableProducts(SellerOrder $parcel, int $refund): array
    {
        $subtotal = self::cents($parcel->subtotal);
        $products = min($refund, $subtotal);
        $recognized = self::cents($parcel->commission_amount ?? '0.00');
        [$reversal, $remainder] = $subtotal > 0 ? self::proportion($products, min($recognized, $subtotal), $subtotal) : [0, 0];
        $reversal = min($recognized, $reversal + ($subtotal > 0 && $remainder >= intdiv($subtotal, 2) + $subtotal % 2 ? 1 : 0));

        return ['product_refund_cents' => $products, 'shipping_refund_cents' => $refund - $products,
            'commission_reversal_cents' => $reversal, 'seller_debit_cents' => $products - $reversal];
    }
}
