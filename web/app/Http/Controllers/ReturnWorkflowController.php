<?php

namespace App\Http\Controllers;

use App\Http\Resources\Api\ParcelResource;
use App\Models\CommerceSetting;
use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\ApproveRefund;
use App\Services\ParcelFinance;
use App\Services\ReturnEligibility;
use App\Services\ReturnTransport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class ReturnWorkflowController extends Controller
{
    public function visible(User $user): Builder
    {
        abort_unless(in_array($user->role, ['admin', 'buyer', 'seller', 'rider', 'logistics'], true), 403);
        abort_if($user->role === 'admin' && ! $user->canAdmin('disputes') && ! $user->canAdmin('finance'), 403);

        return ParcelReturn::query()
            ->when($user->role === 'buyer', fn ($q) => $q->where('buyer_id', $user->id))
            ->when($user->role === 'seller', fn ($q) => $q->whereHas('sellerOrder', fn ($p) => $p->where('store_id', $user->store?->id ?? 0)))
            ->when($user->role === 'logistics', fn ($q) => $q->whereHas('task')->whereHas('sellerOrder.delivery', fn ($d) => $d->whereIn('logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id'))))
            ->when($user->role === 'rider', fn ($q) => $q->whereHas('task')->where(fn ($r) => $r->where('rider_id', $user->id)->orWhere('collection_rider_id', $user->id)->orWhere('seller_return_rider_id', $user->id))->whereHas('sellerOrder.delivery', fn ($d) => $d->where('logistics_center_id', $user->logistics_center_id)));
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $filters = $request->validate(['parcel' => 'nullable|integer', 'exception_search' => 'nullable|string|max:100']);
        $returns = $this->visible($user)->when($filters['parcel'] ?? null, fn ($q, $id) => $q->where('seller_order_id', $id))
            ->with(['task', 'requestedItems', 'events', 'sellerOrder.items.product:id,image_path', 'sellerOrder.store', 'sellerOrder.order.buyer:id,name', 'sellerOrder.delivery', 'sellerOrder.payout'])
            ->latest('id')->paginate(15)->withQueryString();
        $proofs = DB::table('return_task_proofs')->whereIn('return_task_id', $returns->getCollection()->pluck('task.id')->filter())->get(['id', 'return_task_id', 'leg', 'recipient_name', 'created_at'])->groupBy('return_task_id');
        $wallets = DB::table('wallet_transactions')->whereIn('parcel_return_id', $returns->getCollection()->pluck('id'))->get(['id', 'parcel_return_id', 'reference', 'type', 'amount_cents', 'created_at'])->groupBy('parcel_return_id');
        $payments = DB::table('cod_collections')->whereIn('delivery_id', $returns->getCollection()->pluck('sellerOrder.delivery.id')->filter())->get(['delivery_id', 'amount', 'reference', 'status'])->keyBy('delivery_id');
        $returns->through(function ($case) use ($request, $user, $proofs, $wallets, $payments) {
            $parcel = $case->sellerOrder;
            $task = $case->task;
            $financial = in_array($user->role, ['admin', 'buyer', 'seller'], true);
            $items = $case->requestedItems->map(fn ($line) => [...$line->only(['order_item_id', 'quantity', 'requested_cents', 'approved_cents', 'approved_quantity']),
                'product_name' => $parcel->items->firstWhere('id', $line->order_item_id)?->product_name]);
            $allowed = $case->riderActions($user);
            if ($user->role === 'seller' && $task?->status === 'seller_delivered') {
                $allowed = ['receive', 'discrepancy'];
            } elseif ($user->role === 'seller' && $task?->status === 'received') {
                $allowed = ['discrepancy'];
            } elseif ($user->role === 'logistics') {
                $allowed = match ($task?->status) {
                    'approved', 'assigned' => ['assign'], 'collected' => ['facility_receive'],
                    'facility_received', 'seller_assigned' => ['assign_seller'], default => [],
                };
                if ($case->facility_received_at || $task?->seller_delivered_at) {
                    $allowed[] = 'record_return_fee';
                }
            }
            $operationalAddress = $user->role === 'logistics' || ($user->role === 'rider' && $case->rider_id === $user->id && $allowed !== []);
            $buyerAddressVisible = $user->role === 'logistics' || ($user->role === 'rider' && $case->rider_id === $user->id && $task?->status === 'assigned' && $user->canRide('delivery'));
            $payment = $payments->get($parcel->delivery?->id);

            return ['id' => $case->id, 'seller_order_id' => $case->seller_order_id, 'status' => $case->status, 'refund_status' => $case->refund_status,
                'buyer' => $user->role === 'admin' ? ['id' => $case->buyer_id, 'name' => $parcel->order->buyer?->name] : null,
                'workflow_version' => $case->workflow_version, 'condition' => $case->condition, 'restocked' => $case->restocked,
                'collected_at' => $case->collected_at, 'received_at' => $case->received_at, 'facility_received_at' => $case->facility_received_at,
                'seller_dispatched_at' => $case->seller_dispatched_at, 'collection_rider_id' => $case->collection_rider_id, 'seller_return_rider_id' => $case->seller_return_rider_id,
                'reason' => $case->reason, 'decision_reason' => $case->decision_reason, 'responsibility' => $case->responsibility,
                'return_shipping_responsibility' => $case->return_shipping_responsibility,
                'return_shipping_cents' => $financial ? (int) $case->return_shipping_cents : null,
                'physical_return_required' => $case->physical_return_required,
                'requested_shipping_cents' => $financial ? (int) $case->requested_shipping_cents : null,
                'refund_cents' => $financial ? $case->refund_cents : null, 'coins_refunded_cents' => $financial ? $case->coins_refunded_cents : null,
                'cash_refunded_cents' => $financial ? $case->cash_refunded_cents : null, 'refund_method' => $financial ? $case->refund_method : null,
                'refund_reference' => $financial ? $case->refund_reference : null, 'refunded_at' => $financial ? $case->refunded_at : null,
                'payment_context' => $financial ? ['net_merchandise_cents' => ParcelFinance::cents($parcel->subtotal), 'original_shipping_cents' => ParcelFinance::cents($parcel->shipping_fee),
                    'original_coins_cents' => (int) $parcel->coins_redeemed_cents, 'buyer_cash_cents' => $payment ? ParcelFinance::cents((string) $payment->amount) : null,
                    'cash_status' => $payment?->status, 'payment_reference' => $payment?->reference] : null,
                'seller_settlement' => in_array($user->role, ['admin', 'seller'], true) ? $parcel->payout?->only(['amount_cents', 'reference', 'created_at']) : null,
                'settlement_state' => ! $financial ? null : ($case->refund_status !== 'credited' ? 'Awaiting refund decision' : ($parcel->payout && $case->seller_debit_cents > $case->seller_recovered_cents ? 'Seller recovery outstanding' : ($case->logistics_debit_cents > $case->logistics_recovered_cents ? 'Logistics recovery outstanding' : ($case->seller_debit_cents && ! $parcel->payout ? 'Seller settlement adjusted' : 'Liability recorded; cash funding separate')))),
                'items' => $financial ? $items : $items->map(fn ($line) => [...Arr::only($line, ['order_item_id', 'product_name']), 'quantity' => $line['approved_quantity'] ?? $line['quantity']])->filter(fn ($line) => $line['quantity'] > 0)->values(),
                'evidence_count' => in_array($user->role, ['admin', 'buyer'], true) ? count($case->evidence_paths ?? []) : 0,
                'wallet_entries' => in_array($user->role, ['admin', 'buyer'], true) ? $wallets->get($case->id, collect())->values() : [],
                'task' => $task ? [...$task->only(['id', 'reference', 'status', 'seller_delivered_at', 'confirmed_at', 'confirmed_by']),
                    'buyer_address' => $buyerAddressVisible ? $task->buyer_address : null,
                    'seller_address' => $operationalAddress ? $task->seller_address : null,
                    'proofs' => $proofs->get($task->id, collect())->values()] : null,
                'allowed_actions' => $allowed, 'events' => $case->events
                    ->filter(fn ($event) => $financial || in_array($event->action, ['assign', 'collect', 'facility_receive', 'assign_seller', 'accept_seller_dispatch', 'deliver_seller', 'receive', 'discrepancy'], true))
                    ->map(fn ($event) => [...$event->only(['id', 'action', 'notes', 'created_at']), 'evidence_url' => $event->evidence_path && ($user->role === 'seller' || $user->canAdmin('disputes')) ? '/returns/'.$case->id.'/discrepancy-evidence/'.$event->id : null])->values(),
                'parcel' => $request->routeIs('api.v1.*') ? (new ParcelResource($parcel))->limitBuyerContacts($user->role === 'seller' || ($user->role === 'rider' && ! $buyerAddressVisible)) : null,
                'return_destination' => $operationalAddress ? $task?->seller_address : null,
                'seller_order' => ['id' => $parcel->id, 'order_id' => $parcel->order_id, 'store' => ['name' => $parcel->store->name],
                    'delivery' => ['tracking_reference' => $parcel->delivery?->tracking_reference],
                    'items' => $parcel->items->map(fn ($item) => [...$item->only(['id', 'product_name', 'variant_name', 'quantity']), 'product_image_url' => $item->product?->image_url])],
            ];
        });
        $days = (int) CommerceSetting::query()->findOrFail(1)->return_window_days;
        $eligible = $user->role === 'buyer' ? SellerOrder::query()->whereHas('order', fn ($q) => $q->where('buyer_id', $user->id))
            ->where('status', 'completed')->whereHas('delivery', fn ($d) => $d->where('status', 'delivered'))
            ->where(fn ($q) => $q->whereHas('delivery', fn ($d) => $d->withinReturnWindow($days))->orWhereExists(fn ($e) => $e->selectRaw('1')->from('return_window_exceptions')->whereColumn('seller_order_id', 'seller_orders.id')))
            ->when($filters['parcel'] ?? null, fn ($q, $id) => $q->whereKey($id))->with('store', 'delivery')->latest('id')->limit(100)->get()
            ->map(function ($parcel) {
                try {
                    $items = app(ReturnEligibility::class)->items($parcel);
                } catch (ValidationException) {
                    return null;
                }

                return ['id' => $parcel->id, 'store' => ['name' => $parcel->store->name], 'tracking_reference' => $parcel->delivery?->tracking_reference,
                    'items' => $items, 'shipping_remaining_cents' => app(ReturnEligibility::class)->shippingRemaining($parcel)];
            })->filter(fn ($row) => $row && collect($row['items'])->contains(fn ($item) => $item['remaining_quantity'] > 0))->values() : [];
        $exceptionParcels = [];
        if ($user->canAdmin('disputes') && ! empty($filters['exception_search'])) {
            $search = $filters['exception_search'];
            $parcels = SellerOrder::query()->where('status', 'completed')->whereHas('delivery', fn ($d) => $d->where('status', 'delivered'))
                ->where(fn ($q) => $q->whereHas('delivery', fn ($d) => $d->where('tracking_reference', 'like', '%'.$search.'%'))
                    ->orWhere('order_id', ctype_digit($search) ? (int) $search : 0)
                    ->orWhereHas('order.buyer', fn ($b) => $b->where('name', 'like', '%'.$search.'%'))
                    ->orWhereHas('store', fn ($s) => $s->where('name', 'like', '%'.$search.'%')))
                ->with(['delivery', 'store', 'order.buyer', 'parcelReturns'])->latest('id')->limit(20)->get();
            $exceptions = DB::table('return_window_exceptions')->whereIn('seller_order_id', $parcels->pluck('id'))->pluck('seller_order_id');
            $exceptionParcels = $parcels->map(function ($parcel) use ($exceptions, $days) {
                $deadline = $parcel->delivery->delivered_at?->copy()->addDays($parcel->delivery->return_window_days ?? $days);

                return ['id' => $parcel->id, 'tracking' => $parcel->delivery->tracking_reference, 'order_reference' => (string) $parcel->order_id,
                    'buyer' => $parcel->order->buyer->name, 'store' => $parcel->store->name, 'delivered_at' => $parcel->delivery->delivered_at?->toIso8601String(),
                    'deadline' => $deadline?->toIso8601String(), 'within_window' => $deadline?->gte(now()) ?? false,
                    'return_status' => $parcel->parcelReturns->last()?->refund_status, 'exception' => $exceptions->contains($parcel->id), 'can_authorize' => ! $exceptions->contains($parcel->id)];
            });
        }
        $props = ['role' => $user->role, 'returns' => $returns, 'eligible' => $eligible, 'returnWindowDays' => $days,
            'policyUpdatedAt' => CommerceSetting::query()->findOrFail(1)->updated_at?->toIso8601String(),
            'exceptionSearch' => $filters['exception_search'] ?? '', 'exceptionParcels' => $exceptionParcels,
            'riders' => $user->role === 'logistics' ? User::query()->managedRiders($user)->where('role', 'rider')->where('status', 'approved')->whereIn('logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id'))->get(['id', 'name']) : [],
        ];

        return $request->routeIs('api.v1.*') ? response()->json(['data' => $returns]) : Inertia::render('finance/returns', $props);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'buyer', 403);
        $data = $request->validate(['seller_order_id' => 'required|integer', 'reason' => 'required|string|min:10|max:2000',
            'reason_kind' => 'nullable|in:damaged,wrong_product,other', 'items' => 'sometimes|array|min:1',
            'items.*.order_item_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1',
            'items.*.amount' => 'nullable|numeric|decimal:0,2|min:0|max:99999999.99', 'shipping_amount' => 'sometimes|numeric|decimal:0,2|min:0|max:99999999.99',
            'evidence' => 'required_if:reason_kind,damaged,wrong_product|array|max:5', 'evidence.*' => 'image|mimes:jpg,jpeg,png|max:5120']);
        $source = SellerOrder::query()->findOrFail($data['seller_order_id']);
        abort_unless($source->order->buyer_id === $request->user()->id, 403);
        $paths = [];
        try {
            foreach ($request->file('evidence', []) as $file) {
                $path = $file->store('return-evidence', 'local');
                if (! $path) {
                    throw ValidationException::withMessages(['evidence' => 'Evidence could not be stored. Please retry.']);
                }
                $paths[] = $path;
            }
            DB::transaction(function () use ($request, $data, $source, $paths) {
                Store::query()->whereKey($source->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($source->id)->lockForUpdate()->firstOrFail();
                abort_unless($parcel->order->buyer_id === $request->user()->id, 403);
                $policy = CommerceSetting::query()->whereKey(1)->lockForUpdate()->firstOrFail();
                $parcel->setRelation('delivery', $parcel->delivery()->lockForUpdate()->first());
                abort_unless($parcel->status === 'completed' && $parcel->delivery?->status === 'delivered', 409, 'Only delivered parcels are eligible.');
                $days = $parcel->delivery->return_window_days ?? $policy->return_window_days;
                if (! $parcel->delivery->delivered_at?->gte(now()->subDays($days)) && ! DB::table('return_window_exceptions')->where('seller_order_id', $parcel->id)->exists()) {
                    abort(409, 'The return window has ended. Contact support for an admin eligibility review.');
                }
                $eligibility = app(ReturnEligibility::class);
                // Compatibility for existing whole-parcel/mobile clients: derive available items server-side.
                $selection = $data['items'] ?? collect($eligibility->items($parcel))->filter(fn ($item) => $item['remaining_quantity'] > 0)->map(fn ($item) => ['order_item_id' => $item['id'], 'quantity' => $item['remaining_quantity']])->values()->all();
                if ($selection === []) {
                    throw ValidationException::withMessages(['items' => 'No eligible quantities remain; existing requests may already reserve them.']);
                }
                $items = $eligibility->select($parcel, $selection);
                $shipping = ParcelFinance::cents((string) ($data['shipping_amount'] ?? '0'));
                if ($shipping > $eligibility->shippingRemaining($parcel)) {
                    throw ValidationException::withMessages(['shipping_amount' => 'Request a positive refund within the remaining actual payment.']);
                }
                $case = ParcelReturn::query()->create(['workflow_version' => 3, 'seller_order_id' => $parcel->id, 'buyer_id' => $request->user()->id,
                    'reason' => $data['reason'], 'reason_kind' => $data['reason_kind'] ?? 'other', 'description' => $data['reason'], 'evidence_paths' => $paths]);
                $case->forceFill(['requested_shipping_cents' => $shipping])->save();
                $case->requestedItems()->createMany($items);
                $case->events()->create(['actor_id' => $request->user()->id, 'action' => 'requested', 'notes' => $data['reason']]);
            }, 3);
        } catch (\Throwable $exception) {
            foreach ($paths as $path) {
                Storage::disk('local')->delete($path);
            }
            $this->failure($request, $exception);
        }

        return $this->saved($request, 'Refund requested for admin review.');
    }

    public function update(Request $request, ParcelReturn $return)
    {
        $this->visible($request->user())->whereKey($return->id)->firstOrFail();
        $action = $request->input('action');
        if ($action === 'approve') {
            abort_unless($request->user()->canAdmin('disputes') && $request->user()->canAdmin('finance'), 403);
        } elseif ($action === 'reject') {
            abort_unless($request->user()->canAdmin('disputes'), 403);
        } elseif (in_array($action, ['assign', 'assign_seller', 'facility_receive', 'record_return_fee'], true)) {
            abort_unless($request->user()->role === 'logistics', 403);
        }
        $data = $request->validate(['action' => 'required|in:approve,reject,assign,collect,facility_receive,assign_seller,accept_seller_dispatch,deliver_seller,receive,discrepancy,record_return_fee',
            'reason' => 'required|string|min:3|max:500', 'rider_id' => 'required_if:action,assign,assign_seller|nullable|integer',
            'responsibility' => 'required_if:action,approve|nullable|in:seller,logistics,buyer,platform',
            'return_shipping_responsibility' => 'required_if:action,approve|nullable|in:seller,logistics,buyer,platform,not_required',
            'physical_return_required' => 'required_if:action,approve|boolean', 'shipping_amount' => 'required_if:action,approve|nullable|numeric|decimal:0,2|min:0|max:99999999.99',
            'items' => 'required_if:action,approve|array|min:1', 'items.*.order_item_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1',
            'items.*.amount' => 'required|numeric|decimal:0,2|min:0|max:99999999.99',
            'proof' => 'prohibited_unless:action,collect,deliver_seller,discrepancy|required_if:action,collect,deliver_seller|nullable|image|mimes:jpg,jpeg,png|max:5120',
            'recipient_name' => 'required_if:action,collect,deliver_seller|nullable|string|max:150',
            'condition' => 'required_if:action,receive|nullable|in:intact,damaged', 'restock' => 'required_if:action,receive|boolean',
            'amount' => 'required_if:action,record_return_fee|nullable|numeric|decimal:0,2|min:0.01|max:999999.99',
            'leg' => 'required_if:action,record_return_fee|nullable|in:return,return_collection']);
        try {
            if ($data['action'] === 'approve') {
                if ((bool) $data['physical_return_required'] === ($data['return_shipping_responsibility'] === 'not_required')) {
                    throw ValidationException::withMessages(['return_shipping_responsibility' => 'Choose a shipping responsibility for a physical return, or Not required for a no-return refund.']);
                }
                app(ApproveRefund::class)->handle($return, $request->user(), $data);
            } elseif ($data['action'] === 'reject') {
                abort_unless($request->user()->canAdmin('disputes'), 403);
                DB::transaction(function () use ($return, $request, $data) {
                    Store::query()->whereKey($return->sellerOrder->store_id)->lockForUpdate()->firstOrFail();
                    SellerOrder::query()->whereKey($return->seller_order_id)->lockForUpdate()->firstOrFail();
                    $case = ParcelReturn::query()->whereKey($return->id)->lockForUpdate()->firstOrFail();
                    abort_unless($case->refund_status === 'pending', 409, 'Only a pending request can be rejected.');
                    $case->forceFill(['refund_status' => 'rejected', 'status' => 'rejected', 'decided_by' => $request->user()->id, 'decision_reason' => $data['reason']])->save();
                    $case->events()->create(['actor_id' => $request->user()->id, 'action' => 'rejected', 'notes' => $data['reason']]);
                    app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'parcel_return', 'subject_id' => $case->id,
                        'action' => 'return_reject', 'changes' => ['refund_status' => 'rejected', 'reason' => $data['reason']]]);
                }, 3);
            } elseif ($data['action'] === 'record_return_fee') {
                abort_unless($return->task, 409, 'A physical return task is required.');
                $request->merge(['return_task_id' => $return->task->id, 'delivery_id' => $return->sellerOrder->delivery?->id,
                    'rider_id' => $data['leg'] === 'return_collection' ? $return->collection_rider_id : $return->seller_return_rider_id, 'notes' => $data['reason']]);

                app(RiderPaymentController::class)->store($request);

                return $this->saved($request, 'Completed return-work fee recorded. Actual payment remains separate.');
            } else {
                app(ReturnTransport::class)->handle($request, $return, $data);
            }
        } catch (\Throwable $exception) {
            $this->failure($request, $exception);
        }

        return $this->saved($request, $data['action'] === 'approve'
            ? ($return->fresh()->coins_refunded_cents > 0 ? 'Refund approved. Lubos Coins are available in the buyer wallet.' : 'Physical return approved. No buyer refund is due for this decision.')
            : 'Return action saved.');
    }

    public function proof(Request $request, ParcelReturn $return, int $proof)
    {
        $this->visible($request->user())->whereKey($return->id)->firstOrFail();
        $entry = DB::table('return_task_proofs')->where('id', $proof)->where('return_task_id', $return->task?->id)->first();
        abort_unless($entry && Storage::disk('local')->exists($entry->path), 404);

        return Storage::disk('local')->response($entry->path, null, ['Cache-Control' => 'private, no-store']);
    }

    public function discrepancyEvidence(Request $request, ParcelReturn $return, int $event)
    {
        $this->visible($request->user())->whereKey($return->id)->firstOrFail();
        abort_unless($request->user()->role === 'seller' || $request->user()->canAdmin('disputes'), 403);
        $entry = $return->events()->whereKey($event)->firstOrFail();
        abort_unless($entry->evidence_path && Storage::disk('local')->exists($entry->evidence_path), 404);

        return Storage::disk('local')->response($entry->evidence_path, null, ['Cache-Control' => 'private, no-store']);
    }

    private function saved(Request $request, string $message)
    {
        return $request->routeIs('api.v1.*') ? response()->json(['message' => $message]) : back()->with('status', $message);
    }

    private function failure(Request $request, \Throwable $exception): never
    {
        if ($exception instanceof ValidationException) {
            throw $exception;
        }
        if ($exception instanceof HttpExceptionInterface) {
            if ($request->header('X-Inertia') && $exception->getStatusCode() === 409) {
                throw ValidationException::withMessages(['operation' => $exception->getMessage() ?: 'This record changed. Refresh and review its current state.']);
            }
            throw $exception;
        }
        report($exception);
        throw ValidationException::withMessages(['operation' => 'The records could not be saved. Nothing was committed; please retry or contact support.']);
    }
}
