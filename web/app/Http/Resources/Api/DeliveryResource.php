<?php

namespace App\Http\Resources\Api;

use App\Services\DeliveryNotes;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class DeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $actions = $request->user()?->role === 'rider' ? $this->resource->riderActions($request->user()) : [];
        if ($request->user()?->role === 'logistics' && $request->user()->logisticsCenters()->operational()->whereKey($this->logistics_center_id)->exists() && ! $this->exception_status && $this->sellerOrder->status === 'shipped') {
            $actions = match (true) {
                $this->status === 'unassigned' && ! $this->pickup_approved_at => ['approve_pickup'],
                $this->status === 'unassigned' && (bool) $this->pickup_approved_at => ['assign'],
                $this->status === 'picked_up' && ! $this->received_at => ['receive'],
                (bool) $this->received_at && ! $this->sorted_at => ['sort'],
                (bool) $this->sorted_at && ! $this->dispatch_accepted_at => ['assign'],
                default => [],
            };
        }

        return [
            'id' => $this->id, 'tracking_reference' => $this->tracking_reference,
            'fulfillment_status' => $this->fulfillment_status,
            'status' => $this->status, 'exception_status' => $this->exception_status,
            'pickup_rider_id' => $this->pickup_rider_id, 'delivery_rider_id' => $this->delivery_rider_id,
            'custody_type' => $this->custody_type, 'custody_rider_id' => $this->custody_rider_id,
            'rider_id' => $this->rider_id, 'logistics_center_id' => $this->logistics_center_id,
            'service_area_id' => $this->service_area_id,
            'allowed_actions' => $actions,
            'note_suggestions' => collect(['delivered', 'failed_attempt', 'return_to_center'])->mapWithKeys(fn ($action) => [$action => DeliveryNotes::forAction($action)]),
            'pickup_address' => $this->sellerOrder->shipping_quote['pickup_address']
                ?? $this->sellerOrder->store->user?->addresses->first()?->only(['line1', 'barangay', 'city', 'province', 'phone']),
            'history' => $this->when(! $request->routeIs('api.v1.deliveries.index'), fn () => DB::table('parcel_events')->where('delivery_id', $this->id)->orderBy('id')->get(['id', 'type', 'actor_id', 'occurred_at', 'notes'])->map(function ($event) {
                $evidence = json_decode($event->notes ?? '{}', true)['evidence'] ?? [];

                return ['id' => $event->id, 'type' => $event->type, 'actor_id' => $event->actor_id, 'occurred_at' => $event->occurred_at, 'notes' => $evidence['reason'] ?? null, 'has_proof' => ! empty($evidence['proof_path'])];
            })),
            'parcel' => new ParcelResource($this->sellerOrder),
        ];
    }
}
