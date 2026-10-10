<?php

namespace App\Services\Logistics;

use App\Models\Address;
use App\Models\CommerceSetting;
use App\Models\SortingCenter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShippingQuotes
{
    public function enabled(): bool
    {
        // Draft setup does not interrupt checkout. First publication permanently enables quotes.
        return (bool) CommerceSetting::query()->findOrFail(1)->logistics_shipping_enabled;
    }

    public function options(Address $address, Collection $items, Collection $products): array
    {
        $options = [];
        foreach (SortingCenter::query()->operational()->orderBy('name')->orderBy('id')->get(['id', 'name']) as $center) {
            try {
                $quotes = $this->quote($address, $items, $products, $center->id);
                $options[] = ['id' => $center->id, 'name' => $center->name, 'total' => array_sum(array_column($quotes, 'fee_cents')) / 100, 'parcels' => array_values($quotes)];
            } catch (ValidationException) {
                // A carrier is selectable only if it can serve every parcel in the cart.
            }
        }

        return $options;
    }

    public function quote(Address $address, Collection $items, Collection $products, ?int $centerId): array
    {
        $groups = $items->groupBy(fn ($item) => $products->get($item->product_id)?->store_id);
        if (! $this->enabled()) {
            $fee = (int) round((float) CommerceSetting::query()->findOrFail(1)->shipping_fee_per_seller_order * 100);
            if ($fee < 0) {
                throw ValidationException::withMessages(['shipping_fee' => 'The configured shipping fee cannot be negative.']);
            }

            return $groups->map(fn () => ['fee_cents' => $fee, 'weight_grams' => null, 'center_id' => null, 'area_id' => null, 'basis' => 'legacy_flat'])->all();
        }
        $centerQuery = SortingCenter::query()->operational()->whereKey($centerId);
        if (DB::transactionLevel() > 0) {
            $centerQuery->lockForUpdate();
        }
        $center = $centerQuery->first();
        if (! $center) {
            throw ValidationException::withMessages(['sorting_center_id' => 'Choose an available logistics provider for this address.']);
        }
        $ratesQuery = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')
            ->where('service_areas.sorting_center_id', $center->id)->where('service_areas.is_active', true)->where('shipping_rates.is_active', true)
            ->orderBy('shipping_rates.id');
        if (DB::transactionLevel() > 0) {
            $ratesQuery->lockForUpdate();
        }
        $rates = $ratesQuery->get(['shipping_rates.*', 'service_areas.province_name', 'service_areas.city_name', 'service_areas.barangay_name']);
        $matches = fn ($rate, $location) => mb_strtolower(trim($rate->province_name ?? '')) === mb_strtolower(trim($location->province))
            && mb_strtolower(trim($rate->city_name ?? '')) === mb_strtolower(trim($location->city))
            && mb_strtolower(trim($rate->barangay_name ?? '')) === mb_strtolower(trim($location->barangay));
        $rate = $rates->first(fn ($rate) => $matches($rate, $address));
        if (! $rate) {
            throw ValidationException::withMessages(['sorting_center_id' => 'This provider does not cover the delivery barangay.']);
        }
        $sellerIds = $products->pluck('store.user_id')->filter()->unique();
        $pickupAddresses = Address::query()->whereIn('user_id', $sellerIds)->orderByDesc('is_default')->orderBy('id')->get()->groupBy('user_id');
        $quotes = [];
        foreach ($groups as $storeId => $storeItems) {
            $firstProduct = $products->get($storeItems->first()->product_id);
            $pickup = ($pickupAddresses->get($firstProduct?->store?->user_id) ?? collect())->first();
            if (! $pickup || ! $rates->contains(fn ($rate) => $matches($rate, $pickup))) {
                throw ValidationException::withMessages(['sorting_center_id' => 'This provider does not cover one of the seller pickup addresses.']);
            }
            $weight = 0;
            foreach ($storeItems as $item) {
                $grams = $products->get($item->product_id)?->weight_grams;
                if (! $grams || $grams < 1) {
                    throw ValidationException::withMessages(['shipping_fee' => 'A seller must add the packed product weight before shipping can be quoted.']);
                }
                $weight += $grams * $item->quantity;
            }
            if ($weight > $rate->max_weight_grams) {
                throw ValidationException::withMessages(['shipping_fee' => 'A parcel exceeds this provider’s weight limit. Reduce the quantity or choose another provider.']);
            }
            $extraKg = intdiv(max(0, $weight - $rate->included_weight_grams) + 999, 1000);
            $quotes[$storeId] = ['basis' => 'destination_and_weight', 'center_id' => $center->id, 'provider' => $center->name, 'pickup_address' => $pickup->only(['recipient_name', 'phone', 'line1', 'barangay', 'city', 'province']), 'area_id' => $rate->service_area_id,
                'rate_id' => $rate->id, 'weight_grams' => $weight, 'base_fee_cents' => $rate->base_fee_cents, 'included_weight_grams' => $rate->included_weight_grams,
                'extra_kg_fee_cents' => $rate->extra_kg_fee_cents, 'extra_kg' => $extraKg, 'fee_cents' => $rate->base_fee_cents + $extraKg * $rate->extra_kg_fee_cents];
        }

        return $quotes;
    }
}
