<?php

namespace App\Http\Controllers;

use App\Http\Resources\Api\DeliveryResource;
use App\Models\CommerceSetting;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\User;
use App\Notifications\OrderDeliveryUpdated;
use App\Services\Admin\AuditLogger;
use App\Services\DeliveryNotes;
use App\Services\Logistics\AssignParcelRider;
use App\Services\Logistics\ParcelQueues;
use App\Services\Notifications\ParcelNotifications;
use App\Services\ParcelFinance;
use App\Services\Rider\RiderWorkspace;
use App\Services\SellerBuyerPrivacy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DeliveryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->canOperate(), 403);
        abort_unless(in_array($user->role, ['rider', 'logistics', 'admin']), 403);
        $scanning = $request->routeIs('logistics.scan');
        abort_if($scanning && $user->role !== 'logistics', 403);
        $centers = $user->logisticsCenters()->operational()->get(['logistics_centers.id', 'name']);
        $relations = ['sellerOrder.items.product:id,image_path', 'sellerOrder.order', 'sellerOrder.store:id,name,user_id', 'sellerOrder.store.user:id,name', 'sellerOrder.store.user.addresses:id,user_id,line1,barangay,city,province,phone', 'rider:id,name'];
        $query = Delivery::query()->with($relations)->with(['sellerOrder.store.user.addresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')]);
        if ($user->role === 'rider') {
            $query->forRider($user);
            if ($request->input('workspace') === 'pickup') {
                $query->where(fn ($q) => $q->where('pickup_rider_id', $user->id)->orWhere(fn ($q) => $q->whereNull('pickup_rider_id')->where('rider_id', $user->id)->whereNull('received_at')));
            }
            if ($request->input('workspace') === 'delivery') {
                $query->where(fn ($q) => $q->where('delivery_rider_id', $user->id)->orWhere(fn ($q) => $q->whereNull('delivery_rider_id')->where('rider_id', $user->id)->whereNotNull('dispatch_prepared_at')));
            }
        } elseif ($user->role === 'logistics') {
            $query->whereIn('logistics_center_id', $centers->pluck('id'));
        }
        $stages = $user->role === 'rider' ? RiderWorkspace::QUEUES : ParcelQueues::STAGES;
        $filters = $request->validate(['workspace' => 'nullable|in:pickup,delivery', 'stage' => ['nullable', Rule::in($stages)], 'search' => 'nullable|string|max:100']);
        if ($user->role === 'rider') {
            app(RiderWorkspace::class)->filter($query, $filters['stage'] ?? 'all');
        }
        if ($scanning) {
            $query->where('tracking_reference', strtoupper(trim($filters['search'] ?? '')));
        } else {
            $query->when($filters['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q->where('tracking_reference', strtoupper(trim($search)))->orWhereHas('sellerOrder.store', fn ($q) => $q->where('name', 'like', '%'.$search.'%'))));
        }
        if ($user->role === 'logistics' && ! $scanning) {
            app(ParcelQueues::class)->filter($query, $filters['stage'] ?? 'all');
        }
        $deliveries = $query->latest('id')->paginate(10)->withQueryString();
        $available = ! $scanning && $user->role === 'logistics' && $centers->isNotEmpty()
            ? Delivery::query()->whereNull('logistics_center_id')->where('status', 'unassigned')->whereHas('sellerOrder', fn ($q) => $q->where('status', 'shipped'))
                ->when($filters['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q->where('tracking_reference', strtoupper(trim($search)))->orWhereHas('sellerOrder.store', fn ($q) => $q->where('name', 'like', '%'.$search.'%'))))
                ->with($relations)->with(['sellerOrder.store.user.addresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')])->latest('id')->limit(50)->get()
            : [];
        foreach (collect($deliveries->items())->merge($available) as $parcel) {
            $parcel->sellerOrder->items->each(function ($item) {
                $item->setAttribute('product_image_url', $item->product?->image_url);
                $item->unsetRelation('product');
            });
            $parcel->ensureTrackingReference();
            if ($user->role === 'rider' && ! $parcel->riderCan($user, 'delivered')) {
                SellerBuyerPrivacy::minimize($parcel->sellerOrder->order);
                $parcel->makeHidden(['proof_photo_path']);
            }
            $store = $parcel->sellerOrder->store;
            $store->setAttribute('pickup_address', $store->user?->addresses->first()?->only(['line1', 'barangay', 'city', 'province', 'phone']));
            $store->unsetRelation('user');
        }
        $riders = $user->role === 'logistics' ? User::query()->managedRiders($user)->where('role', 'rider')->where('status', 'approved')->whereNotNull('email_verified_at')
            ->whereIn('logistics_center_id', $centers->pluck('id'))->get(['id', 'name', 'logistics_center_id', 'rider_capability']) : collect();
        $areaLinks = DB::table('rider_service_area')->whereIn('rider_id', $riders->pluck('id'))->get()->groupBy('rider_id');
        $riders->each(fn ($rider) => $rider->setAttribute('service_area_ids', ($areaLinks->get($rider->id) ?? collect())->pluck('service_area_id')));
        $areas = DB::table('service_areas')->whereIn('logistics_center_id', $centers->pluck('id'))->where('is_active', true)->orderBy('name')->get(['id', 'name', 'logistics_center_id', 'province_name', 'city_name', 'barangay_name']);
        $cod = DB::table('cod_collections')->whereIn('delivery_id', $deliveries->pluck('id'))->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id))->get()->keyBy('delivery_id');
        $events = DB::table('parcel_events')->join('users', 'users.id', '=', 'parcel_events.actor_id')
            ->whereIn('delivery_id', $deliveries->pluck('id'))->orderBy('parcel_events.id')
            ->get(['parcel_events.id', 'delivery_id', 'type', 'notes', 'occurred_at', 'users.name as actor_name'])
            ->map(function ($event) {
                $evidence = json_decode($event->notes ?? '{}', true)['evidence'] ?? [];
                $event->has_proof = ! empty($evidence['proof_path']);
                $event->details = collect(['reason' => 'Notes', 'receipt_condition' => 'Condition', 'sorting_bin' => 'Bin / route', 'amount' => 'Actual amount (PHP)', 'handover_reference' => 'Cash reference', 'recipient_name' => 'Recipient'])
                    ->filter(fn ($label, $key) => isset($evidence[$key]) && $evidence[$key] !== '')
                    ->map(fn ($label, $key) => $label.': '.$evidence[$key])->values();

                return $event;
            })->groupBy('delivery_id');
        foreach ($deliveries as $parcel) {
            $parcel->setAttribute('allowed_actions', $user->role === 'rider' ? $parcel->riderActions($user) : []);
            $cashEvent = $events->get($parcel->id, collect())->last(fn ($event) => in_array($event->type, ['submit_cod_handover', 'cod_discrepancy', 'receive_cod'], true));
            if ($collection = $cod->get($parcel->id)) {
                $submission = $cashEvent?->type === 'submit_cod_handover' ? (json_decode($cashEvent->notes, true)['evidence'] ?? []) : [];
                $collection->expected_handover_amount = $submission['amount'] ?? $collection->amount;
                $collection->expected_handover_reference = $submission['handover_reference'] ?? 'COD-'.$collection->reference;
            }
            if ($user->role === 'rider' && $parcel->status === 'delivered' && ! $parcel->exception_status
                && $parcel->riderCan($user, 'delivered') && $cod->get($parcel->id)?->status === 'collected'
                && $cashEvent?->type !== 'submit_cod_handover') {
                $parcel->setAttribute('allowed_actions', [...$parcel->allowed_actions, 'submit_cod_handover']);
            }
            $parcel->setAttribute('events', $events->get($parcel->id, collect())->filter(fn ($event) => $user->role !== 'rider' || $parcel->riderCan($user, 'delivered') || in_array($event->type, ['assign', 'picked_up', 'receive', 'sort'], true))->values());
        }

        $page = $scanning ? 'logistics/scan' : ($user->role === 'logistics' ? 'logistics/parcels' : 'marketplace/deliveries');

        return Inertia::render($page, compact('deliveries', 'available', 'centers', 'riders', 'areas', 'cod', 'filters') + ['role' => $user->role, 'noteSuggestions' => collect(['delivered', 'failed_attempt', 'return_to_center'])->mapWithKeys(fn ($action) => [$action => DeliveryNotes::forAction($action)])]);
    }

    public function update(Request $request, Delivery $delivery)
    {
        $data = $request->validate([
            'action' => 'required|in:exception_assign,accept_transfer,claim,approve_pickup,receive,sort,assign,accept_dispatch,picked_up,in_transit,out_for_delivery,delivered,submit_cod_handover,receive_cod,reconcile_cod,failed_attempt,hold,retry,return_to_center,receive_return',
            'logistics_center_id' => 'nullable|integer', 'rider_id' => 'nullable|integer',
            'service_area_id' => 'required_if:action,assign,sort|nullable|integer',
            'proof' => 'nullable|image|mimes:jpg,jpeg,png|max:5120',
            'tracking_reference' => 'nullable|string|max:40',
            'capture_method' => 'nullable|in:scanner,manual',
            'reason' => 'nullable|string|max:1000',
            'note' => 'nullable|string|max:150',
            'remarks' => 'nullable|string|max:500',
            'cod_confirmed' => 'nullable|boolean',
            'report_discrepancy' => 'nullable|boolean',
            'receipt_condition' => 'required_if:action,receive,receive_return|nullable|in:intact,damaged',
            'sorting_bin' => 'required_if:action,sort|nullable|string|max:80',
            'amount' => 'nullable|numeric|decimal:0,2|min:0|max:99999999.99',
            'handover_reference' => 'nullable|string|max:100',
            'recipient_name' => 'nullable|string|max:150',
            'request_key' => $request->routeIs('api.v1.*') ? 'required|uuid' : 'nullable|uuid',
        ]);
        $path = null;
        try {
            DB::transaction(function () use ($request, $delivery, $data, &$path) {
                // Lock the parent first: all deliveries of a split order share its completion status.
                $orderId = $delivery->sellerOrder->order_id;
                $order = Order::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::query()->whereKey($delivery->id)->lockForUpdate()->firstOrFail();
                $sellerOrder = SellerOrder::query()->whereKey($delivery->seller_order_id)->lockForUpdate()->firstOrFail();
                $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                abort_unless($user->canOperate(), 403);
                $action = $data['action'];
                $previous = $delivery->only(['status', 'rider_id', 'exception_status', 'service_area_id']);
                $custodyBefore = $this->custody($delivery);
                if (in_array($action, ['exception_assign', 'claim', 'approve_pickup', 'receive', 'sort', 'assign', 'receive_cod', 'hold', 'retry', 'return_to_center', 'receive_return'])) {
                    abort_unless($user->role === 'logistics', 403);
                    $centerId = $action === 'claim' ? ($data['logistics_center_id'] ?? null) : $delivery->logistics_center_id;
                    abort_unless($centerId && $user->logisticsCenters()->where('logistics_centers.id', $centerId)->operational()->exists(), 403);
                } elseif ($action === 'reconcile_cod') {
                    abort_unless($user->canAdmin('finance'), 403);
                } else {
                    // Preserve the existing conflict response for a dual-capability pickup rider
                    // attempting a later stage before a delivery assignment exists. State/custody
                    // checks below still forbid every delivery effect until authorized dispatch.
                    $awaitingDispatch = $delivery->rider_id === $user->id && ! $delivery->delivery_rider_id
                        && ! $delivery->dispatch_prepared_at && $user->canRide('delivery')
                        && $delivery->logistics_center_id === $user->logistics_center_id;
                    abort_unless($user->role === 'rider' && ($delivery->riderCan($user, $action) || $awaitingDispatch), 403);
                    abort_unless($user->logisticsCenters()->where('logistics_centers.id', $delivery->logistics_center_id)->operational()->exists(), 403);
                }
                if (! empty($data['request_key'])) {
                    $existing = DB::table('parcel_events')->where('reference', $data['request_key'])->first();
                    if ($existing) {
                        abort_unless($existing->delivery_id === $delivery->id && $existing->actor_id === $user->id && (json_decode($existing->notes ?? '{}', true)['operation'] ?? null) === $action, 409);

                        return;
                    }
                }
                abort_if($sellerOrder->status === 'cancelled' || $order->status === 'cancelled', 409, 'This order has been cancelled.');
                if (in_array($action, ['picked_up', 'receive', 'accept_dispatch', 'receive_return', 'accept_transfer'])) {
                    if (($data['tracking_reference'] ?? '') !== $delivery->ensureTrackingReference()) {
                        throw ValidationException::withMessages(['tracking_reference' => 'Invalid or unrecognized QR code. Scan the label attached to this parcel.']);
                    }
                    if (in_array($action, ['picked_up', 'receive', 'accept_dispatch', 'accept_transfer'], true) && ($data['capture_method'] ?? null) !== 'scanner') {
                        throw ValidationException::withMessages(['capture_method' => 'Scan the parcel QR code to complete this checkpoint. Manual lookup does not confirm custody.']);
                    }
                    if (! in_array($data['capture_method'] ?? null, ['scanner', 'manual'], true) || (($data['capture_method'] ?? '') === 'manual' && empty($data['reason']))) {
                        throw ValidationException::withMessages(['reason' => 'Choose a capture method and explain any manual tracking entry.']);
                    }
                }
                $checkpoint = ['picked_up' => 'pickup', 'receive' => 'hub_receipt', 'accept_dispatch' => 'handover'][$action] ?? null;
                if ($checkpoint) {
                    abort_if($delivery->status === 'delivered', 409, 'This delivery has already been completed.');
                    $completed = match ($action) {
                        'picked_up' => (bool) $delivery->picked_up_at,
                        'receive' => (bool) $delivery->received_at,
                        'accept_dispatch' => (bool) $delivery->dispatch_accepted_at,
                    };
                    abort_if($completed || DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('forward_checkpoint', $checkpoint)->exists(), 409, 'This checkpoint has already been completed.');
                }
                if (in_array($action, ['delivered', 'failed_attempt', 'return_to_center'], true)) {
                    if (! in_array($data['note'] ?? '', DeliveryNotes::forAction($action), true)) {
                        throw ValidationException::withMessages(['note' => 'Select a note matching this delivery action.']);
                    }
                    if ($data['note'] === 'Other / Custom notes' && empty(trim($data['reason'] ?? ''))) {
                        throw ValidationException::withMessages(['reason' => 'Enter your custom delivery notes.']);
                    }
                    $data['reason'] = ($data['note'] === 'Other / Custom notes' ? trim($data['reason']) : $data['note']).(! empty(trim($data['remarks'] ?? '')) ? ' '.$data['remarks'] : '');
                }
                if ($delivery->exception_status && ! in_array($action, ['hold', 'retry', 'return_to_center', 'receive_return', 'exception_assign', 'accept_transfer'], true)) {
                    abort(409, 'Resolve the parcel exception before continuing.');
                }
                if ($action === 'submit_cod_handover') {
                    $collection = DB::table('cod_collections')->where('delivery_id', $delivery->id)->lockForUpdate()->first();
                    abort_unless($collection && $collection->rider_id === $user->id, 403);
                    abort_unless($delivery->status === 'delivered' && $collection->status === 'collected', 409, 'Only collected COD can be submitted for handover.');
                    $cashEvent = DB::table('parcel_events')->where('delivery_id', $delivery->id)
                        ->whereIn('type', ['submit_cod_handover', 'cod_discrepancy', 'receive_cod'])->latest('id')->first();
                    if ($cashEvent?->type === 'submit_cod_handover') {
                        return;
                    }
                    $amount = ParcelFinance::decimal(ParcelFinance::cents((string) $collection->amount));
                    $reference = 'COD-'.$collection->reference;
                    if ((isset($data['amount']) && ParcelFinance::cents((string) $data['amount']) !== ParcelFinance::cents($amount))
                        || (! empty($data['handover_reference']) && $data['handover_reference'] !== $reference)) {
                        throw ValidationException::withMessages(['amount' => 'The COD amount and reference are fixed by the recorded collection.']);
                    }
                    $data['amount'] = $amount;
                    $data['handover_reference'] = $reference;
                    // Record the rider declaration only; Logistics must independently verify receipt.
                } elseif ($action === 'exception_assign') {
                    app(AssignParcelRider::class)->reassignReturned($user, $delivery, (int) ($data['rider_id'] ?? 0), $data['reason'] ?? '');
                } elseif ($action === 'accept_transfer') {
                    abort_unless($delivery->exception_status === 'transfer_pending', 409);
                    $delivery->update(['exception_status' => null, 'status' => 'in_transit']);
                } elseif ($action === 'claim') {
                    abort_unless(! $delivery->logistics_center_id && $delivery->status === 'unassigned' && $sellerOrder->status === 'shipped', 409);
                    $delivery->forceFill(['logistics_center_id' => $centerId, 'pickup_approved_at' => now()])->save();
                } elseif ($action === 'approve_pickup') {
                    abort_unless($delivery->status === 'unassigned' && ! $delivery->pickup_approved_at && $sellerOrder->status === 'shipped', 409);
                    $delivery->update(['pickup_approved_at' => now()]);
                } elseif ($action === 'receive') {
                    abort_unless(in_array($delivery->status, ['picked_up', 'in_transit'], true) && $delivery->picked_up_at && ! $delivery->received_at, 409, 'Pickup must be confirmed before hub receipt.');
                    $delivery->update(['received_at' => now(), 'receipt_condition' => $data['receipt_condition'], 'exception_status' => $data['receipt_condition'] === 'damaged' ? 'held' : null]);
                } elseif ($action === 'sort') {
                    abort_unless($delivery->received_at && ! $delivery->sorted_at && in_array($delivery->status, ['picked_up', 'in_transit'], true), 409);
                    $this->destinationArea($data['service_area_id'], $delivery, $order);
                    $delivery->update(['sorted_at' => now(), 'service_area_id' => $data['service_area_id'], 'sorting_bin' => $data['sorting_bin']]);
                } elseif ($action === 'assign') {
                    $data['assignment_leg'] = ! $delivery->picked_up_at ? 'pickup' : 'delivery';
                    app(AssignParcelRider::class)->handle($user, $delivery, $order, (int) $data['service_area_id'], (int) ($data['rider_id'] ?? 0), $data['reason'] ?? null);
                } elseif ($action === 'accept_dispatch') {
                    abort_unless($delivery->received_at && $delivery->sorted_at && $delivery->dispatch_prepared_at && ! $delivery->dispatch_accepted_at && $delivery->status === 'in_transit', 409);
                    $delivery->update(['dispatch_accepted_at' => now()]);
                } elseif (in_array($action, ['failed_attempt', 'hold', 'retry', 'return_to_center', 'receive_return'], true)) {
                    if (empty($data['reason'])) {
                        throw ValidationException::withMessages(['reason' => 'Record the reason and physical custody details for this decision.']);
                    }
                    if ($action === 'failed_attempt') {
                        abort_unless($delivery->status === 'out_for_delivery', 409);
                        if ($request->hasFile('proof')) {
                            $path = $request->file('proof')->store('delivery-proofs', 'local');
                            if (! $path) {
                                throw ValidationException::withMessages(['proof' => 'The photo could not be stored. Please retry.']);
                            }
                            $data['proof_path'] = $path;
                        }
                        $delivery->update(['exception_status' => 'failed_attempt']);
                    } elseif ($action === 'hold') {
                        abort_unless($delivery->exception_status && $delivery->exception_status !== 'returned_to_center', 409);
                        $delivery->update(['exception_status' => 'held']);
                    } elseif ($action === 'return_to_center') {
                        abort_unless(in_array($delivery->exception_status, ['failed_attempt', 'held'], true), 409);
                        abort_unless($this->custody($delivery)['party'] === 'rider', 409, 'This parcel is already in center custody. Escalate it for review.');
                        $delivery->update(['exception_status' => 'return_requested']);
                    } elseif ($action === 'receive_return') {
                        abort_unless($delivery->exception_status === 'return_requested', 409);
                        $delivery->update(['exception_status' => 'returned_to_center', 'receipt_condition' => $data['receipt_condition']]);
                    } else {
                        abort_unless(in_array($delivery->exception_status, ['failed_attempt', 'held', 'returned_to_center'], true), 409);
                        abort_if($delivery->receipt_condition === 'damaged', 409, 'Damaged parcels require escalation; retry is not permitted.');
                        // A logistics retry confirms physical re-handover to the same assigned rider.
                        // The original forward checkpoints and their timestamps remain immutable.
                        $delivery->update(['status' => 'in_transit', 'exception_status' => null]);
                    }
                } elseif (in_array($action, ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'])) {
                    $expected = ['picked_up' => 'assigned', 'in_transit' => 'picked_up', 'out_for_delivery' => 'in_transit', 'delivered' => 'out_for_delivery'][$action];
                    abort_unless($delivery->status === $expected, 409, 'This parcel has already changed. Refresh the page.');
                    $changes = ['status' => $action];
                    if ($action === 'picked_up') {
                        abort_unless($delivery->pickup_approved_at && $sellerOrder->status === 'shipped', 409, 'This parcel is not ready for pickup.');
                    }
                    if (in_array($action, ['in_transit', 'out_for_delivery'], true)) {
                        abort_unless($delivery->sorted_at, 409, 'The logistics company must receive and sort this parcel before dispatch.');
                    }
                    if ($delivery->sorted_at && in_array($action, ['in_transit', 'out_for_delivery'], true)) {
                        abort_unless($delivery->dispatch_accepted_at, 409, 'Accept the dispatch handover before starting delivery.');
                    }
                    if ($action === 'picked_up') {
                        $changes['picked_up_at'] = now();
                    }
                    if ($action === 'delivered') {
                        abort_unless($delivery->picked_up_at && $delivery->received_at && $delivery->sorted_at && $delivery->dispatch_accepted_at, 409, 'This parcel is not ready for delivery completion.');
                        if (! $request->hasFile('proof')) {
                            throw ValidationException::withMessages(['proof' => 'Upload a delivery photo before confirming delivery and COD collection.']);
                        }
                        $path = $request->file('proof')->store('delivery-proofs', 'local');
                        if (! $path) {
                            throw ValidationException::withMessages(['proof' => 'The photo could not be stored. Please retry.']);
                        }
                        if (! trim($data['recipient_name'] ?? '')) {
                            throw ValidationException::withMessages(['recipient_name' => 'Enter the name of the person receiving the parcel.']);
                        }
                        $policy = CommerceSetting::query()->whereKey(1)->lockForUpdate()->firstOrFail();
                        $changes += ['delivered_at' => now(), 'proof_photo_path' => $path, 'return_window_days' => $policy->return_window_days];
                        $cents = ParcelFinance::expected($sellerOrder);
                        if ($cents > 0 && ! $request->boolean('cod_confirmed')) {
                            throw ValidationException::withMessages(['cod_confirmed' => 'Confirm receipt of the full COD payment before completing delivery.']);
                        }
                        $data['amount'] = ParcelFinance::decimal($cents);
                        DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $user->id, 'reference' => (string) Str::uuid(), 'amount' => ParcelFinance::decimal($cents), 'status' => 'collected', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
                        $subtotalCents = ParcelFinance::cents((string) $sellerOrder->subtotal);
                        $rate = $sellerOrder->commission_basis_points ?? CommerceSetting::query()->findOrFail(1)->platform_commission_basis_points;
                        $commissionCents = ParcelFinance::commission($subtotalCents, $rate);
                        $sellerOrder->update(['status' => 'completed', 'commission_basis_points' => $rate, 'commission_amount' => ParcelFinance::decimal($commissionCents), 'seller_proceeds' => ParcelFinance::decimal($subtotalCents - $commissionCents)]);
                        if (! SellerOrder::query()->where('order_id', $order->id)->where('status', '!=', 'completed')->exists()) {
                            $order->update(['status' => 'completed']);
                        }
                    }
                    $delivery->update($changes);
                    $recipients = User::query()->whereIn('id', [$order->buyer_id, $sellerOrder->store->user_id])->get();
                    foreach ($recipients as $recipient) {
                        $recipient->notify(new OrderDeliveryUpdated($order->id, $sellerOrder->id, $action));
                    }
                } else {
                    $collection = DB::table('cod_collections')->where('delivery_id', $delivery->id)->lockForUpdate()->first();
                    $receivable = $collection && ($collection->status === 'collected' || ($collection->status === 'handed_over' && $collection->received_amount === null));
                    abort_unless($collection && ($action === 'receive_cod' ? $receivable : $collection->status === 'handed_over'), 409);
                    if ($action === 'reconcile_cod') {
                        $expectedCod = ParcelFinance::expected($sellerOrder);
                        abort_unless($sellerOrder->status === 'completed' && $delivery->status === 'delivered'
                            && empty($collection->discrepancy_reason) && $collection->received_amount !== null
                            && ParcelFinance::cents((string) $collection->received_amount) === $expectedCod
                            && ParcelFinance::cents((string) $collection->amount) === $expectedCod,
                            409, 'Verify the full cash handover against the delivered parcel before reconciliation.');
                    }
                    if ($action === 'receive_cod') {
                        $submission = DB::table('parcel_events')->where('delivery_id', $delivery->id)
                            ->whereIn('type', ['submit_cod_handover', 'cod_discrepancy', 'receive_cod'])->latest('id')->first();
                        if ($submission?->type === 'submit_cod_handover') {
                            $submitted = json_decode($submission->notes, true)['evidence'];
                            if (! empty($data['handover_reference']) && $data['handover_reference'] !== $submitted['handover_reference']) {
                                throw ValidationException::withMessages(['handover_reference' => 'Use the fixed rider handover reference.']);
                            }
                            if (empty($data['report_discrepancy']) && isset($data['amount']) && ParcelFinance::cents((string) $data['amount']) !== ParcelFinance::cents((string) $submitted['amount'])) {
                                throw ValidationException::withMessages(['amount' => 'Confirm the fixed rider submission or report a cash discrepancy.']);
                            }
                            if (empty($data['report_discrepancy'])) {
                                $data['amount'] = $submitted['amount'];
                            }
                            $data['handover_reference'] = $submitted['handover_reference'];
                        }
                        if (! isset($data['amount']) || empty($data['handover_reference'])) {
                            throw ValidationException::withMessages(['amount' => 'Enter the actual cash received and a handover reference.']);
                        }
                        $matches = ParcelFinance::cents((string) $data['amount']) === ParcelFinance::cents((string) $collection->amount);
                        $previous['cash_changed'] = $collection->received_amount === null
                            || ParcelFinance::cents((string) $collection->received_amount) !== ParcelFinance::cents((string) $data['amount'])
                            || $collection->handover_reference !== $data['handover_reference']
                            || $collection->discrepancy_reason !== ($matches ? null : ($data['reason'] ?? null));
                        if (! $matches && empty($data['reason'])) {
                            throw ValidationException::withMessages(['reason' => 'Explain the cash discrepancy. Cash remains unreconciled until the full amount is received.']);
                        }
                        if ($previous['cash_changed']) {
                            DB::table('cod_receipt_entries')->insert(['delivery_id' => $delivery->id, 'rider_id' => $collection->rider_id,
                                'received_by' => $user->id, 'expected_cents' => ParcelFinance::expected($sellerOrder),
                                'actual_cents' => ParcelFinance::cents((string) $data['amount']),
                                'discrepancy_cents' => ParcelFinance::cents((string) $data['amount']) - ParcelFinance::expected($sellerOrder),
                                'reference' => $data['handover_reference'], 'operation_key' => $data['request_key'] ?? (string) Str::uuid(),
                                'notes' => $data['reason'] ?? null, 'recorded_at' => now()]);
                        }
                        DB::table('cod_collections')->where('id', $collection->id)->update(['received_amount' => $data['amount'], 'handover_reference' => $data['handover_reference'], 'discrepancy_reason' => $matches ? null : $data['reason'], 'received_by' => $user->id, 'updated_at' => now()]);
                        if (! $matches) {
                            DB::table('cod_collections')->where('id', $collection->id)->update(['status' => 'collected', 'handed_over_at' => null]);
                            $action = 'cod_discrepancy';
                        }
                    }
                    $changes = $action === 'receive_cod' ? ['status' => 'handed_over', 'received_by' => $user->id, 'handed_over_at' => now()] : ['status' => 'reconciled', 'reconciled_by' => $user->id, 'reconciled_at' => now()];
                    if ($action !== 'cod_discrepancy') {
                        DB::table('cod_collections')->where('id', $collection->id)->update($changes + ['updated_at' => now()]);
                    }
                }
                if (in_array($data['action'], ['delivered', 'failed_attempt', 'return_to_center'], true)) {
                    $delivery->forceFill(['delivery_notes' => $data['reason']])->save();
                }
                $custody = $this->custody($delivery);
                $delivery->update(['custody_type' => $custody['party'], 'custody_rider_id' => $custody['party'] === 'rider' ? $custody['id'] : null]);
                $evidenceFields = match ($data['action']) {
                    'receive', 'receive_return' => ['receipt_condition'],
                    'sort' => ['service_area_id', 'sorting_bin'],
                    'assign' => ['assignment_leg', 'rider_id', 'service_area_id'],
                    'delivered' => ['amount', 'cod_confirmed', 'note', 'remarks', 'recipient_name'],
                    'failed_attempt' => ['proof_path'],
                    'submit_cod_handover', 'receive_cod' => ['amount', 'handover_reference'],
                    'claim' => ['logistics_center_id'],
                    default => [],
                };
                DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $delivery->logistics_center_id, 'actor_id' => $user->id, 'type' => $action, 'forward_checkpoint' => $checkpoint, 'reference' => $data['request_key'] ?? (string) Str::uuid(), 'notes' => json_encode(['operation' => $data['action'], 'role' => $user->role, 'before' => $previous, 'after' => $delivery->only(['status', 'rider_id', 'exception_status', 'service_area_id', 'dispatch_reference']), 'custody_before' => $custodyBefore, 'custody_after' => $this->custody($delivery), 'evidence' => collect($data)->only(array_merge(['tracking_reference', 'capture_method', 'reason', 'note', 'remarks'], $evidenceFields))->all()], JSON_THROW_ON_ERROR), 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
                app(ParcelNotifications::class)->record($delivery, $action, (string) DB::table('parcel_events')->where('delivery_id', $delivery->id)->max('id'), $previous);
            });
        } catch (\Throwable $exception) {
            if ($path && ! Delivery::query()->whereKey($delivery->id)->where('proof_photo_path', $path)->exists()) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        if ($request->routeIs('api.v1.*')) {
            return new DeliveryResource($delivery->refresh()->load('sellerOrder.items', 'sellerOrder.order', 'sellerOrder.store', 'sellerOrder.delivery')
                ->load(['sellerOrder.store.user.addresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')]));
        }

        return back()->with('status', match ($data['action']) {
            'delivered' => 'Delivery completed. Proof and COD payment recorded.',
            'submit_cod_handover' => 'COD handover submitted. Awaiting Logistics confirmation.',
            default => 'Parcel updated.',
        });
    }

    private function destinationArea(int $areaId, Delivery $delivery, Order $order): void
    {
        $area = DB::table('service_areas')->where('id', $areaId)->where('logistics_center_id', $delivery->logistics_center_id)->where('is_active', true)->first();
        if (! $area || strcasecmp($area->province_name ?? '', $order->shipping_province) !== 0 || strcasecmp($area->city_name ?? '', $order->shipping_city) !== 0 || strcasecmp($area->barangay_name ?? '', $order->shipping_barangay) !== 0) {
            throw ValidationException::withMessages(['service_area_id' => 'Choose an active service area matching the delivery address.']);
        }
    }

    private function custody(Delivery $delivery): array
    {
        if ($delivery->status === 'delivered') {
            return ['party' => 'recipient', 'order_id' => $delivery->sellerOrder->order_id];
        }
        if (in_array($delivery->exception_status, ['returned_to_center', 'transfer_pending'], true) || ($delivery->received_at && ! $delivery->dispatch_accepted_at)) {
            return ['party' => 'logistics', 'id' => $delivery->logistics_center_id];
        }
        if (in_array($delivery->status, ['picked_up', 'in_transit', 'out_for_delivery'], true)) {
            return ['party' => 'rider', 'id' => $delivery->rider_id];
        }

        return ['party' => 'seller', 'seller_order_id' => $delivery->seller_order_id];
    }

    public function proof(Request $request, Delivery $delivery, AuditLogger $audit)
    {
        $user = $request->user();
        abort_unless($user->role === 'admin' || ($user->role === 'rider' && $delivery->rider_id === $user->id) || ($user->role === 'logistics' && $user->logisticsCenters()->where('logistics_centers.id', $delivery->logistics_center_id)->operational()->exists()) || ($user->role === 'buyer' && $delivery->sellerOrder->order->buyer_id === $user->id) || ($user->role === 'seller' && $delivery->sellerOrder->store_id === $user->store?->id), 403);
        $proofPath = $delivery->proof_photo_path;
        if ($request->filled('event')) {
            $eventId = $request->validate(['event' => 'required|integer|min:1'])['event'];
            $event = DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('id', $eventId)->where('type', 'failed_attempt')->first();
            $proofPath = $event ? (json_decode($event->notes ?? '{}', true)['evidence']['proof_path'] ?? null) : null;
        }
        abort_unless($proofPath && Storage::disk('local')->exists($proofPath), 404);
        $audit->record(['actor_id' => $user->id, 'subject_type' => 'delivery_evidence', 'subject_id' => $delivery->id,
            'action' => 'delivery_proof_accessed', 'changes' => ['seller_order_id' => $delivery->seller_order_id]]);

        return Storage::disk('local')->download($proofPath, 'delivery-'.$delivery->id.'.'.pathinfo($proofPath, PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store']);
    }
}
