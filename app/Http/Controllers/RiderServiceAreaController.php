<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PhilippineLocations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RiderServiceAreaController extends Controller
{
    public function store(Request $request, PhilippineLocations $locations): RedirectResponse
    {
        abort_unless($request->user()->role === 'sorting_center', 403);
        $data = $request->validate([
            'sorting_center_id' => 'required|integer', 'rider_id' => 'required|integer',
            'province_code' => ['required', 'regex:/^\d{9}$/'],
            'city_code' => ['required', 'regex:/^\d{9}$/'],
            'barangay_code' => ['required', 'regex:/^\d{9}$/'],
        ]);
        abort_unless($request->user()->sortingCenters()->operational()->where('sorting_centers.id', $data['sorting_center_id'])->exists(), 403);
        $address = $locations->resolve($data['province_code'], $data['city_code'], $data['barangay_code']);
        DB::transaction(function () use ($request, $data, $address) {
            $operator = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($operator->canOperate() && $operator->sortingCenters()->operational()->where('sorting_centers.id', $data['sorting_center_id'])->exists(), 403);
            $rider = User::query()->whereKey($data['rider_id'])->where('role', 'courier')->where('sorting_center_id', $data['sorting_center_id'])->where('status', 'approved')->whereNotNull('email_verified_at')->lockForUpdate()->firstOrFail();
            $area = DB::table('service_areas')->where('sorting_center_id', $data['sorting_center_id'])->where('barangay_code', $data['barangay_code'])->lockForUpdate()->first();
            $areaId = $area?->id ?? DB::table('service_areas')->insertGetId([
                'sorting_center_id' => $data['sorting_center_id'], 'code' => (string) Str::uuid(),
                'name' => Str::limit($address['barangay'].', '.$address['city'], 160, ''),
                ...collect($data)->only(['province_code', 'city_code', 'barangay_code'])->all(),
                'province_name' => $address['province'], 'city_name' => $address['city'], 'barangay_name' => $address['barangay'],
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('rider_service_area')->updateOrInsert(['rider_id' => $rider->id, 'service_area_id' => $areaId], ['created_at' => now(), 'updated_at' => now()]);
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'user', 'subject_id' => $rider->id, 'action' => 'service_area_assigned', 'changes' => json_encode(['service_area_id' => $areaId]), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Courier service area saved.');
    }
}
