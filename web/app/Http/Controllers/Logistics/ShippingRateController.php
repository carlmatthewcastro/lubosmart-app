<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PhilippineLocations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ShippingRateController extends Controller
{
    public function index(Request $request)
    {
        $centers = $request->user()->logisticsCenters()->operational()->get(['logistics_centers.id', 'name']);
        $rates = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')
            ->join('logistics_centers', 'logistics_centers.id', '=', 'service_areas.logistics_center_id')->whereIn('service_areas.logistics_center_id', $centers->pluck('id'))
            ->orderBy('service_areas.name')->orderBy('shipping_rates.id')->get(['shipping_rates.*', 'service_areas.logistics_center_id', 'service_areas.province_code', 'service_areas.city_code', 'service_areas.barangay_code', 'service_areas.barangay_name', 'service_areas.city_name', 'service_areas.province_name', 'service_areas.name as area_name', 'logistics_centers.name as center_name']);

        return Inertia::render('logistics/shipping-rates', compact('centers', 'rates') + ['pricingEnabled' => (bool) DB::table('commerce_settings')->where('id', 1)->value('logistics_shipping_enabled')]);
    }

    public function store(Request $request, PhilippineLocations $locations)
    {
        $data = $request->validate([
            'rate_id' => 'nullable|integer|min:1',
            'logistics_center_id' => 'required|integer', 'province_code' => ['required', 'regex:/^\d{9}$/'], 'city_code' => ['required', 'regex:/^\d{9}$/'], 'barangay_code' => ['required_without:barangay_codes', 'nullable', 'prohibits:barangay_codes', 'regex:/^\d{9}$/'],
            'barangay_codes' => 'required_without:barangay_code|array|min:1|max:1000|prohibits:barangay_code,rate_id', 'barangay_codes.*' => ['required', 'string', 'distinct', 'regex:/^\d{9}$/'],
            'base_fee' => 'required|numeric|decimal:0,2|min:0|max:10000', 'included_weight_grams' => 'required|integer|min:1|max:50000',
            'extra_kg_fee' => 'required|numeric|decimal:0,2|min:0|max:10000', 'max_weight_grams' => 'required|integer|gte:included_weight_grams|max:50000', 'is_active' => 'required|boolean',
        ]);
        abort_unless($request->user()->logisticsCenters()->operational()->where('logistics_centers.id', $data['logistics_center_id'])->exists(), 403);
        $codes = $data['barangay_codes'] ?? [$data['barangay_code']];
        $addresses = [];
        foreach ($codes as $index => $code) {
            try {
                $addresses[$code] = $locations->resolve($data['province_code'], $data['city_code'], $code);
            } catch (ValidationException $exception) {
                if (isset($data['barangay_codes']) && isset($exception->errors()['barangay_code'])) {
                    throw ValidationException::withMessages(['barangay_codes.'.$index => 'Choose a barangay belonging to the selected province and municipality.']);
                }
                throw $exception;
            }
        }
        DB::transaction(function () use ($request, $data, $addresses) {
            $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $center = $actor->logisticsCenters()->operational()->where('logistics_centers.id', $data['logistics_center_id'])->lockForUpdate()->first();
            abort_unless($actor->canOperate() && $center, 403);
            $existing = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')
                ->where('service_areas.logistics_center_id', $center->id)->whereIn('service_areas.barangay_code', array_keys($addresses))
                ->get(['shipping_rates.id', 'service_areas.barangay_code', 'service_areas.city_code', 'service_areas.province_code']);
            if (! empty($data['rate_id'])) {
                $record = $existing->firstWhere('id', $data['rate_id']);
                abort_unless($record && $record->barangay_code === $data['barangay_code'] && $record->city_code === $data['city_code'] && $record->province_code === $data['province_code'], 404);
            } elseif ($existing->isNotEmpty()) {
                $names = $existing->map(fn ($rate) => $addresses[$rate->barangay_code]['barangay'])->implode(', ');
                throw ValidationException::withMessages([
                    isset($data['barangay_codes']) ? 'barangay_codes' : 'barangay_code' => 'Rates already exist for: '.$names.'. Deselect these barangays or edit their existing rates.',
                ]);
            }
            foreach ($addresses as $code => $address) {
                $data['barangay_code'] = (string) $code;
                $area = DB::table('service_areas')->where('logistics_center_id', $center->id)->where('barangay_code', $data['barangay_code'])->first();
                $areaId = $area?->id ?? DB::table('service_areas')->insertGetId([
                    'logistics_center_id' => $center->id, 'code' => (string) Str::uuid(), 'name' => Str::limit($address['barangay'].', '.$address['city'], 160, ''),
                    ...collect($data)->only(['province_code', 'city_code', 'barangay_code'])->all(), 'province_name' => $address['province'], 'city_name' => $address['city'], 'barangay_name' => $address['barangay'],
                    'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
                ]);
                $before = DB::table('shipping_rates')->where('service_area_id', $areaId)->first();
                $values = ['base_fee_cents' => (int) round((float) $data['base_fee'] * 100), 'included_weight_grams' => $data['included_weight_grams'], 'extra_kg_fee_cents' => (int) round((float) $data['extra_kg_fee'] * 100), 'max_weight_grams' => $data['max_weight_grams'], 'is_active' => $data['is_active'], 'updated_at' => now()];
                DB::table('shipping_rates')->updateOrInsert(['service_area_id' => $areaId], $values + ['created_at' => $before?->created_at ?? now()]);
                if ($data['is_active']) {
                    DB::table('commerce_settings')->where('id', 1)->update(['logistics_shipping_enabled' => true]);
                }
                DB::table('audit_events')->insert(['actor_id' => $actor->id, 'subject_type' => 'shipping_rate', 'subject_id' => DB::table('shipping_rates')->where('service_area_id', $areaId)->value('id'), 'action' => $before ? 'updated' : 'created', 'changes' => json_encode(['before' => $before, 'after' => $values]), 'occurred_at' => now()]);
            }
        }, 3);

        return back()->with('status', count($codes).' shipping '.(count($codes) === 1 ? 'rate' : 'rates').' saved. Existing orders keep their original fee.');
    }

    public function update(Request $request, int $rate)
    {
        $data = $request->validate(['is_active' => 'required|boolean']);
        DB::transaction(function () use ($request, $rate, $data) {
            $actor = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->canOperate(), 403);
            $record = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')
                ->where('shipping_rates.id', $rate)->whereIn('service_areas.logistics_center_id', $actor->logisticsCenters()->operational()->pluck('logistics_centers.id'))->lockForUpdate()->first(['shipping_rates.*']);
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
