<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PhilippineLocations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ShippingRateController extends Controller
{
    public function index(Request $request)
    {
        $centers = $request->user()->sortingCenters()->operational()->get(['sorting_centers.id', 'name']);
        $rates = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')
            ->join('sorting_centers', 'sorting_centers.id', '=', 'service_areas.sorting_center_id')->whereIn('service_areas.sorting_center_id', $centers->pluck('id'))
            ->orderBy('service_areas.name')->orderBy('shipping_rates.id')->get(['shipping_rates.*', 'service_areas.sorting_center_id', 'service_areas.province_code', 'service_areas.city_code', 'service_areas.barangay_code', 'service_areas.name as area_name', 'sorting_centers.name as center_name']);

        return Inertia::render('logistics/shipping-rates', compact('centers', 'rates') + ['pricingEnabled' => (bool) DB::table('commerce_settings')->where('id', 1)->value('logistics_shipping_enabled')]);
    }

    public function store(Request $request, PhilippineLocations $locations)
    {
        $data = $request->validate([
            'sorting_center_id' => 'required|integer', 'province_code' => ['required', 'regex:/^\d{9}$/'], 'city_code' => ['required', 'regex:/^\d{9}$/'], 'barangay_code' => ['required', 'regex:/^\d{9}$/'],
            'base_fee' => 'required|numeric|decimal:0,2|min:0|max:10000', 'included_weight_grams' => 'required|integer|min:1|max:50000',
            'extra_kg_fee' => 'required|numeric|decimal:0,2|min:0|max:10000', 'max_weight_grams' => 'required|integer|gte:included_weight_grams|max:50000', 'is_active' => 'required|boolean',
        ]);
        abort_unless($request->user()->sortingCenters()->operational()->where('sorting_centers.id', $data['sorting_center_id'])->exists(), 403);
        $address = $locations->resolve($data['province_code'], $data['city_code'], $data['barangay_code']);
        DB::transaction(function () use ($request, $data, $address) {
            $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $center = $actor->sortingCenters()->operational()->where('sorting_centers.id', $data['sorting_center_id'])->lockForUpdate()->first();
            abort_unless($actor->canOperate() && $center, 403);
            $area = DB::table('service_areas')->where('sorting_center_id', $center->id)->where('barangay_code', $data['barangay_code'])->first();
            $areaId = $area?->id ?? DB::table('service_areas')->insertGetId([
                'sorting_center_id' => $center->id, 'code' => (string) Str::uuid(), 'name' => Str::limit($address['barangay'].', '.$address['city'], 160, ''),
                ...collect($data)->only(['province_code', 'city_code', 'barangay_code'])->all(), 'province_name' => $address['province'], 'city_name' => $address['city'], 'barangay_name' => $address['barangay'],
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $before = DB::table('shipping_rates')->where('service_area_id', $areaId)->first();
            $values = ['base_fee_cents' => (int) round((float) $data['base_fee'] * 100), 'included_weight_grams' => $data['included_weight_grams'], 'extra_kg_fee_cents' => (int) round((float) $data['extra_kg_fee'] * 100), 'max_weight_grams' => $data['max_weight_grams'], 'is_active' => $data['is_active'], 'updated_at' => now()];
            DB::table('shipping_rates')->updateOrInsert(['service_area_id' => $areaId], $values + ['created_at' => $before?->created_at ?? now()]);
            if ($data['is_active']) {
                DB::table('commerce_settings')->where('id', 1)->update(['logistics_shipping_enabled' => true]);
            }
            DB::table('audit_events')->insert(['actor_id' => $actor->id, 'subject_type' => 'shipping_rate', 'subject_id' => DB::table('shipping_rates')->where('service_area_id', $areaId)->value('id'), 'action' => 'updated', 'changes' => json_encode(['before' => $before, 'after' => $values]), 'occurred_at' => now()]);
        }, 3);

        return back()->with('status', 'Shipping rate saved. Existing orders keep their original fee.');
    }

    public function update(Request $request, int $rate)
    {
        $data = $request->validate(['is_active' => 'required|boolean']);
        DB::transaction(function () use ($request, $rate, $data) {
            $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->canOperate(), 403);
            $record = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')
                ->where('shipping_rates.id', $rate)->whereIn('service_areas.sorting_center_id', $actor->sortingCenters()->operational()->pluck('sorting_centers.id'))->lockForUpdate()->first(['shipping_rates.*']);
            abort_unless($record, 404);
            DB::table('shipping_rates')->where('id', $rate)->update($data + ['updated_at' => now()]);
            if ($data['is_active']) {
                DB::table('commerce_settings')->where('id', 1)->update(['logistics_shipping_enabled' => true]);
            }
            DB::table('audit_events')->insert(['actor_id' => $actor->id, 'subject_type' => 'shipping_rate', 'subject_id' => $rate, 'action' => $data['is_active'] ? 'activated' : 'deactivated', 'changes' => json_encode($data), 'occurred_at' => now()]);
        }, 3);

        return back()->with('status', $data['is_active'] ? 'Shipping rate published.' : 'Shipping rate paused.');
    }
}
