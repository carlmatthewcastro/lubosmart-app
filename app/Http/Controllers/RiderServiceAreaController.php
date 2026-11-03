<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PhilippineLocations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RiderServiceAreaController extends Controller
{
    public function index(Request $request): Response
    {
        $operator = $request->user();
        abort_unless($operator->role === 'logistics' && $operator->canOperate(), 403);

        $centers = $operator->logisticsCenters()->operational()->orderBy('name')->get(['logistics_centers.id', 'name']);
        $riders = User::query()->managedRiders($operator)->where('role', 'rider')
            ->whereIn('logistics_center_id', $centers->pluck('id'))
            ->where('status', 'approved')->whereNotNull('email_verified_at')
            ->orderBy('name')->get(['id', 'name', 'logistics_center_id']);
        $assignments = DB::table('rider_service_area')
            ->join('service_areas', 'service_areas.id', '=', 'rider_service_area.service_area_id')
            ->join('users', 'users.id', '=', 'rider_service_area.rider_id')
            ->join('logistics_centers', 'logistics_centers.id', '=', 'service_areas.logistics_center_id')
            ->whereIn('users.id', $riders->pluck('id'))
            ->whereIn('service_areas.logistics_center_id', $centers->pluck('id'))
            ->whereColumn('users.logistics_center_id', 'service_areas.logistics_center_id')
            ->orderBy('users.name')->orderBy('service_areas.name')->orderBy('service_areas.id')
            ->paginate(20, ['users.id as rider_id', 'users.name as rider_name', 'service_areas.id as area_id',
                'service_areas.name as area_name', 'service_areas.is_active', 'logistics_centers.name as center_name']);

        return Inertia::render('logistics/rider-coverage', compact('centers', 'riders', 'assignments'));
    }

    public function store(Request $request, PhilippineLocations $locations): RedirectResponse
    {
        abort_unless($request->user()->role === 'logistics', 403);
        $data = $request->validate([
            'logistics_center_id' => 'required|integer', 'rider_id' => 'required|integer',
            'province_code' => ['required', 'regex:/^\d{9}$/'],
            'city_code' => ['required', 'regex:/^\d{9}$/'],
            'barangay_code' => ['required', 'regex:/^\d{9}$/'],
        ]);
        abort_unless($request->user()->logisticsCenters()->operational()->where('logistics_centers.id', $data['logistics_center_id'])->exists(), 403);
        $address = $locations->resolve($data['province_code'], $data['city_code'], $data['barangay_code']);
        DB::transaction(function () use ($request, $data, $address) {
            $operator = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($operator->canOperate() && $operator->logisticsCenters()->operational()->where('logistics_centers.id', $data['logistics_center_id'])->exists(), 403);
            $rider = User::query()->managedRiders($operator)->whereKey($data['rider_id'])->where('role', 'rider')->where('logistics_center_id', $data['logistics_center_id'])->where('status', 'approved')->whereNotNull('email_verified_at')->lockForUpdate()->firstOrFail();
            $area = DB::table('service_areas')->where('logistics_center_id', $data['logistics_center_id'])->where('barangay_code', $data['barangay_code'])->lockForUpdate()->first();
            $areaId = $area?->id ?? DB::table('service_areas')->insertGetId([
                'logistics_center_id' => $data['logistics_center_id'], 'code' => (string) Str::uuid(),
                'name' => Str::limit($address['barangay'].', '.$address['city'], 160, ''),
                ...collect($data)->only(['province_code', 'city_code', 'barangay_code'])->all(),
                'province_name' => $address['province'], 'city_name' => $address['city'], 'barangay_name' => $address['barangay'],
                'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('rider_service_area')->updateOrInsert(['rider_id' => $rider->id, 'service_area_id' => $areaId], ['created_at' => now(), 'updated_at' => now()]);
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'user', 'subject_id' => $rider->id, 'action' => 'service_area_assigned', 'changes' => json_encode(['service_area_id' => $areaId]), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Rider service area saved.');
    }
}
