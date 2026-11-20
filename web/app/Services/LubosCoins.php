<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LubosCoins
{
    /** Largest remainder allocation. Store IDs break equal-remainder ties. */
    public function allocation(int $requested, array $netByStore): array
    {
        ksort($netByStore, SORT_NUMERIC);
        $total = array_sum($netByStore);
        if ($requested < 0 || $requested > $total) {
            throw ValidationException::withMessages(['coins_to_redeem_cents' => 'Coins can cover eligible merchandise only. Shipping remains payable in cash.']);
        }
        $result = $remainders = [];
        foreach ($netByStore as $id => $net) {
            [$result[$id], $remainders[$id]] = $total ? ParcelFinance::proportion($requested, $net, $total) : [0, 0];
        }
        $remaining = $requested - array_sum($result);
        arsort($remainders, SORT_NUMERIC);
        foreach ($remainders as $id => $remainder) {
            if ($remaining-- <= 0) {
                break;
            }
            $result[$id]++;
        }

        return $result;
    }

    private function post(User $buyer, User $actor, int $amount, string $type, string $key, ?int $orderId = null, ?int $returnId = null): int
    {
        // All callers execute inside their financial transaction; the buyer serializes wallet creation.
        User::query()->whereKey($buyer->id)->lockForUpdate()->firstOrFail();
        abort_unless($buyer->role === 'buyer', 403);
        DB::table('buyer_wallets')->insertOrIgnore(['buyer_id' => $buyer->id, 'balance_cents' => 0]);
        $wallet = DB::table('buyer_wallets')->where('buyer_id', $buyer->id)->lockForUpdate()->first();
        $existing = DB::table('wallet_transactions')->where('operation_key', $key)->first();
        if ($existing) {
            abort_unless($existing->buyer_id === $buyer->id && (int) $existing->amount_cents === $amount && $existing->type === $type, 409);

            return $existing->id;
        }
        $balance = (int) $wallet->balance_cents + $amount;
        if ($balance < 0) {
            throw ValidationException::withMessages(['coins_to_redeem_cents' => 'Your available Lubos Coins changed. Review your balance before checkout.']);
        }
        $id = DB::table('wallet_transactions')->insertGetId(['buyer_id' => $buyer->id, 'actor_id' => $actor->id, 'amount_cents' => $amount,
            'balance_after_cents' => $balance, 'type' => $type, 'operation_key' => $key, 'reference' => 'LC-'.Str::uuid(),
            'order_id' => $orderId, 'parcel_return_id' => $returnId, 'created_at' => now()]);
        DB::table('buyer_wallets')->where('id', $wallet->id)->update(['balance_cents' => $balance]);

        return $id;
    }

    public function redeem(User $buyer, Order $order, int $amount): void
    {
        if ($amount === 0) {
            return;
        }
        $transaction = $this->post($buyer, $buyer, -$amount, 'checkout_redemption', 'checkout:'.$order->id, $order->id);
        foreach ($order->sellerOrders()->orderBy('id')->get() as $parcel) {
            if ($parcel->coins_redeemed_cents > 0) {
                DB::table('coin_allocations')->insert(['seller_order_id' => $parcel->id,
                    'wallet_transaction_id' => $transaction, 'amount_cents' => $parcel->coins_redeemed_cents, 'created_at' => now()]);
            }
        }
    }

    public function cancel(Order $order, User $buyer): void
    {
        $allocations = DB::table('coin_allocations')->whereIn('seller_order_id', $order->sellerOrders()->select('id'))->whereNull('restored_at')->orderBy('id')->lockForUpdate()->get();
        $amount = (int) $allocations->sum('amount_cents');
        if (! $amount) {
            return;
        }
        $this->post($buyer, $buyer, $amount, 'cancellation_restoration', 'cancel:'.$order->id, $order->id);
        DB::table('coin_allocations')->whereIn('id', $allocations->pluck('id'))->update(['restored_at' => now()]);
    }

    /** The caller records the refund liability in the same transaction. */
    public function refund(ParcelReturn $return, User $actor, int $originalCoins, int $newCredit): void
    {
        $buyer = User::query()->findOrFail($return->buyer_id);
        if ($originalCoins > 0) {
            $this->post($buyer, $actor, $originalCoins, 'return_restoration', 'return:'.$return->id.':restore', $return->sellerOrder->order_id, $return->id);
        }
        if ($newCredit > 0) {
            $this->post($buyer, $actor, $newCredit, 'approved_refund_credit', 'return:'.$return->id.':credit', $return->sellerOrder->order_id, $return->id);
        }
        if ($originalCoins + $newCredit > 0) {
            app(NotificationInbox::class)->send($buyer->id, 'coins.credit', 'return:'.$return->id, 'Lubos Coins credited', 'Your approved refund credits are available in your wallet.', 'wallet', $buyer->id);
        }
    }

    public function correct(User $actor, int $transactionId, string $reason): void
    {
        abort_unless($actor->canAdmin('finance'), 403);
        DB::transaction(function () use ($actor, $transactionId, $reason) {
            $entry = DB::table('wallet_transactions')->where('id', $transactionId)->firstOrFail();
            abort_unless(in_array($entry->type, ['approved_refund_credit', 'return_restoration', 'corrective_debit'], true) && $entry->parcel_return_id, 409, 'Only a refund credit or its corrective debit can be corrected.');
            $return = ParcelReturn::query()->findOrFail($entry->parcel_return_id);
            abort_unless((int) $entry->buyer_id === $return->buyer_id && (! $entry->order_id || (int) $entry->order_id === $return->sellerOrder->order_id), 409, 'The wallet entry must belong to this return buyer and order.');
            Store::query()->whereKey($return->sellerOrder->store_id)->lockForUpdate()->firstOrFail();
            SellerOrder::query()->whereKey($return->seller_order_id)->lockForUpdate()->firstOrFail();
            ParcelReturn::query()->whereKey($return->id)->lockForUpdate()->firstOrFail();
            $liabilityCredit = DB::table('refund_fund_entries')->where('operation_key', 'refund-liability:'.$return->id)->exists()
                && ! DB::table('refund_fund_entries')->where('parcel_return_id', $return->id)->where('type', 'refund_allocation')->exists();
            $reserve = DB::table('refund_reserves')->where('id', 1)->lockForUpdate()->first();
            $amount = -(int) $entry->amount_cents;
            abort_if(DB::table('wallet_transactions')->where('operation_key', 'correction:'.$entry->id)->exists(), 409, 'This entry has already been corrected.');
            if (! $liabilityCredit && $amount > 0 && $reserve->available_cents < $amount) {
                throw ValidationException::withMessages(['transaction_id' => 'Available backing is required to restore corrected credit.']);
            }
            $id = $this->post(User::query()->findOrFail($entry->buyer_id), $actor, $amount, $amount < 0 ? 'corrective_debit' : 'corrective_credit', 'correction:'.$entry->id, $entry->order_id, $return->id);
            DB::table('wallet_transactions')->where('id', $id)->update(['notes' => $reason]);
            if (! $liabilityCredit) {
                DB::table('refund_reserves')->where('id', 1)->update(['available_cents' => (int) $reserve->available_cents - $amount]);
            }
            DB::table('refund_fund_entries')->insert(['amount_cents' => $liabilityCredit ? $amount : -$amount, 'type' => $liabilityCredit ? 'coin_liability_correction' : 'wallet_correction', 'parcel_return_id' => $return->id, 'actor_id' => $actor->id,
                'operation_key' => 'wallet-correction:'.$id, 'reference' => 'CORRECTION-'.$id, 'notes' => $reason, 'created_at' => now()]);
            app(AuditLogger::class)->record(['actor_id' => $actor->id, 'subject_type' => 'refund_funding', 'subject_id' => $id, 'action' => 'wallet_correction', 'changes' => ['original_transaction_id' => $entry->id, 'amount_cents' => $amount, 'reason' => $reason]]);
        }, 3);
    }
}
