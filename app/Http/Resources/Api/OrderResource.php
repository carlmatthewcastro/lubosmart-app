<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'status' => $this->status, 'payment_method' => $this->payment_method,
            'can_cancel' => $this->status === 'pending' && $this->sellerOrders->every(fn ($parcel) => $parcel->status === 'pending'),
            'subtotal' => $this->subtotal, 'shipping_total' => $this->shipping_total,
            'total' => $this->total, 'currency' => 'PHP',
            'created_at' => $this->created_at?->toISOString(),
            'parcels' => ParcelResource::collection($this->sellerOrders),
        ];
    }
}
