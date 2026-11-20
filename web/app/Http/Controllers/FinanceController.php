<?php

namespace App\Http\Controllers;

use App\Services\ParcelFinance;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user->canAdmin('finance') || in_array($user->role, ['seller', 'logistics', 'rider'], true), 403);
        $filters = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', $request->filled('from') ? 'after_or_equal:from' : 'nullable'], 'cash_status' => 'nullable|in:collected,handed_over,reconciled', 'reference' => 'nullable|string|max:100']);
        $returnTotals = DB::table('parcel_returns')->select('seller_order_id')
            ->selectRaw("MAX(refunded_at) as refunded_at, 'aggregate' as refund_method, SUM(CASE WHEN refund_method IS NULL THEN COALESCE(refund_cents, 0) ELSE cash_refunded_cents END) as cash_refunded_cents")
            ->selectRaw("CASE WHEN SUM(CASE WHEN refund_status NOT IN ('rejected', 'credited', 'approved_no_refund') THEN 1 ELSE 0 END) > 0 THEN 'requested' WHEN SUM(CASE WHEN refunded_at IS NOT NULL THEN 1 ELSE 0 END) > 0 THEN 'refunded' ELSE 'rejected' END as status")
            ->selectRaw('COALESCE(SUM(coins_refunded_cents), 0) as coins_refunded_cents, COALESCE(SUM(seller_recovered_cents), 0) as seller_recovered_cents, COALESCE(SUM(logistics_debit_cents), 0) as logistics_debit_cents, COALESCE(SUM(logistics_recovered_cents), 0) as logistics_recovered_cents, COALESCE(SUM(refund_cents), 0) as refund_cents, COALESCE(SUM(seller_debit_cents), 0) as seller_debit_cents, COALESCE(SUM(commission_reversal_cents), 0) as commission_reversal_cents, COALESCE(SUM(shipping_refund_cents), 0) as shipping_refund_cents')->groupBy('seller_order_id');
        $query = DB::table('seller_orders as parcels')->leftJoin('deliveries', 'deliveries.seller_order_id', '=', 'parcels.id')
            ->join('stores as stores', 'stores.id', '=', 'parcels.store_id')
            ->leftJoin('logistics_centers as centers', 'centers.id', '=', 'deliveries.logistics_center_id')
            ->leftJoin('users as riders', 'riders.id', '=', 'deliveries.rider_id')
            ->leftJoin('cod_collections as cash', 'cash.delivery_id', '=', 'deliveries.id')
            ->leftJoinSub($returnTotals, 'returns', fn ($join) => $join->on('returns.seller_order_id', '=', 'parcels.id'))
            ->leftJoin('seller_payouts as payout', 'payout.seller_order_id', '=', 'parcels.id')
            ->leftJoin('coin_allocations as coins', 'coins.seller_order_id', '=', 'parcels.id')
            ->leftJoin('logistics_remittances as remittance', 'remittance.seller_order_id', '=', 'parcels.id')
            ->when($user->role === 'seller', fn ($q) => $q->where('parcels.store_id', $user->store?->id ?? 0))
            ->when($user->role === 'logistics', fn ($q) => $q->whereIn('deliveries.logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id')))
            ->when($user->role === 'rider', fn ($q) => $q->where('cash.rider_id', $user->id))
            ->when($filters['from'] ?? null, fn ($q, $date) => $q->whereDate('parcels.created_at', '>=', $date))->when($filters['to'] ?? null, fn ($q, $date) => $q->whereDate('parcels.created_at', '<=', $date))
            ->when($filters['cash_status'] ?? null, fn ($q, $status) => $q->where('cash.status', $status))
            ->when($filters['reference'] ?? null, fn ($q, $reference) => $q->where(fn ($q) => $q->where('cash.reference', $reference)->orWhere('cash.handover_reference', $reference)->orWhere('remittance.reference', $reference)->orWhere('payout.reference', $reference)->orWhere('deliveries.tracking_reference', $reference)))
            ->select(['stores.name as store_name', 'centers.name as logistics_name', 'riders.name as rider_name', 'cash.collected_at', 'cash.handed_over_at', 'cash.reconciled_at', 'deliveries.delivered_at', 'remittance.created_at as platform_recorded_at', 'remittance.received_on as platform_received_on', 'payout.created_at as paid_at', 'returns.refunded_at', 'coins.amount_cents as allocated_coins', 'coins.restored_at as coins_restored_at', 'cash.reference as collection_reference', 'cash.handover_reference', 'remittance.reference as remittance_reference', 'payout.reference as payout_reference', 'deliveries.tracking_reference', 'parcels.created_at as placed_at', 'parcels.coins_redeemed_cents', 'parcels.cod_due_cents', 'parcels.id', 'parcels.store_id', 'parcels.subtotal', 'parcels.discount_amount', 'parcels.shipping_fee', 'parcels.commission_basis_points',
                'parcels.commission_amount', 'parcels.seller_proceeds', 'parcels.status', 'deliveries.status as delivery_status',
                'cash.amount', 'cash.received_amount', 'cash.status as cash_status', 'cash.discrepancy_reason',
                'returns.refund_method', 'returns.cash_refunded_cents', 'returns.coins_refunded_cents', 'returns.seller_recovered_cents', 'returns.logistics_debit_cents', 'returns.logistics_recovered_cents', 'returns.status as return_status', 'returns.refund_cents', 'returns.seller_debit_cents', 'returns.commission_reversal_cents',
                'returns.shipping_refund_cents', 'payout.amount_cents as payout_cents', 'remittance.amount_cents as remittance_cents'])
            ->orderBy('parcels.id');
        $transactions = (clone $query)->paginate(15)->withQueryString()->through(fn ($row) => $this->transaction($row, $user->role));
        $rows = $query->cursor();
        $amounts = array_fill_keys(['COD collected', 'Cash received by Logistics', 'Awaiting Logistics cash receipt', 'Awaiting Admin reconciliation', 'COD reconciled',
            'Shipping allocations', 'Gross product sales', 'Seller voucher discounts', 'Net product sales', 'Expected commission',
            'Recognized commission', 'Reconciled commission', 'Commission backed by platform cash receipt', 'Commission reversals',
            'Seller proceeds', 'Seller refund deductions', 'Manual seller payouts', 'Manual buyer refunds', 'Shipping refunds', 'Commission backed by coin funding', 'Commission backed by platform funding', 'Expected COD', 'Product cash received by Platform', 'Cash held by Logistics', 'Awaiting COD collection', 'Lubos Coins redeemed', 'Lubos Coins refunded', 'Approved refund value', 'Seller recovery receipts', 'Logistics refund liabilities', 'Logistics recovery receipts'], 0);
        $discrepancies = 0;
        $legacyRates = 0;
        $storeBalances = [];
        foreach ($rows as $row) {
            $subtotal = ParcelFinance::cents((string) $row->subtotal);
            $shipping = ParcelFinance::cents((string) $row->shipping_fee);
            $cashDue = $row->cod_due_cents ?? ($subtotal - (int) $row->coins_redeemed_cents + $shipping);
            $completed = $row->status === 'completed' && $row->delivery_status === 'delivered';
            $reconciled = $completed && $row->cash_status === 'reconciled' && $row->received_amount !== null && empty($row->discrepancy_reason)
                && ParcelFinance::cents((string) $row->amount) === $cashDue
                && ParcelFinance::cents((string) $row->received_amount) === $cashDue;
            if ($row->status !== 'cancelled') {
                $amounts['Expected COD'] += $cashDue;
                $amounts['Lubos Coins redeemed'] += (int) $row->coins_redeemed_cents;
                if ($row->commission_basis_points === null) {
                    $legacyRates++;
                } else {
                    $amounts['Expected commission'] += ParcelFinance::commission($subtotal, (int) $row->commission_basis_points);
                }
            }
            if ($row->amount !== null) {
                $cash = ParcelFinance::cents((string) $row->amount);
                $received = $row->received_amount === null ? 0 : ParcelFinance::cents((string) $row->received_amount);
                $amounts['COD collected'] += $cash;
                $amounts['Cash received by Logistics'] += $received;
                $amounts['Awaiting Logistics cash receipt'] += max(0, $cash - $received);
                if (! $reconciled) {
                    $amounts['Awaiting Admin reconciliation'] += $cash;
                }
                if ($row->discrepancy_reason || $cash !== $cashDue || ($row->received_amount !== null && $cash !== $received)) {
                    $discrepancies++;
                }
                if ($reconciled) {
                    $amounts['COD reconciled'] += $cash;
                }
            }
            if ($completed) {
                $discount = ParcelFinance::cents((string) $row->discount_amount);
                $commission = ParcelFinance::cents((string) ($row->commission_amount ?? '0.00'));
                $amounts['Gross product sales'] += $subtotal + $discount;
                $amounts['Seller voucher discounts'] += $discount;
                $amounts['Net product sales'] += $subtotal;
                $amounts['Shipping allocations'] += $shipping;
                $amounts['Recognized commission'] += $commission;
                $amounts['Seller proceeds'] += ParcelFinance::cents((string) ($row->seller_proceeds ?? '0.00'));
                $amounts['Reconciled commission'] += $reconciled ? $commission : 0;
                $cashMerchandise = $subtotal - (int) $row->coins_redeemed_cents;
                $cashBacked = $cashMerchandise === 0 || ($row->remittance_cents !== null && (int) $row->remittance_cents === $cashMerchandise);
                $coinsBacked = (int) $row->coins_redeemed_cents === 0 || ($row->coins_restored_at === null && (int) $row->allocated_coins === (int) $row->coins_redeemed_cents);
                $coinCommission = $subtotal ? ParcelFinance::proportion($commission, (int) $row->coins_redeemed_cents, $subtotal)[0] : 0;
                $amounts['Commission backed by platform cash receipt'] += $cashBacked ? $commission - $coinCommission : 0;
                $amounts['Commission backed by coin funding'] += $coinsBacked ? $coinCommission : 0;
                $amounts['Commission backed by platform funding'] += $cashBacked && $coinsBacked ? $commission : 0;
            }
            $amounts['Product cash received by Platform'] += (int) $row->remittance_cents;
            $amounts['Cash held by Logistics'] += max(0, ($row->received_amount === null ? 0 : ParcelFinance::cents((string) $row->received_amount)) - (int) $row->remittance_cents);
            if ($row->status !== 'cancelled' && $row->amount === null) {
                $amounts['Awaiting COD collection'] += $cashDue;
            }
            $amounts['Commission reversals'] += (int) $row->commission_reversal_cents;
            $amounts['Seller refund deductions'] += (int) $row->seller_debit_cents;
            $amounts['Manual seller payouts'] += (int) $row->payout_cents;
            $amounts['Manual buyer refunds'] += $row->refund_method ? (int) $row->cash_refunded_cents : (int) $row->refund_cents;
            $amounts['Approved refund value'] += (int) $row->refund_cents;
            $amounts['Lubos Coins refunded'] += (int) $row->coins_refunded_cents;
            $amounts['Seller recovery receipts'] += (int) $row->seller_recovered_cents;
            $amounts['Logistics refund liabilities'] += (int) $row->logistics_debit_cents;
            $amounts['Logistics recovery receipts'] += (int) $row->logistics_recovered_cents;
            $amounts['Shipping refunds'] += (int) $row->shipping_refund_cents;
            $storeBalances[$row->store_id] = ($storeBalances[$row->store_id] ?? 0)
                + ($completed ? ParcelFinance::cents((string) ($row->seller_proceeds ?? '0.00')) : 0)
                - (int) $row->seller_debit_cents - (int) $row->payout_cents + (int) $row->seller_recovered_cents;
        }
        $amounts['Unsettled seller balance'] = $amounts['Seller proceeds'] - $amounts['Seller refund deductions'] - $amounts['Manual seller payouts'] + $amounts['Seller recovery receipts'];
        $amounts['Seller recovery balance'] = array_sum(array_map(fn ($balance) => max(0, -$balance), $storeBalances));
        $amounts['Seller payable balances before payout holds'] = array_sum(array_map(fn ($balance) => max(0, $balance), $storeBalances));
        if (in_array($user->role, ['logistics', 'rider'], true)) {
            $amounts = array_intersect_key($amounts, array_flip(['COD collected', 'Cash received by Logistics', 'Awaiting Logistics cash receipt', 'Awaiting Admin reconciliation', 'COD reconciled', 'Shipping allocations']));
            if ($user->role === 'rider') {
                unset($amounts['Shipping allocations']);
            }
            if ($user->role === 'logistics') {
                $amounts['Logistics refund liabilities'] = (int) DB::table('parcel_returns')->join('deliveries', 'deliveries.seller_order_id', '=', 'parcel_returns.seller_order_id')->whereIn('deliveries.logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id'))->sum('logistics_debit_cents');
                $amounts['Logistics recovery receipts'] = (int) DB::table('parcel_returns')->join('deliveries', 'deliveries.seller_order_id', '=', 'parcel_returns.seller_order_id')->whereIn('deliveries.logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id'))->sum('logistics_recovered_cents');
            }
            $weekly = DB::table('weekly_rider_payments')->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id), fn ($q) => $q->whereIn('logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id')));
            $amounts['Weekly compensation agreed'] = (int) (clone $weekly)->sum('amount_cents');
            $amounts['Weekly compensation paid'] = (int) (clone $weekly)->whereNotNull('paid_at')->sum('amount_cents');
            $amounts['Weekly compensation outstanding'] = $amounts['Weekly compensation agreed'] - $amounts['Weekly compensation paid'];
            $fees = DB::table('rider_payments')->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id),
                fn ($q) => $q->whereIn('logistics_center_id', $user->logisticsCenters()->operational()->select('logistics_centers.id')));
            $amounts['Rider fees earned'] = (int) (clone $fees)->sum('amount_cents');
            $amounts['Rider fees paid'] = (int) (clone $fees)->whereNotNull('paid_at')->sum('amount_cents');
            $amounts['Rider fees outstanding'] = $amounts['Rider fees earned'] - $amounts['Rider fees paid'];
        }
        if ($user->role === 'seller') {
            $amounts['Recorded operating costs'] = (int) DB::table('seller_costs')->where('store_id', $user->store?->id ?? 0)->whereNull('voided_at')->sum('amount_cents');
            $amounts['Estimated profit after recorded costs'] = $amounts['Seller proceeds'] - $amounts['Seller refund deductions'] - $amounts['Recorded operating costs'];
        }
        if ($user->canAdmin('finance')) {
            $amounts['Outstanding coin liabilities'] = (int) DB::table('buyer_wallets')->sum('balance_cents');
            $amounts['Available refund reserve'] = (int) DB::table('refund_reserves')->where('id', 1)->value('available_cents');
        }
        if ($user->canAdmin('finance')) {
            $amounts['Pending approved refund offers'] = (int) DB::table('refund_offers as offers')->join('parcel_returns as returns', 'returns.refund_offer_id', '=', 'offers.id')
                ->where('returns.status', 'received')->whereColumn('offers.responsibility', 'returns.responsibility')
                ->where(fn ($q) => $q->where('offers.method', 'manual')->orWhereNotNull('offers.accepted_at'))
                ->selectRaw('COALESCE(SUM(offers.product_cents + offers.shipping_cents), 0) as cents')->value('cents');
        }
        $props = ['transactions' => $transactions, 'filters' => $filters, 'role' => $user->role, 'amounts' => $amounts, 'discrepancies' => $discrepancies, 'legacy_rates' => $legacyRates];

        return $request->routeIs('api.v1.*') ? response()->json(['data' => $props]) : Inertia::render('finance/overview', $props);
    }

    private function transaction(object $row, string $role): array
    {
        $expected = $row->cod_due_cents ?? (ParcelFinance::cents((string) $row->subtotal) - (int) $row->coins_redeemed_cents + ParcelFinance::cents((string) $row->shipping_fee));
        [$label, $description] = match (true) {
            $row->return_status === 'refunded' => ['Refunded', 'The approved refund was recorded. Review the return ledger for cash and coin amounts.'],
            $row->return_status !== null && ! in_array($row->return_status, ['rejected', 'closed'], true) => ['Refund review pending', 'Resolve the return and reviewed responsibility before a new seller payout.'],
            in_array($role, ['admin', 'seller'], true) && $row->payout_reference !== null => ['Paid to seller', 'Admin recorded the actual seller payout.'],
            $row->status === 'cancelled' => ['Cancelled', 'This parcel is cancelled; no COD collection is expected.'],
            $role !== 'rider' && $row->remittance_reference !== null => ['Received by Platform', 'Product cash receipt is confirmed. Seller settlement still requires eligibility review.'],
            $row->cash_status === 'reconciled' && ParcelFinance::cents((string) $row->subtotal) === (int) $row->coins_redeemed_cents => ['Awaiting seller settlement review', 'Merchandise is coin funded. No product cash receipt is required; settlement still requires valid coin backing and all payout checks.'],
            $row->cash_status === 'reconciled' => ['Ready for receipt confirmation', 'COD is reconciled. Admin must verify actual product funds before recording Platform receipt.'],
            $row->cash_status === 'handed_over' && $row->received_amount !== null => ['Received by Logistics', 'Admin reconciliation is required before product remittance.'],
            $row->cash_status === 'collected' || $row->cash_status === 'handed_over' => ['Awaiting rider remittance', 'The rider collected COD; Logistics must record the actual cash received.'],
            $row->delivery_status === 'delivered' => ['COD record needs review', 'Delivery is recorded without a COD collection record. Review fulfillment evidence; no receipt is inferred.'],
            default => ['Awaiting COD collection', 'The parcel has not reached recorded COD collection. Expected cash is not received money.'],
        };
        if ($row->discrepancy_reason || ($row->amount !== null && ParcelFinance::cents((string) $row->amount) !== $expected)
            || ($row->received_amount !== null && ParcelFinance::cents((string) $row->received_amount) !== $expected)) {
            [$label, $description] = ['Cash discrepancy under review', 'Resolve the documented cash discrepancy before remittance or payout.'];
        }
        $timeline = [
            ['label' => 'Order placed', 'at' => $row->placed_at, 'complete' => true, 'party' => $row->store_name],
            ['label' => 'Delivered', 'at' => $row->delivered_at, 'complete' => $row->delivery_status === 'delivered', 'party' => $row->rider_name],
            ['label' => 'COD collected', 'at' => $row->collected_at, 'complete' => $row->amount !== null, 'party' => $row->rider_name],
            ['label' => 'Received by Logistics', 'at' => $row->handed_over_at, 'complete' => $row->received_amount !== null, 'party' => $row->logistics_name],
            ['label' => 'COD reconciled', 'at' => $row->reconciled_at, 'complete' => $row->cash_status === 'reconciled', 'party' => 'Admin'],
        ];
        if ($role !== 'rider') {
            $timeline[] = ['label' => 'Platform receipt recorded', 'at' => $row->platform_recorded_at, 'complete' => $row->remittance_reference !== null, 'party' => 'Admin'];
        }
        if (in_array($role, ['admin', 'seller'], true)) {
            $timeline[] = ['label' => 'Seller payout recorded', 'at' => $row->paid_at, 'complete' => $row->payout_reference !== null, 'party' => $row->store_name];
        }
        if ($row->return_status !== null) {
            $timeline[] = ['label' => 'Refund recorded', 'at' => $row->refunded_at, 'complete' => $row->return_status === 'refunded', 'party' => 'Admin'];
        }
        $timeline = array_map(fn ($step) => [...$step, 'at' => $step['at'] ? Carbon::parse($step['at'])->toIso8601String() : null], $timeline);

        return ['parcel_id' => $row->id, 'store' => $row->store_name, 'logistics' => $row->logistics_name, 'tracking_reference' => $row->tracking_reference,
            'platform_received_cents' => $role === 'rider' || $row->remittance_cents === null ? null : (int) $row->remittance_cents,
            'paid_cents' => in_array($role, ['admin', 'seller'], true) && $row->payout_cents !== null ? (int) $row->payout_cents : null,
            'placed_at' => $row->placed_at ? Carbon::parse($row->placed_at)->toIso8601String() : null, 'cash_status' => $row->cash_status, 'status_label' => $label, 'status_description' => $description, 'timeline' => $timeline,
            'expected_cash_cents' => $expected,
            'collected_cents' => $row->amount === null ? null : ParcelFinance::cents((string) $row->amount), 'received_cents' => $row->received_amount === null ? null : ParcelFinance::cents((string) $row->received_amount),
            'collection_reference' => $row->collection_reference, 'handover_reference' => $row->handover_reference,
            'remittance_reference' => $role === 'rider' ? null : $row->remittance_reference,
            'payout_reference' => in_array($role, ['admin', 'seller'], true) ? $row->payout_reference : null];
    }
}
