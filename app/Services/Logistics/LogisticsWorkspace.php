<?php

namespace App\Services\Logistics;

use App\Models\Delivery;
use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class LogisticsWorkspace
{
    public function data(User $user): array
    {
        $centers = $user->sortingCenters()->operational()->get(['sorting_centers.id', 'name']);
        $ids = $centers->pluck('id');
        $parcels = Delivery::query()->whereIn('sorting_center_id', $ids);
        $ready = (clone $parcels)->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped'));
        $applications = RegistrationApplication::query()->where('requested_role', 'courier')->where('status', 'submitted')->whereIn('sorting_center_id', $ids);

        return ['centers' => $centers, 'metrics' => [
            'pickupRequests' => (clone $ready)->where('status', 'unassigned')->whereNull('pickup_approved_at')->count(),
            'incoming' => (clone $parcels)->whereIn('status', ['assigned', 'picked_up', 'in_transit'])->whereNull('received_at')->count(),
            'sorting' => (clone $parcels)->whereNotNull('received_at')->whereNull('sorted_at')->where('status', '!=', 'delivered')->count(),
            'activeDeliveries' => (clone $parcels)->whereIn('status', ['in_transit', 'out_for_delivery'])->count(),
            'delivered' => (clone $parcels)->where('status', 'delivered')->count(),
            'riderApplications' => (clone $applications)->count(),
            'activeRiders' => User::query()->where('role', 'courier')->whereIn('sorting_center_id', $ids)->where('status', 'approved')->whereNotNull('email_verified_at')->count(),
            'publishedRates' => DB::table('shipping_rates')->join('service_areas', 'service_areas.id', '=', 'shipping_rates.service_area_id')->whereIn('service_areas.sorting_center_id', $ids)->where('shipping_rates.is_active', true)->where('service_areas.is_active', true)->count(),
        ], 'applications' => $applications->with('user:id,name')->orderBy('submitted_at')->orderBy('id')->limit(5)->get(['id', 'user_id', 'submitted_at']),
            'recentParcels' => $parcels->with(['sellerOrder:id,order_id,store_id', 'sellerOrder.store:id,name', 'rider:id,name'])->latest('id')->limit(6)->get(),
        ];
    }
}
