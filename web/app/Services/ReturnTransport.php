<?php

namespace App\Services;

use App\Models\Address;
use App\Models\ParcelReturn;
use App\Models\ReturnTask;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ReturnTransport
{
    public function eligibleRider(User $actor, ParcelReturn $case, int $id, string $leg, ?array $address): User
    {
        $center = $case->sellerOrder->delivery?->logistics_center_id;
        $rider = User::query()->managedRiders($actor)->whereKey($id)->lockForUpdate()->first();
        if (! $address || ! $rider || ! $rider->canRide($leg) || $rider->logistics_center_id !== $center
            || ! DB::table('rider_service_area')->join('service_areas', 'service_areas.id', '=', 'rider_service_area.service_area_id')
                ->where('rider_id', $id)->where('service_areas.logistics_center_id', $center)->where('service_areas.is_active', true)
                ->whereRaw('LOWER(service_areas.province_name) = ?', [mb_strtolower($address['province'] ?? '')])
                ->whereRaw('LOWER(service_areas.city_name) = ?', [mb_strtolower($address['city'] ?? '')])
                ->whereRaw('LOWER(service_areas.barangay_name) = ?', [mb_strtolower($address['barangay'] ?? '')])->exists()) {
            throw ValidationException::withMessages(['rider_id' => 'Choose an approved rider with the required capability and active coverage for this address.']);
        }

        return $rider;
    }

    public function handle(Request $request, ParcelReturn $source, array $data): void
    {
        $path = null;
        try {
            if ($request->hasFile('proof')) {
                $path = $request->file('proof')->store('return-proofs', 'local');
                if (! $path) {
                    throw ValidationException::withMessages(['proof' => 'The proof could not be stored. Please retry.']);
                }
            }
            DB::transaction(function () use ($request, $source, $data, $path) {
                Store::query()->whereKey($source->sellerOrder->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($source->seller_order_id)->lockForUpdate()->firstOrFail();
                $case = ParcelReturn::query()->whereKey($source->id)->lockForUpdate()->firstOrFail();
                $task = ReturnTask::query()->where('parcel_return_id', $case->id)->lockForUpdate()->first();
                abort_unless($task, 409, 'There is no physical return task for this refund.');
                $actor = $request->user();
                $action = $data['action'];
                $center = $parcel->delivery?->logistics_center_id;
                $operator = $actor->role === 'logistics' && $actor->logisticsCenters()->operational()->whereKey($center)->exists();
                $rider = $actor->role === 'rider' && $case->rider_id === $actor->id && $actor->logistics_center_id === $center && $actor->canOperate();
                $seller = $actor->role === 'seller' && $parcel->store_id === $actor->store?->id;
                if (in_array($action, ['assign', 'assign_seller', 'facility_receive'], true)) {
                    abort_unless($operator, 403);
                } elseif (in_array($action, ['collect', 'accept_seller_dispatch', 'deliver_seller'], true)) {
                    abort_unless($rider, 403);
                } else {
                    abort_unless($seller && in_array($action, ['receive', 'discrepancy'], true), 403);
                }
                $changes = [];
                $next = $task->status;
                if ($action === 'assign') {
                    abort_unless(in_array($task->status, ['approved', 'assigned'], true), 409, 'Collection has already progressed. Refresh this return.');
                    if (! $task->seller_address) {
                        $task->seller_address = Address::query()->where('user_id', $parcel->store->user_id)->orderByDesc('is_default')->first()?->only(['recipient_name', 'phone', 'line1', 'barangay', 'city', 'province']);
                    }
                    if (! $task->seller_address) {
                        throw ValidationException::withMessages(['rider_id' => 'The seller return address is missing. Ask the seller to complete their saved address, then retry assignment.']);
                    }
                    $selected = $this->eligibleRider($actor, $case, (int) $data['rider_id'], 'delivery', $task->buyer_address);
                    $changes = ['rider_id' => $selected->id, 'collection_rider_id' => $selected->id];
                    // A dual-capability rider covering both ends remains selected through the facility.
                    try {
                        $this->eligibleRider($actor, $case, $selected->id, 'pickup', $task->seller_address);
                        $changes['seller_return_rider_id'] = $selected->id;
                    } catch (ValidationException) {
                        $changes['seller_return_rider_id'] = null;
                    }
                    $next = 'assigned';
                } elseif ($action === 'collect') {
                    abort_unless($task->status === 'assigned' && $actor->canRide('delivery'), 409, 'This task is not awaiting your collection.');
                    $this->proof($task, $actor, 'collection', $path, $data);
                    $changes['collected_at'] = now();
                    $next = 'collected';
                } elseif ($action === 'facility_receive') {
                    abort_unless($task->status === 'collected', 409, 'Record collection before facility receipt.');
                    $changes['facility_received_at'] = now();
                    $next = 'facility_received';
                    if ($case->seller_return_rider_id) {
                        try {
                            $this->eligibleRider($actor, $case, $case->seller_return_rider_id, 'pickup', $task->seller_address);
                            $changes['rider_id'] = $case->seller_return_rider_id;
                            $next = 'seller_assigned';
                        } catch (ValidationException) {
                            $changes['seller_return_rider_id'] = null;
                        }
                    }
                } elseif ($action === 'assign_seller') {
                    abort_unless(in_array($task->status, ['facility_received', 'seller_assigned'], true), 409, 'Actual facility receipt is required before seller dispatch.');
                    $selected = $this->eligibleRider($actor, $case, (int) $data['rider_id'], 'pickup', $task->seller_address);
                    $changes = ['rider_id' => $selected->id, 'seller_return_rider_id' => $selected->id];
                    $next = 'seller_assigned';
                } elseif ($action === 'accept_seller_dispatch') {
                    abort_unless($task->status === 'seller_assigned' && $case->seller_return_rider_id === $actor->id && $actor->canRide('pickup'), 409, 'This seller dispatch is not assigned to you.');
                    $changes['seller_dispatched_at'] = now();
                    $next = 'seller_in_transit';
                } elseif ($action === 'deliver_seller') {
                    abort_unless($task->status === 'seller_in_transit' && $case->seller_return_rider_id === $actor->id && $actor->canRide('pickup'), 409, 'Accept seller dispatch before delivery.');
                    $this->proof($task, $actor, 'seller_delivery', $path, $data);
                    $task->seller_delivered_at = now();
                    $next = 'seller_delivered';
                } elseif ($action === 'receive') {
                    abort_unless($task->status === 'seller_delivered' && $task->seller_delivered_at && ! $task->confirmed_at, 409, 'Recorded rider delivery is required; receipt can only be confirmed once.');
                    if (! empty($data['restock'])) {
                        if ($data['condition'] !== 'intact') {
                            throw ValidationException::withMessages(['restock' => 'Only intact returned items can be restocked.']);
                        }
                        $quantities = $case->requestedItems()->where('approved_quantity', '>', 0)->pluck('approved_quantity', 'order_item_id');
                        $items = $parcel->items()->when($case->requestedItems()->exists(), fn ($q) => $q->whereIn('id', $quantities->keys()))->get();
                        $items->each(function ($item) use ($quantities) {
                            $item->quantity = $quantities->get($item->id, $item->quantity);
                        });
                        app(RestorePurchasedStock::class)->handle($items, true);
                    }
                    $changes = ['received_at' => now(), 'condition' => $data['condition'], 'restocked' => (bool) ($data['restock'] ?? false)];
                    $task->confirmed_at = now();
                    $task->confirmed_by = $actor->id;
                    $next = 'received';
                } else {
                    abort_unless(in_array($task->status, ['seller_delivered', 'received'], true), 409, 'A recorded return delivery is required to report a discrepancy.');
                    foreach (app(NotificationInbox::class)->admins('disputes') as $admin) {
                        app(NotificationInbox::class)->send($admin, 'return.discrepancy', 'return:'.$case->id.':'.$task->id, 'Return discrepancy reported', $data['reason'], 'return', $case->id, true);
                    }
                }
                $case->forceFill($changes)->save();
                $task->status = $next;
                $task->save();
                $case->events()->create(['actor_id' => $actor->id, 'action' => $action, 'notes' => $data['reason'], 'evidence_path' => $action === 'discrepancy' ? $path : null]);
                if (isset($changes['rider_id'])) {
                    app(NotificationInbox::class)->send($changes['rider_id'], 'return.assignment', 'return:'.$case->id.':'.$next.':'.$changes['rider_id'], 'Return task assigned', 'Review the return task and recorded handover details.', 'return', $case->id, true);
                }
                if ($next === 'seller_delivered') {
                    app(NotificationInbox::class)->send($parcel->store->user_id, 'return.delivered', 'return:'.$case->id, 'Returned goods delivered', 'Review delivery proof, then confirm receipt or report a discrepancy.', 'return', $case->id, true);
                }
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
    }

    private function proof(ReturnTask $task, User $actor, string $leg, ?string $path, array $data): void
    {
        if (! $path) {
            throw ValidationException::withMessages(['proof' => 'Upload a handover photo before recording this action.']);
        }
        DB::table('return_task_proofs')->insert(['return_task_id' => $task->id, 'leg' => $leg, 'actor_id' => $actor->id,
            'path' => $path, 'recipient_name' => $data['recipient_name'], 'created_at' => now()]);
    }
}
