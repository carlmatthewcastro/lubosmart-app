<?php

namespace App\Http\Controllers;

use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Services\Admin\AuditLogger;
use App\Services\ParcelFinance;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RefundFundingController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->canAdmin('finance'), 403);
        $correctionKey = DB::connection()->getDriverName() === 'sqlite' ? "'correction:' || wallet.id" : "CONCAT('correction:', wallet.id)";

        return Inertia::render('finance/refund-funding', ['available' => (int) DB::table('refund_reserves')->where('id', 1)->value('available_cents'),
            'liabilities' => (int) DB::table('buyer_wallets')->sum('balance_cents'),
            'recoveries' => ParcelReturn::query()->where('status', 'refunded')->where(fn ($q) => $q->whereColumn('seller_debit_cents', '>', 'seller_recovered_cents')->orWhereColumn('logistics_debit_cents', '>', 'logistics_recovered_cents'))
                ->with(['sellerOrder.store:id,name', 'sellerOrder.delivery:id,seller_order_id,tracking_reference'])->latest('id')->paginate(15, ['*'], 'recovery_page')->withQueryString()
                ->through(fn ($return) => ['id' => $return->id, 'seller_debit_cents' => $return->seller_debit_cents, 'seller_recovered_cents' => $return->seller_recovered_cents,
                    'logistics_debit_cents' => $return->logistics_debit_cents, 'logistics_recovered_cents' => $return->logistics_recovered_cents,
                    'seller_order' => ['store' => ['name' => $return->sellerOrder->store->name], 'delivery' => ['tracking_reference' => $return->sellerOrder->delivery?->tracking_reference]]]),
            'walletEntries' => DB::table('wallet_transactions as wallet')->join('users as buyers', 'buyers.id', '=', 'wallet.buyer_id')
                ->leftJoin('parcel_returns as returns', 'returns.id', '=', 'wallet.parcel_return_id')
                ->leftJoin('seller_orders as parcels', 'parcels.id', '=', 'returns.seller_order_id')
                ->leftJoin('deliveries', 'deliveries.seller_order_id', '=', 'parcels.id')
                ->leftJoin('buyer_wallets as balances', 'balances.buyer_id', '=', 'wallet.buyer_id')
                ->select(['wallet.id', 'wallet.type', 'wallet.amount_cents', 'wallet.reference', 'wallet.parcel_return_id', 'wallet.created_at', 'buyers.name as buyer', 'deliveries.tracking_reference', 'balances.balance_cents'])
                ->selectRaw("NOT EXISTS (SELECT 1 FROM wallet_transactions corrections WHERE corrections.operation_key = $correctionKey) as uncorrected")
                ->selectRaw("(EXISTS (SELECT 1 FROM refund_fund_entries liabilities WHERE liabilities.parcel_return_id = wallet.parcel_return_id AND liabilities.type = 'coin_refund_liability') AND NOT EXISTS (SELECT 1 FROM refund_fund_entries backing WHERE backing.parcel_return_id = wallet.parcel_return_id AND backing.type = 'refund_allocation')) as liability_based")
                ->orderByDesc('wallet.id')->paginate(20, ['*'], 'wallet_page')->withQueryString()
                ->through(fn ($entry) => [...(array) $entry, 'created_at' => $entry->created_at ? Carbon::parse($entry->created_at)->toIso8601String() : null]),
            'entries' => DB::table('refund_fund_entries')->orderByDesc('id')->paginate(20)->withQueryString()]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        abort_unless($request->user()->canAdmin('finance'), 403);
        $data = $request->validate(['amount' => 'required|numeric|decimal:0,2|min:0.01|max:99999999.99',
            'source' => 'required|in:platform_advance,seller_recovery,logistics_recovery', 'reference' => 'required|string|min:3|max:100|unique:refund_fund_entries,reference',
            'parcel_return_id' => 'required_unless:source,platform_advance|nullable|integer|exists:parcel_returns,id', 'notes' => 'required|string|min:10|max:1000']);
        DB::transaction(function () use ($request, $data, $audit) {
            $amount = ParcelFinance::cents((string) $data['amount']);
            $return = null;
            if ($data['source'] !== 'platform_advance') {
                $source = ParcelReturn::query()->findOrFail($data['parcel_return_id']);
                Store::query()->whereKey($source->sellerOrder->store_id)->lockForUpdate()->firstOrFail();
                SellerOrder::query()->whereKey($source->seller_order_id)->lockForUpdate()->firstOrFail();
                $return = ParcelReturn::query()->whereKey($source->id)->lockForUpdate()->firstOrFail();
                abort_unless($return->status === 'refunded', 409, 'Only a finalized refund liability can receive repayment.');
                if ($data['source'] === 'seller_recovery') {
                    $parcels = SellerOrder::query()->where('store_id', $source->sellerOrder->store_id)->where('status', 'completed');
                    $earned = (int) (clone $parcels)->selectRaw('COALESCE(SUM(ROUND(seller_proceeds * 100)), 0) as cents')->value('cents');
                    $paid = (int) DB::table('seller_payouts')->whereIn('seller_order_id', (clone $parcels)->select('id'))->sum('amount_cents');
                    $debits = (int) DB::table('parcel_returns')->whereIn('seller_order_id', (clone $parcels)->select('id'))->selectRaw('COALESCE(SUM(seller_debit_cents - seller_recovered_cents), 0) as cents')->value('cents');
                    abort_unless($amount <= max(0, $paid + $debits - $earned) && $amount <= $return->seller_debit_cents - $return->seller_recovered_cents, 409, 'Repayment cannot exceed this seller actual outstanding recovery balance.');
                    $return->increment('seller_recovered_cents', $amount);
                } else {
                    abort_unless($amount <= $return->logistics_debit_cents - $return->logistics_recovered_cents, 409, 'Repayment cannot exceed the outstanding Logistics liability.');
                    $return->increment('logistics_recovered_cents', $amount);
                }
            }
            DB::table('refund_reserves')->where('id', 1)->lockForUpdate()->first();
            $id = DB::table('refund_fund_entries')->insertGetId(['amount_cents' => $amount, 'type' => $data['source'], 'actor_id' => $request->user()->id,
                'parcel_return_id' => $return?->id, 'reference' => $data['reference'], 'operation_key' => 'deposit:'.$data['reference'], 'notes' => $data['notes'], 'created_at' => now()]);
            DB::table('refund_reserves')->where('id', 1)->increment('available_cents', $amount);
            $audit->record(['actor_id' => $request->user()->id, 'subject_type' => 'refund_funding', 'subject_id' => $id, 'action' => 'actual_refund_funding_recorded', 'changes' => [...$data, 'amount_cents' => $amount]]);
        }, 3);

        return back()->with('status', 'Actual earmarked funding recorded. No bank transfer was initiated.');
    }
}
