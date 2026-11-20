<?php

namespace App\Services\Demo;

use App\Models\Address;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class DemoPreflight
{
    public function assertEnvironment(): void
    {
        if (! app()->runningInConsole() || (! app()->environment('local', 'testing') && ! config('demo.deployed_enabled'))) {
            throw new RuntimeException('Demo seeding requires CLI execution in local/testing or an explicitly enabled isolated demo deployment.');
        }
        if (app()->environment('local') && DB::getDriverName() === 'mysql'
            && ! in_array(trim((string) DB::connection()->getConfig('host')), ['localhost', '127.0.0.1', '::1'], true)) {
            throw new RuntimeException('Local demo execution refuses a non-loopback database host.');
        }
    }

    public function inspect(): array
    {
        $this->assertEnvironment();
        foreach (['demo_fixtures', 'return_tasks', 'return_items', 'wallet_transactions', 'coin_allocations', 'parcel_assignments', 'cod_receipt_entries'] as $table) {
            if (! Schema::hasTable($table)) {
                throw new RuntimeException('Required migration missing: '.$table.'. Apply reviewed migrations before seeding.');
            }
        }
        $accounts = [];
        foreach (config('demo.primary') as $role => $email) {
            $user = User::query()->where('email', $email)->first();
            if (! $user || $user->role !== $role || ! $user->canOperate()) {
                throw new RuntimeException('Primary '.$role.' missing or ineligible: '.$email.'. Existing identity was preserved; supply missing accounts through approved provisioning.');
            }
            $accounts[$role] = $user;
        }
        if (! $accounts['admin']->canAdmin('finance') || ! $accounts['admin']->canAdmin('disputes')) {
            throw new RuntimeException('Primary administrator requires existing finance and disputes permissions.');
        }
        $center = $accounts['logistics']->logisticsCenters()->operational()
            ->where('company_user_id', $accounts['logistics']->id)->orderBy('logistics_centers.id')->first();
        if (! $center) {
            throw new RuntimeException('Primary logistics company has no existing operational facility.');
        }
        $rider = $accounts['rider'];
        if ($rider->logistics_center_id !== $center->id || ! $rider->canRide('pickup') || ! $rider->canRide('delivery')
            || ! $rider->logisticsCenters()->whereKey($center->id)->exists() || ! DB::table('rider_profiles')->where('user_id', $rider->id)->exists()) {
            throw new RuntimeException('Primary rider requires an approved profile, facility membership and both leg capabilities.');
        }
        $setting = CommerceSetting::query()->find(1);
        if (! $setting || ! $setting->logistics_shipping_enabled || $setting->platform_commission_basis_points === null
            || $setting->return_window_days < 1 || $setting->platform_commission_basis_points < 0 || $setting->platform_commission_basis_points > 10000) {
            throw new RuntimeException('Published shipping, valid commission and return policy must already be configured.');
        }
        $store = $accounts['seller']->store;
        if (! $store || $store->status !== 'approved') {
            throw new RuntimeException('Primary seller requires their existing approved store.');
        }
        $rates = DB::table('service_areas')->join('shipping_rates', 'shipping_rates.service_area_id', '=', 'service_areas.id')
            ->where('service_areas.logistics_center_id', $center->id)->where('service_areas.is_active', true)->where('shipping_rates.is_active', true)
            ->where('service_areas.province_name', 'Laguna')->whereIn('service_areas.city_name', ['Santa Cruz', 'Pagsanjan'])
            ->orderBy('service_areas.id')->get(['service_areas.*', 'shipping_rates.base_fee_cents', 'shipping_rates.included_weight_grams', 'shipping_rates.extra_kg_fee_cents', 'shipping_rates.max_weight_grams']);
        $addresses = [];
        $areas = [];
        foreach (['seller', 'buyer'] as $role) {
            // Match the address preference used by ShippingQuotes; never change a saved address.
            $address = Address::query()->where('user_id', $accounts[$role]->id)->orderByDesc('is_default')->orderBy('id')->first();
            $area = $address ? $rates->first(fn ($rate) => strcasecmp($rate->province_name, $address->province) === 0
                && strcasecmp($rate->city_name, $address->city) === 0 && strcasecmp($rate->barangay_name, $address->barangay) === 0) : null;
            if (! $area || ! preg_match('/^\d{9}$/', $area->barangay_code) || $area->max_weight_grams < 1000
                || $area->base_fee_cents < 0 || $area->included_weight_grams < 1 || $area->extra_kg_fee_cents < 0
                || ! DB::table('rider_service_area')->where('rider_id', $rider->id)->where('service_area_id', $area->id)->exists()) {
                throw new RuntimeException('Primary '.$role.' address needs an existing valid shipping rate and main rider coverage.');
            }
            $addresses[$role] = $address;
            $areas[$role] = $area;
        }
        foreach (DemoCatalog::departments() as $department) {
            if (! Category::query()->where('name', $department)->whereNull('parent_id')->where('is_active', true)->whereHas('children', fn ($q) => $q->where('is_active', true))->exists()) {
                throw new RuntimeException('Required approved catalog department missing: '.$department);
            }
        }
        if ($store->business_category_id !== Category::query()->where('name', 'Books and Media')->value('id')) {
            throw new RuntimeException('Valora department changed; review the book catalog before seeding.');
        }
        if (! config('shop-vouchers.templates.starter-10') || ! config('shop-vouchers.templates.starter-20')) {
            throw new RuntimeException('Approved shop voucher templates are missing.');
        }

        return compact('accounts', 'center', 'setting', 'store', 'addresses', 'areas');
    }
}
