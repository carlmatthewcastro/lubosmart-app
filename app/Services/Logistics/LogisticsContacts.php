<?php

namespace App\Services\Logistics;

use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class LogisticsContacts
{
    public function parcels(User $operator): Builder
    {
        return SellerOrder::query()->whereHas('delivery', fn ($query) => $query->whereIn('sorting_center_id', $operator->sortingCenters()->operational()->pluck('sorting_centers.id')));
    }

    public function recipients(User $operator): Builder
    {
        $parcels = $this->parcels($operator)->with(['order:id,buyer_id', 'store:id,user_id'])->get(['id', 'order_id', 'store_id']);
        $ids = $parcels->pluck('order.buyer_id')->merge($parcels->pluck('store.user_id'))->unique();

        return User::query()->where('status', 'approved')->whereNotNull('email_verified_at')->where(fn ($query) => $query
            ->where('role', 'admin')->orWhereIn('id', $ids)->orWhere(fn ($query) => $query->where('role', 'courier')->whereIn('sorting_center_id', $operator->sortingCenters()->operational()->pluck('sorting_centers.id'))));
    }
}
