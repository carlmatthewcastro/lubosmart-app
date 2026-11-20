<?php

namespace App\Services;

use App\Models\SellerOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReturnEligibility
{
    /** Original net values allocated by largest remainder, then cents per unit. */
    public function items(SellerOrder $parcel, ?int $excludingCase = null): array
    {
        $items = $parcel->items()->orderBy('id')->get();
        $gross = $items->sum(fn ($item) => ParcelFinance::cents($item->price_each) * $item->quantity);
        $net = ParcelFinance::cents($parcel->subtotal);
        if ($items->isEmpty() || $net > $gross || $net < 0 || $gross < 0 || $items->contains(fn ($item) => $item->quantity < 1 || ParcelFinance::cents($item->price_each) < 0)) {
            throw ValidationException::withMessages(['items' => 'The original item payment allocation requires finance review.']);
        }
        $allocated = $remainders = [];
        foreach ($items as $item) {
            [$allocated[$item->id], $remainders[$item->id]] = $gross > 0 ? ParcelFinance::proportion($net, ParcelFinance::cents($item->price_each) * $item->quantity, $gross) : [0, 0];
        }
        $left = $net - array_sum($allocated);
        arsort($remainders, SORT_NUMERIC);
        foreach ($remainders as $id => $remainder) {
            if ($left-- <= 0) {
                break;
            }
            $allocated[$id]++;
        }
        $cases = $parcel->parcelReturns()->when($excludingCase, fn ($q) => $q->where('id', '!=', $excludingCase))
            ->whereNotIn('refund_status', ['rejected'])->get();
        // Old whole-parcel cases have no item allocations. Do not infer unused units.
        $legacy = $cases->contains(fn ($case) => ! DB::table('return_items')->where('parcel_return_id', $case->id)->exists());
        $used = DB::table('return_items')->join('parcel_returns', 'parcel_returns.id', '=', 'return_items.parcel_return_id')->whereIn('parcel_return_id', $cases->pluck('id'))
            ->selectRaw("order_item_id, SUM(CASE WHEN refund_status IN ('credited', 'approved_no_refund') THEN COALESCE(approved_quantity, quantity) ELSE quantity END) as quantity")->groupBy('order_item_id')->pluck('quantity', 'order_item_id');

        return $items->map(function ($item) use ($allocated, $used, $legacy) {
            $consumed = $legacy ? $item->quantity : (int) $used->get($item->id, 0);
            $remaining = max(0, $item->quantity - $consumed);
            $base = intdiv($allocated[$item->id], $item->quantity);
            $extra = $allocated[$item->id] % $item->quantity;

            return ['id' => $item->id, 'product_name' => $item->product_name, 'quantity' => $item->quantity,
                'remaining_quantity' => $remaining, 'unit_cents' => $base, 'extra_units' => $extra,
                'consumed_quantity' => $consumed, 'net_cents' => $allocated[$item->id],
                'remaining_cents' => $base * $remaining + max(0, $extra - $consumed)];
        })->all();
    }

    public function select(SellerOrder $parcel, array $selected, ?int $excludingCase = null): array
    {
        $available = collect($this->items($parcel, $excludingCase))->keyBy('id');
        $result = [];
        foreach ($selected as $index => $row) {
            $item = $available->get((int) $row['order_item_id']);
            $quantity = (int) $row['quantity'];
            if (! $item || $quantity < 1 || $quantity > $item['remaining_quantity'] || isset($result[$item['id']])) {
                throw ValidationException::withMessages(["items.$index.quantity" => 'Choose eligible quantities from this parcel; another request may already reserve these items.']);
            }
            $maximum = $item['unit_cents'] * $quantity + min($quantity, max(0, $item['extra_units'] - $item['consumed_quantity']));
            $amount = isset($row['amount']) ? ParcelFinance::cents((string) $row['amount']) : $maximum;
            if ($amount < 0 || $amount > $maximum) {
                throw ValidationException::withMessages(["items.$index.amount" => 'The amount exceeds the selected quantity’s actual paid value.']);
            }
            $result[$item['id']] = ['order_item_id' => $item['id'], 'quantity' => $quantity, 'requested_cents' => $amount];
        }

        return array_values($result);
    }

    public function shippingRemaining(SellerOrder $parcel, ?int $excludingCase = null): int
    {
        $used = $parcel->parcelReturns()->when($excludingCase, fn ($q) => $q->where('id', '!=', $excludingCase))
            ->where('refund_status', '!=', 'rejected')->get()->sum(fn ($case) => $case->refunded_at ? $case->shipping_refund_cents : $case->requested_shipping_cents);

        return max(0, ParcelFinance::cents($parcel->shipping_fee) - $used);
    }
}
