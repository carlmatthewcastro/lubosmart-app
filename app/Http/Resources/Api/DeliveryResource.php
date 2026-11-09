<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $actions = [];
        if ($request->user()?->role === 'rider' && $this->rider_id === $request->user()->id && ! $this->exception_status) {
            $actions = match (true) {
                $this->status === 'assigned' => ['picked_up'],
                $this->status === 'in_transit' && $this->sorted_at && $this->dispatch_prepared_at && ! $this->dispatch_accepted_at => ['accept_dispatch'],
                $this->status === 'in_transit' && $this->dispatch_accepted_at => ['out_for_delivery'],
                $this->status === 'out_for_delivery' => ['delivered', 'failed_attempt'],
                default => [],
            };
        }

        return [
            'id' => $this->id, 'tracking_reference' => $this->tracking_reference,
            'status' => $this->status, 'exception_status' => $this->exception_status,
            'rider_id' => $this->rider_id, 'logistics_center_id' => $this->logistics_center_id,
            'service_area_id' => $this->service_area_id,
            'allowed_actions' => $actions,
            'pickup_address' => $this->sellerOrder->shipping_quote['pickup_address']
                ?? $this->sellerOrder->store->user?->addresses->first()?->only(['line1', 'barangay', 'city', 'province', 'phone']),
            'parcel' => new ParcelResource($this->sellerOrder),
        ];
    }
}
