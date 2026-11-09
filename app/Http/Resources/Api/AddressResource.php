<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return $this->resource->only([
            'id', 'label', 'recipient_name', 'phone', 'line1', 'line2',
            'barangay', 'city', 'province', 'region', 'zip', 'is_default',
        ]);
    }
}
