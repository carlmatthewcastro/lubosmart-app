<?php

namespace App\Http\Resources\Api;

use App\Services\ParcelFinance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParcelResource extends JsonResource
{
    private bool $hideBuyerContacts = false;

    public function limitBuyerContacts(bool $limit): self
    {
        $this->hideBuyerContacts = $limit;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $delivery = $this->delivery;
        $order = $this->order;
        $limited = $this->hideBuyerContacts || ($request->user()?->role === 'seller' && ! $request->routeIs('api.v1.seller.orders.waybill')) || ($request->user()?->role === 'rider' && ! $request->routeIs('api.v1.returns.index') && $delivery && ! $delivery->riderCan($request->user(), 'delivered'));

        return [
            'id' => $this->id, 'order_id' => $this->order_id, 'status' => $this->status,
            'allowed_actions' => $request->user()?->role === 'seller' && $this->store_id === $request->user()->store?->id
                ? match ($this->status) {
                    'pending' => ['processing'], 'processing' => ['shipped'], default => []
                } : [],
            'store' => ['id' => $this->store_id, 'name' => $this->store->name],
            'subtotal' => $this->subtotal, 'shipping_fee' => $this->shipping_fee,
            'discount_amount' => $this->discount_amount, 'currency' => 'PHP',
            'cod_total' => ParcelFinance::decimal(ParcelFinance::expected($this->resource)),
            'cod_due_cents' => ParcelFinance::expected($this->resource),
            'coins_redeemed_cents' => (int) $this->coins_redeemed_cents,
            'merchandise_cash_cents' => ParcelFinance::merchandiseCash($this->resource),
            'items' => $this->items->map(fn ($item) => $item->only([
                'id', 'product_id', 'product_name', 'quantity', 'price_each', 'product_variant_id', 'variant_name',
            ])),
            'recipient' => $limited ? ['name' => $order->shipping_recipient_name, 'city' => $order->shipping_city, 'province' => $order->shipping_province] : [
                'name' => $order->shipping_recipient_name, 'phone' => $order->shipping_phone,
                'line1' => $order->shipping_line1, 'line2' => $order->shipping_line2,
                'barangay' => $order->shipping_barangay, 'city' => $order->shipping_city,
                'province' => $order->shipping_province, 'region' => $order->shipping_region, 'zip' => $order->shipping_zip,
            ],
            'delivery' => $delivery ? [
                'id' => $delivery->id, 'tracking_reference' => $delivery->tracking_reference,
                'fulfillment_status' => $delivery->fulfillment_status,
                'status' => $delivery->status, 'exception_status' => $delivery->exception_status,
                'picked_up_at' => $delivery->picked_up_at?->toISOString(),
                'received_at' => $delivery->received_at?->toISOString(),
                'sorted_at' => $delivery->sorted_at?->toISOString(),
                'dispatch_prepared_at' => $delivery->dispatch_prepared_at?->toISOString(),
                'dispatch_accepted_at' => $delivery->dispatch_accepted_at?->toISOString(),
                'delivered_at' => $delivery->delivered_at?->toISOString(),
                'has_proof' => (bool) $delivery->proof_photo_path,
                'notes' => $delivery->delivery_notes,
            ] : null,
            'seller_proceeds' => $this->when(in_array($request->user()?->role, ['seller', 'admin'], true), $this->seller_proceeds),
            'commission_amount' => $this->when(in_array($request->user()?->role, ['seller', 'admin'], true), $this->commission_amount),
        ];
    }
}
