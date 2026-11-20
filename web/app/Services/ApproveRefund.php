<?php

namespace App\Services;

use App\Models\Address;
use App\Models\LogisticsCenter;
use App\Models\ParcelReturn;
use App\Models\ReturnTask;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ApproveRefund
{
    public function handle(ParcelReturn $case, User $actor, array $data, bool $reconcile = false): void
    {
        abort_unless($actor->canAdmin('disputes') && $actor->canAdmin('finance'), 403);
        DB::transaction(function () use ($case, $actor, $data, $reconcile) {
            $source = $case->sellerOrder;
            Store::query()->whereKey($source->store_id)->lockForUpdate()->firstOrFail();
            $parcel = SellerOrder::query()->whereKey($source->id)->lockForUpdate()->firstOrFail();
            $case = ParcelReturn::query()->whereKey($case->id)->lockForUpdate()->firstOrFail();
            $fingerprint = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
            if (in_array($case->refund_status, ['credited', 'approved_no_refund'], true)) {
                if (! $reconcile && $case->approval_fingerprint !== $fingerprint) {
                    throw ValidationException::withMessages(['approval' => 'This refund was already credited. Refresh to review the saved decision.']);
                }

                return;
            }
            abort_unless(in_array($case->refund_status, ['pending', 'approved_uncredited'], true), 409, 'This case is no longer available for approval.');
            if ($case->buyer_id !== $parcel->order->buyer_id) {
                throw ValidationException::withMessages(['approval' => 'The return buyer does not match the original purchase. Finance must review the historical link before any credit.']);
            }
            if ($case->cash_refunded_cents > 0 || ($case->refunded_at && $case->refund_method !== 'coins' && $case->refund_cents > 0)) {
                throw ValidationException::withMessages(['approval' => 'This case records an external cash refund. Finance must review it; no additional coin credit was issued.']);
            }
            if (! in_array($data['responsibility'], ['seller', 'logistics', 'buyer', 'platform'], true)
                || ($data['physical_return_required'] ? ! in_array($data['return_shipping_responsibility'], ['seller', 'logistics', 'buyer', 'platform'], true) : $data['return_shipping_responsibility'] !== 'not_required')) {
                throw ValidationException::withMessages(['return_shipping_responsibility' => 'Complete the separate refund and return shipping decisions before approval.']);
            }
            if ($data['physical_return_required'] && ! $case->task()->exists()
                && ! LogisticsCenter::query()->operational()->whereKey($parcel->delivery?->logistics_center_id)->exists()) {
                throw ValidationException::withMessages(['physical_return_required' => 'The original logistics provider is not operational. Resolve provider access before creating transport, or explicitly decide on a no-return refund.']);
            }
            if (! $reconcile) {
                abort_unless($parcel->status === 'completed' && $parcel->delivery?->status === 'delivered', 409, 'The original parcel must have a recorded delivery.');
            }
            $paidCash = DB::table('cod_collections')->where('delivery_id', $parcel->delivery?->id)->lockForUpdate()->first();
            $expectedCash = ParcelFinance::expected($parcel);
            if ($expectedCash > 0 && (! $paidCash || ParcelFinance::cents((string) $paidCash->amount) !== $expectedCash)) {
                throw ValidationException::withMessages(['approval' => 'The recorded buyer payment does not match this parcel. Review payment evidence before approving.']);
            }
            if ($parcel->coins_redeemed_cents > 0 && ! $parcel->coinAllocation()->whereNull('restored_at')->where('amount_cents', $parcel->coins_redeemed_cents)->exists()) {
                throw ValidationException::withMessages(['approval' => 'The original coin payment allocation requires finance review.']);
            }
            $eligibility = app(ReturnEligibility::class);
            $requested = $case->requestedItems()->get()->keyBy('order_item_id');
            if ($requested->isEmpty() && ! $reconcile) {
                $reviewed = $eligibility->select($parcel, $data['items'], $case->id);
                $case->requestedItems()->createMany($reviewed);
                $requested = $case->requestedItems()->get()->keyBy('order_item_id');
            }
            $products = 0;
            if ($requested->isNotEmpty()) {
                $selected = $eligibility->select($parcel, $data['items'], $case->id);
                foreach ($selected as $index => $row) {
                    $original = $requested->get($row['order_item_id']);
                    if (! $original || $row['quantity'] > $original->quantity || $row['requested_cents'] > $original->requested_cents) {
                        throw ValidationException::withMessages(["items.$index.amount" => 'Approval must fit the buyer’s requested items, quantities, and amounts.']);
                    }
                    $products += $row['requested_cents'];
                }
            } else {
                if (! $reconcile) {
                    throw ValidationException::withMessages(['items' => 'This legacy case needs an exact historical amount review through reconciliation.']);
                }
                $products = (int) $data['product_cents'];
            }
            $shipping = ParcelFinance::cents((string) $data['shipping_amount']);
            if ($reconcile && ($products !== (int) $data['product_cents'] || ($case->refund_cents !== null && $products + $shipping !== $case->refund_cents))) {
                throw ValidationException::withMessages(['approval' => 'The historical approved total and item allocation disagree. Complete an exact amount review before reconciliation.']);
            }
            if ($requested->isNotEmpty() && $case->workflow_version >= 3 && $shipping > $case->requested_shipping_cents) {
                throw ValidationException::withMessages(['shipping_amount' => 'Approval cannot exceed the requested original shipping refund.']);
            }
            $previous = $parcel->parcelReturns()->where('id', '!=', $case->id)->whereNotNull('refunded_at')->get();
            $net = ParcelFinance::cents($parcel->subtotal);
            if ($products > $net - $previous->sum('product_refund_cents') || $shipping > $eligibility->shippingRemaining($parcel, $case->id)
                || ($products + $shipping === 0 && ! $data['physical_return_required']) || $products + $shipping > $net + ParcelFinance::cents($parcel->shipping_fee) - $previous->sum('refund_cents')) {
                throw ValidationException::withMessages(['shipping_amount' => 'The refund exceeds the remaining actual paid amount, or has no refundable value.']);
            }
            $split = ParcelFinance::refundableProducts($parcel, $products);
            // Calculate cumulative reversals to avoid repeated rounding over-reversing commission.
            $priorProducts = (int) $previous->sum('product_refund_cents');
            $sellerProducts = (int) $previous->where('responsibility', 'seller')->sum('product_refund_cents');
            $cumulative = ParcelFinance::refundableProducts($parcel, $sellerProducts + $products);
            $priorReversal = (int) $previous->sum('commission_reversal_cents');
            $split['commission_reversal_cents'] = $data['responsibility'] === 'seller'
                ? max(0, min($products, $cumulative['commission_reversal_cents'] - $priorReversal)) : 0;
            $split['seller_debit_cents'] = $data['responsibility'] === 'seller' ? $products - $split['commission_reversal_cents'] + $shipping : 0;
            $split['shipping_refund_cents'] = $shipping;
            $total = $products + $shipping;
            $restore = $net ? ParcelFinance::proportion($priorProducts + $products, (int) $parcel->coins_redeemed_cents, $net)[0]
                - ParcelFinance::proportion($priorProducts, (int) $parcel->coins_redeemed_cents, $net)[0] : 0;
            $newCredit = $total - $restore;
            $existing = DB::table('wallet_transactions')->where('parcel_return_id', $case->id)->whereIn('type', ['approved_refund_credit', 'return_restoration'])->get();
            foreach ($existing as $entry) {
                $expected = $entry->type === 'return_restoration' ? $restore : $newCredit;
                $key = 'return:'.$case->id.($entry->type === 'return_restoration' ? ':restore' : ':credit');
                if ((int) $entry->buyer_id !== $case->buyer_id || (int) $entry->amount_cents !== $expected || $entry->operation_key !== $key) {
                    throw ValidationException::withMessages(['approval' => 'Historical wallet entries conflict with this credit; finance must review them.']);
                }
            }
            if (DB::table('wallet_transactions')->where('parcel_return_id', $case->id)->whereIn('type', ['corrective_debit', 'corrective_credit'])->exists()) {
                throw ValidationException::withMessages(['approval' => 'This refund has corrections and requires manual finance review.']);
            }
            $ledgerKey = 'refund-liability:'.$case->id;
            $liability = DB::table('refund_fund_entries')->where('operation_key', $ledgerKey)->first();
            if ($liability && ((int) $liability->amount_cents !== $total || (int) $liability->parcel_return_id !== $case->id || $liability->type !== 'coin_refund_liability')) {
                throw ValidationException::withMessages(['approval' => 'The existing refund liability conflicts with this amount. Finance review is required.']);
            }
            if (! $liability) {
                DB::table('refund_fund_entries')->insert(['parcel_return_id' => $case->id, 'actor_id' => $actor->id,
                    'amount_cents' => $total, 'type' => 'coin_refund_liability', 'operation_key' => $ledgerKey,
                    'reference' => 'RFL-'.Str::uuid(), 'notes' => 'Spendable coin liability; no cash movement. Refund responsibility: '.$data['responsibility'].'; return shipping: '.$data['return_shipping_responsibility'], 'created_at' => now()]);
            }
            app(LubosCoins::class)->refund($case, $actor, $restore, $newCredit);
            if ($requested->isNotEmpty()) {
                $case->requestedItems()->update(['approved_quantity' => 0, 'approved_cents' => 0]);
                foreach ($selected as $row) {
                    $case->requestedItems()->where('order_item_id', $row['order_item_id'])->update(['approved_quantity' => $row['quantity'], 'approved_cents' => $row['requested_cents']]);
                }
            }
            $required = (bool) $data['physical_return_required'];
            $case->forceFill([...$split, 'refund_status' => $total > 0 ? 'credited' : 'approved_no_refund', 'refund_method' => 'coins', 'refund_cents' => $total,
                'coins_refunded_cents' => $total, 'cash_refunded_cents' => 0, 'refund_reference' => $case->refund_reference ?? 'LCRF-'.Str::uuid(),
                'refunded_at' => now(), 'refunded_by' => $actor->id, 'decided_by' => $actor->id, 'decision_reason' => $data['reason'],
                'responsibility' => $data['responsibility'], 'responsibility_reason' => $data['reason'], 'responsibility_reviewed_by' => $actor->id,
                'responsibility_reviewed_at' => now(), 'return_shipping_responsibility' => $data['return_shipping_responsibility'],
                'physical_return_required' => $required, 'approval_fingerprint' => $fingerprint,
                // Compatibility projection only; custody lives on return_tasks.
                'status' => 'refunded', 'logistics_debit_cents' => $data['responsibility'] === 'logistics' ? $total : 0,
                'platform_expense_cents' => in_array($data['responsibility'], ['platform', 'buyer'], true) ? $total : 0])->save();
            if ($required) {
                $order = $parcel->order;
                ReturnTask::query()->firstOrCreate(['parcel_return_id' => $case->id], [
                    'reference' => 'RT-'.Str::uuid(), 'status' => 'approved',
                    'buyer_address' => ['recipient_name' => $order->shipping_recipient_name, 'phone' => $order->shipping_phone,
                        'line1' => $order->shipping_line1, 'barangay' => $order->shipping_barangay, 'city' => $order->shipping_city, 'province' => $order->shipping_province],
                    'seller_address' => $parcel->shipping_quote['pickup_address'] ?? Address::query()->where('user_id', $parcel->store->user_id)->orderByDesc('is_default')->first()?->only(['recipient_name', 'phone', 'line1', 'barangay', 'city', 'province']),
                ]);
                foreach (app(NotificationInbox::class)->logistics($parcel->delivery?->logistics_center_id) as $operator) {
                    app(NotificationInbox::class)->send($operator, 'return.assign', 'return:'.$case->id, 'Return pickup requires assignment', 'Arrange the linked approved physical return. No second financial approval is required.', 'return', $case->id, true);
                }
            }
            $case->events()->create(['actor_id' => $actor->id, 'action' => 'refund_approved', 'notes' => $data['reason'].' Coins credited: '.ParcelFinance::decimal($total)]);
            app(AuditLogger::class)->record(['actor_id' => $actor->id, 'subject_type' => 'parcel_return', 'subject_id' => $case->id,
                'action' => 'refund_approved', 'changes' => ['refund_cents' => $total, 'physical_return_required' => $required, 'reason' => $data['reason']]]);
        }, 3);
    }
}
