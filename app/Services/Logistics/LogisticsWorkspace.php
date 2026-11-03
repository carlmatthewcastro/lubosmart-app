<?php

namespace App\Services\Logistics;

use App\Models\Delivery;
use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LogisticsWorkspace
{
    public function queueCounts(User $user): array
    {
        $ids = $user->logisticsCenters()->operational()->pluck('logistics_centers.id');
        $parcels = Delivery::query()->whereIn('logistics_center_id', $ids);
        $queues = app(ParcelQueues::class);

        return [
            'pickupRequests' => $queues->filter(clone $parcels, 'pickups')->count(),
            'incoming' => $queues->filter(clone $parcels, 'incoming')->count(),
            'sorting' => $queues->filter(clone $parcels, 'sorting')->count(),
            'dispatch' => $queues->filter(clone $parcels, 'dispatch')->count(),
            'exceptions' => $queues->filter(clone $parcels, 'exceptions')->count(),
            'cash' => $queues->filter(clone $parcels, 'cash')->count(),
            'activeDeliveries' => (clone $parcels)->whereIn('status', ['in_transit', 'out_for_delivery'])->count(),
            'riderApplications' => RegistrationApplication::query()->whereHas('user', fn ($q) => $q->managedRiders($user))->where('requested_role', 'rider')->where('status', 'submitted')->whereIn('logistics_center_id', $ids)->count(),
        ];
    }

    public function data(User $user): array
    {
        $centers = $user->logisticsCenters()->operational()->get(['logistics_centers.id', 'name']);
        $ids = $centers->pluck('id');
        $parcels = Delivery::query()->whereIn('logistics_center_id', $ids);
        $applications = RegistrationApplication::query()->whereHas('user', fn ($q) => $q->managedRiders($user))->where('requested_role', 'rider')->where('status', 'submitted')->whereIn('logistics_center_id', $ids);
        $approvedRiders = User::query()->managedRiders($user)->where('role', 'rider')->whereIn('logistics_center_id', $ids)->where('status', 'approved')->whereNotNull('email_verified_at');
        $riderCount = (clone $approvedRiders)->count();
        $coveredRiders = (clone $approvedRiders)->whereExists(fn ($links) => $links->selectRaw('1')->from('rider_service_area')->join('service_areas', 'service_areas.id', '=', 'rider_service_area.service_area_id')->whereColumn('rider_service_area.rider_id', 'users.id')->whereColumn('service_areas.logistics_center_id', 'users.logistics_center_id')->where('service_areas.is_active', true))->count();
        $rateCount = DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')->whereIn('service_areas.logistics_center_id', $ids)->where('shipping_rates.is_active', true)->where('service_areas.is_active', true)->count();

        return ['centers' => $centers, 'metrics' => $this->queueCounts($user) + [
            'delivered' => (clone $parcels)->where('status', 'delivered')->count(),
            'activeRiders' => $riderCount,
            'publishedRates' => $rateCount,
        ], 'setupChecklist' => [
            ['label' => 'Approved company and operational center', 'complete' => $centers->isNotEmpty(), 'count' => $centers->count(), 'description' => 'Your approved company must be linked to an active center.', 'url' => '/settings/account'],
            ['label' => 'Approved Riders', 'complete' => $riderCount > 0, 'count' => $riderCount, 'description' => 'Activate and approve Riders before assigning parcels.', 'url' => '/logistics/riders'],
            ['label' => 'Riders with active coverage', 'complete' => $coveredRiders > 0, 'count' => $coveredRiders, 'description' => 'Pickup uses the Seller area; delivery uses the Buyer area. Riders need coverage for their assigned leg.', 'url' => '/logistics/rider-coverage'],
            ['label' => 'Published shipping rates', 'complete' => $rateCount > 0, 'count' => $rateCount, 'description' => 'Publish rates for the pickup and destination areas you serve. Each checkout still validates its exact route and weight.', 'url' => '/logistics/shipping-rates'],
        ], 'applications' => $applications->with('user:id,name')->orderBy('submitted_at')->orderBy('id')->limit(5)->get(['id', 'user_id', 'submitted_at']),
            'recentParcels' => $parcels->with(['sellerOrder:id,order_id,store_id', 'sellerOrder.store:id,name', 'rider:id,name'])->latest('id')->limit(6)->get(),
        ];
    }
}
