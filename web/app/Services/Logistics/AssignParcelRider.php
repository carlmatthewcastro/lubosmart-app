<?php

namespace App\Services\Logistics;

use App\Models\Address;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssignParcelRider
{
    public function reassignReturned(User $operator, Delivery $delivery, int $riderId, string $reason): void
    {
        abort_unless($operator->role === 'logistics' && $operator->canOperate() && $operator->logisticsCenters()->operational()->whereKey($delivery->logistics_center_id)->exists(), 403);
        abort_unless($delivery->exception_status === 'returned_to_center' && $delivery->status !== 'delivered' && trim($reason) !== '', 409, 'Receive the undelivered parcel at the facility and record a transfer reason first.');
        $rider = User::query()->managedRiders($operator)->whereKey($riderId)->lockForUpdate()->firstOrFail();
        abort_unless($rider->canRide('delivery') && $rider->logistics_center_id === $delivery->logistics_center_id && $rider->id !== $delivery->rider_id, 403);
        abort_unless(DB::table('rider_service_area')->join('service_areas', 'service_areas.id', '=', 'rider_service_area.service_area_id')->where('rider_id', $rider->id)->where('service_area_id', $delivery->service_area_id)->where('service_areas.is_active', true)->exists(), 409);
        $delivery->update(['rider_id' => $rider->id, 'delivery_rider_id' => $rider->id, 'delivery_assigned_at' => now(), 'exception_status' => 'transfer_pending']);
        DB::table('parcel_assignments')->insert(['delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'assigned_by' => $operator->id,
            'logistics_center_id' => $delivery->logistics_center_id, 'leg' => 'delivery', 'reason' => $reason, 'assigned_at' => now()]);
    }

    /** Called inside the parcel transaction, after the order/delivery/actor locks. */
    public function handle(User $operator, Delivery $delivery, Order $order, int $areaId, int $riderId, ?string $reason = null): void
    {
        abort_unless($operator->role === 'logistics' && $operator->canOperate() && $operator->logisticsCenters()->operational()->whereKey($delivery->logistics_center_id)->exists(), 403);
        $pickup = in_array($delivery->status, ['unassigned', 'assigned'], true) && ! $delivery->picked_up_at;
        abort_unless($pickup || ($delivery->sorted_at && in_array($delivery->status, ['picked_up', 'in_transit'], true)), 409);
        abort_if($delivery->dispatch_accepted_at, 409, 'The delivery rider has already accepted custody.');
        if ($pickup) {
            abort_unless($delivery->pickup_approved_at && $delivery->sellerOrder->status === 'shipped', 409);
        }
        $areas = DB::table('service_areas')->where('logistics_center_id', $delivery->logistics_center_id)->where('is_active', true)->get(['id', 'province_name', 'city_name', 'barangay_name']);
        $area = $areas->firstWhere('id', $areaId);
        $destination = ['province' => $order->shipping_province, 'city' => $order->shipping_city, 'barangay' => $order->shipping_barangay];
        $location = $destination;
        if ($pickup) {
            $location = $delivery->sellerOrder->shipping_quote['pickup_address'] ?? Address::query()->where('user_id', $delivery->sellerOrder->store->user_id)->orderByDesc('is_default')->orderBy('id')->first()?->only(['province', 'city', 'barangay']);
            if (! $location) {
                throw ValidationException::withMessages(['service_area_id' => 'The seller must provide a pickup address before a pickup rider can be assigned.']);
            }
        }
        $matches = fn ($candidate, array $address) => $candidate && collect(['province', 'city', 'barangay'])->every(fn ($part) => mb_strtolower(trim($candidate->{$part.'_name'} ?? '')) === mb_strtolower(trim($address[$part] ?? '')));
        if (! $matches($area, $location)) {
            throw ValidationException::withMessages(['service_area_id' => $pickup ? 'Choose an active service area matching the seller pickup address.' : 'Choose an active service area matching the buyer delivery address.']);
        }
        $destinationArea = $pickup ? $areas->first(fn ($candidate) => $matches($candidate, $destination)) : $area;
        if (! $destinationArea) {
            throw ValidationException::withMessages(['service_area_id' => 'This center needs active coverage for the buyer destination before it can collect the parcel.']);
        }
        $areaIds = collect([$area->id, $destinationArea->id])->unique()->sort()->values();
        $lockedAreas = DB::table('service_areas')->whereIn('id', $areaIds)->where('logistics_center_id', $delivery->logistics_center_id)->where('is_active', true)->orderBy('id')->lockForUpdate()->get(['id']);
        if ($lockedAreas->count() !== $areaIds->count()) {
            throw ValidationException::withMessages(['service_area_id' => 'Coverage changed. Refresh this parcel before assigning a rider.']);
        }
        $rider = User::query()->managedRiders($operator)->whereKey($riderId)->where('role', 'rider')->where('status', 'approved')->whereNotNull('email_verified_at')->where('logistics_center_id', $delivery->logistics_center_id)->lockForUpdate()->first();
        if (! $rider || ! $rider->logisticsCenters()->whereKey($delivery->logistics_center_id)->exists()) {
            throw ValidationException::withMessages(['rider_id' => 'Choose an approved rider assigned to this logistics company.']);
        }
        if (! $rider->canRide($pickup ? 'pickup' : 'delivery')) {
            throw ValidationException::withMessages(['rider_id' => 'This rider does not have the required capability.']);
        }
        if ($delivery->rider_id && ($pickup || $delivery->dispatch_prepared_at) && $delivery->rider_id !== $rider->id && ! trim($reason ?? '')) {
            throw ValidationException::withMessages(['reason' => 'Explain why this assignment is being replaced.']);
        }
        if (! DB::table('rider_service_area')->where('rider_id', $rider->id)->where('service_area_id', $area->id)->exists()) {
            throw ValidationException::withMessages(['rider_id' => $pickup ? 'Choose a rider covering the seller pickup area.' : 'Choose a rider covering the buyer delivery area.']);
        }
        abort_if(! $pickup && $delivery->service_area_id !== $area->id, 409, 'Dispatch must use the sorted destination area.');
        abort_if(! $pickup && $delivery->dispatch_prepared_at && $delivery->rider_id === $rider->id, 409, 'This rider is already assigned.');
        abort_if($pickup && $delivery->status === 'assigned' && $delivery->rider_id === $rider->id, 409, 'This pickup rider is already assigned.');
        $delivery->update([
            ($pickup ? 'pickup_rider_id' : 'delivery_rider_id') => $rider->id,
            ($pickup ? 'pickup_assigned_at' : 'delivery_assigned_at') => now(),
            'rider_id' => $rider->id, 'service_area_id' => $destinationArea->id,
            'status' => $pickup ? 'assigned' : 'in_transit',
            'dispatch_prepared_at' => $pickup ? null : now(), 'dispatch_reference' => $pickup ? null : (string) Str::uuid(), 'dispatch_accepted_at' => null,
        ]);
        DB::table('parcel_assignments')->insert(['delivery_id' => $delivery->id, 'rider_id' => $rider->id,
            'assigned_by' => $operator->id, 'logistics_center_id' => $delivery->logistics_center_id,
            'leg' => $pickup ? 'pickup' : 'delivery', 'reason' => $reason, 'assigned_at' => now()]);
    }
}
