<?php

namespace App\Http\Controllers;

use App\Models\LogisticsRemittance;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Services\Admin\AuditLogger;
use App\Services\Notifications\NotificationInbox;
use App\Services\ParcelFinance;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LogisticsSettlementController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->canAdmin('finance') || $user->role === 'logistics', 403);
        $request->validate(['page' => 'sometimes|integer|min:1']);
        // Derive allocations from the original snapshots, never fabricate cash receipts.
        $query = DB::table('seller_orders as parcels')->join('deliveries', 'deliveries.seller_order_id', '=', 'parcels.id')
            ->join('logistics_centers as centers', 'centers.id', '=', 'deliveries.logistics_center_id')
            ->leftJoin('cod_collections as cash', 'cash.delivery_id', '=', 'deliveries.id')
            ->leftJoin('parcel_returns as returns', 'returns.seller_order_id', '=', 'parcels.id')
            ->leftJoin('logistics_remittances as remittance', 'remittance.seller_order_id', '=', 'parcels.id')
            ->when($user->role === 'logistics', fn ($q) => $q->whereIn('centers.id', $user->logisticsCenters()->operational()->select('logistics_centers.id')))
            ->where('parcels.status', 'completed')->where('deliveries.status', 'delivered');
        $reconciled = "cash.status = 'reconciled' AND cash.discrepancy_reason IS NULL AND ROUND(cash.amount * 100) = COALESCE(parcels.cod_due_cents, ROUND(parcels.subtotal * 100) + ROUND(parcels.shipping_fee * 100) - parcels.coins_redeemed_cents) AND ROUND(cash.received_amount * 100) = COALESCE(parcels.cod_due_cents, ROUND(parcels.subtotal * 100) + ROUND(parcels.shipping_fee * 100) - parcels.coins_redeemed_cents)";
        $totals = (clone $query)->selectRaw("COALESCE(SUM(ROUND(parcels.shipping_fee * 100)), 0) as allocated_cents,
            COALESCE(SUM(CASE WHEN $reconciled THEN ROUND(parcels.shipping_fee * 100) ELSE 0 END), 0) as reconciled_cents,
            COALESCE(SUM(returns.shipping_refund_cents), 0) as shipping_refund_cents,
            COALESCE(SUM(CASE WHEN remittance.id IS NOT NULL OR (ROUND(parcels.subtotal * 100) - parcels.coins_redeemed_cents = 0 AND $reconciled) THEN ROUND(parcels.shipping_fee * 100) ELSE 0 END), 0) as retained_cents,
            COALESCE(SUM(remittance.amount_cents), 0) as product_remittances_cents")->first();
        $totals = array_map('intval', (array) $totals);
        $totals['pending_cents'] = $totals['allocated_cents'] - $totals['reconciled_cents'];
        // A refund is not automatically an established Logistics liability.
        $totals['awaiting_retention_confirmation_cents'] = $totals['allocated_cents'] - $totals['retained_cents'];
        $entries = $query->orderByDesc('parcels.id')->paginate(15, [
            'parcels.id', 'parcels.subtotal', 'parcels.coins_redeemed_cents', 'parcels.cod_due_cents', 'parcels.merchandise_cash_cents', 'parcels.shipping_fee', 'parcels.status as parcel_status',
            'centers.id as logistics_center_id', 'centers.name as logistics_name', 'deliveries.tracking_reference',
            'deliveries.status as delivery_status', 'cash.status as cash_status', 'cash.amount', 'cash.received_amount',
            'cash.discrepancy_reason', 'cash.reconciled_at', 'returns.shipping_refund_cents',
            'deliveries.id as delivery_id',
            DB::raw("(SELECT notes FROM parcel_events WHERE delivery_id = deliveries.id AND type = 'submit_platform_handover' ORDER BY id DESC LIMIT 1) as platform_handover"),
            'remittance.id as remittance_id', 'remittance.amount_cents as remitted_cents', 'remittance.reference', 'remittance.external_reference', 'remittance.received_on', 'remittance.created_at as recorded_at', 'remittance.recorded_by', 'remittance.notes',
        ])->through(function ($row) {
            $parcel = new SellerOrder(['subtotal' => $row->subtotal, 'shipping_fee' => $row->shipping_fee, 'coins_redeemed_cents' => $row->coins_redeemed_cents, 'cod_due_cents' => $row->cod_due_cents, 'merchandise_cash_cents' => $row->merchandise_cash_cents]);
            $expected = ParcelFinance::expected($parcel);
            $cashMatches = $row->cash_status === 'reconciled' && $row->received_amount !== null
                && empty($row->discrepancy_reason) && ParcelFinance::cents((string) $row->amount) === $expected
                && ParcelFinance::cents((string) $row->received_amount) === $expected;
            $receivedMatches = in_array($row->cash_status, ['handed_over', 'reconciled'], true) && $row->received_amount !== null
                && empty($row->discrepancy_reason) && ParcelFinance::cents((string) $row->amount) === $expected
                && ParcelFinance::cents((string) $row->received_amount) === $expected;
            $submission = $row->platform_handover ? json_decode($row->platform_handover, true)['evidence'] : null;

            return ['parcel_id' => $row->id, 'delivery_id' => $row->delivery_id, 'handover' => $submission,
                'can_submit' => $receivedMatches && ! $row->remittance_id && ! $submission && ParcelFinance::merchandiseCash($parcel) > 0,
                'can_reconcile' => $receivedMatches && $row->cash_status === 'handed_over',
                'reconciled_at' => $row->reconciled_at ? Carbon::parse($row->reconciled_at)->toIso8601String() : null, 'logistics_center_id' => $row->logistics_center_id,
                'logistics_name' => $row->logistics_name, 'tracking_reference' => $row->tracking_reference,
                'allocation_cents' => ParcelFinance::cents((string) $row->shipping_fee),
                'product_remittance_cents' => ParcelFinance::merchandiseCash($parcel),
                'remittance' => $row->remittance_id ? ['amount_cents' => (int) $row->remitted_cents, 'reference' => $row->reference, 'external_reference' => $row->external_reference, 'received_on' => $row->received_on, 'recorded_at' => $row->recorded_at ? Carbon::parse($row->recorded_at)->toIso8601String() : null, 'recorded_by' => $row->recorded_by, 'notes' => $row->notes] : null,
                'can_record' => $cashMatches && ! $row->remittance_id && ParcelFinance::merchandiseCash($parcel) > 0,
                'shipping_refund_cents' => $row->shipping_refund_cents === null ? null : (int) $row->shipping_refund_cents,
                'status' => $cashMatches ? (ParcelFinance::merchandiseCash($parcel) === 0 ? 'coin_funded_shipping_retained' : 'cod_reconciled') : 'awaiting_cod_reconciliation'];
        });
        $props = ['entries' => $entries, 'totals' => $totals, 'cash_model' => 'logistics_retains_shipping', 'can_record' => $user->canAdmin('finance'),
            'can_submit' => $user->role === 'logistics', 'can_reconcile' => $user->canAdmin('finance') && $user->canAdmin('operations')];

        return $request->routeIs('api.v1.*') ? response()->json(['data' => $props])
            : Inertia::render('finance/logistics-settlements', $props);
    }

    public function handover(Request $request, SellerOrder $parcel, AuditLogger $audit, NotificationInbox $inbox)
    {
        $user = $request->user();
        abort_unless($user->canOperate() && $user->role === 'logistics', 403);
        DB::transaction(function () use ($user, $parcel, $audit, $inbox) {
            Store::query()->whereKey($parcel->store_id)->lockForUpdate()->firstOrFail();
            $parcel = SellerOrder::query()->whereKey($parcel->id)->lockForUpdate()->firstOrFail();
            $delivery = $parcel->delivery;
            abort_unless($delivery && $user->logisticsCenters()->operational()->whereKey($delivery->logistics_center_id)->exists(), 403);
            $cash = DB::table('cod_collections')->where('delivery_id', $delivery->id)->lockForUpdate()->first();
            abort_unless($parcel->status === 'completed' && $delivery->status === 'delivered' && $cash
                && in_array($cash->status, ['handed_over', 'reconciled'], true) && empty($cash->discrepancy_reason)
                && $cash->received_amount !== null && ParcelFinance::cents((string) $cash->amount) === ParcelFinance::expected($parcel)
                && ParcelFinance::cents((string) $cash->received_amount) === ParcelFinance::expected($parcel), 409, 'Verify the full rider cash receipt first.');
            abort_if($parcel->logisticsRemittance()->exists(), 409, 'Admin already recorded this receipt.');
            if (DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('type', 'submit_platform_handover')->exists()) {
                return;
            }
            $amount = ParcelFinance::merchandiseCash($parcel);
            abort_unless($amount > 0, 409, 'No product cash is due for this parcel.');
            $reference = 'LMHO-'.Str::uuid();
            $evidence = ['amount_cents' => $amount, 'reference' => $reference, 'submitted_at' => now()->toIso8601String(), 'submitted_by' => $user->id];
            DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $delivery->logistics_center_id,
                'actor_id' => $user->id, 'type' => 'submit_platform_handover', 'reference' => $reference,
                'notes' => json_encode(['evidence' => $evidence], JSON_THROW_ON_ERROR), 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            $audit->record(['actor_id' => $user->id, 'subject_type' => 'seller_order', 'subject_id' => $parcel->id,
                'action' => 'logistics_platform_handover_submitted', 'changes' => $evidence]);
            foreach ($inbox->admins('finance') as $admin) {
                $inbox->send($admin, 'remittance.submitted', $reference, 'Logistics submitted cash handover',
                    'Parcel #'.$parcel->id.'. Verify product cash of PHP '.ParcelFinance::decimal($amount).'.', 'platform_handover', $parcel->id, true);
            }
        }, 3);

        return back()->with('status', 'Cash handover submitted to Admin. Awaiting actual receipt confirmation.');
    }

    public function store(Request $request, SellerOrder $parcel, AuditLogger $audit)
    {
        abort_unless($request->user()->canAdmin('finance'), 403);
        $data = $request->validate(['amount' => 'required|numeric|decimal:0,2|min:0.01|max:99999999.99',
            'reference' => 'nullable|string|min:3|max:100|unique:logistics_remittances,reference|unique:logistics_remittances,external_reference', 'external_reference' => 'nullable|string|min:3|max:100|unique:logistics_remittances,external_reference|unique:logistics_remittances,reference', 'received_on' => 'required|date_format:Y-m-d|before_or_equal:'.now('Asia/Manila')->toDateString(),
            'notes' => 'required|string|min:3|max:500']);
        try {
            DB::transaction(function () use ($request, $parcel, $data, $audit) {
                Store::query()->whereKey($parcel->store_id)->lockForUpdate()->firstOrFail();
                $parcel = SellerOrder::query()->whereKey($parcel->id)->lockForUpdate()->firstOrFail();
                $delivery = $parcel->delivery;
                $cash = DB::table('cod_collections')->where('delivery_id', $delivery?->id)->lockForUpdate()->first();
                abort_unless(ParcelFinance::reconciled($parcel, $cash) && $delivery->logistics_center_id, 409, 'Full Rider cash receipt and Admin COD reconciliation are required first.');
                abort_if($parcel->logisticsRemittance()->exists(), 409, 'This parcel remittance is already recorded.');
                $expected = ParcelFinance::merchandiseCash($parcel);
                if (ParcelFinance::cents((string) $data['amount']) !== $expected) {
                    throw ValidationException::withMessages(['amount' => 'Record exactly the original net product subtotal. Logistics retains the shipping fee.']);
                }
                // Preserve legacy input as external evidence, never as a fabricated
                // payment reference. Internal references are always server-generated.
                $externalReference = $data['external_reference'] ?? $data['reference'] ?? null;
                $submission = DB::table('parcel_events')->where('delivery_id', $delivery->id)->where('type', 'submit_platform_handover')->latest('id')->first();
                if ($submission) {
                    $submittedReference = json_decode($submission->notes, true)['evidence']['reference'];
                    if ($externalReference !== null && $externalReference !== $submittedReference) {
                        throw ValidationException::withMessages(['external_reference' => 'Use the fixed Logistics handover reference.']);
                    }
                    $externalReference = $submittedReference;
                }
                $reference = 'LMRC-'.Str::uuid();
                $entry = LogisticsRemittance::query()->create(['seller_order_id' => $parcel->id, 'logistics_center_id' => $delivery->logistics_center_id,
                    'recorded_by' => $request->user()->id, 'amount_cents' => $expected, 'reference' => $reference, 'external_reference' => $externalReference, 'received_on' => $data['received_on'], 'notes' => $data['notes']]);
                $audit->record(['actor_id' => $request->user()->id, 'subject_type' => 'seller_order', 'subject_id' => $parcel->id,
                    'action' => 'logistics_remittance_received', 'changes' => ['remittance_id' => $entry->id, 'amount_cents' => $expected,
                        'shipping_retained_cents' => ParcelFinance::cents($parcel->shipping_fee), 'reference' => $reference, 'external_reference' => $externalReference, 'reason' => $data['notes'], 'received_on' => $data['received_on']]]);
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['reference' => 'This parcel or remittance reference is already recorded.']);
        }

        return back()->with('status', 'Actual product-cash receipt recorded. Logistics retains shipping. No money transfer was initiated.');
    }
}
