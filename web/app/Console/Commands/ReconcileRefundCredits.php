<?php

namespace App\Console\Commands;

use App\Models\ParcelReturn;
use App\Models\User;
use App\Services\ApproveRefund;
use App\Services\ParcelFinance;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReconcileRefundCredits extends Command
{
    protected $signature = 'returns:reconcile-refund-credits {--apply : Apply reviewed, precisely valued obligations} {--actor= : Admin with dispute and finance permissions} {--return=* : Limit to case IDs}';

    protected $description = 'Dry-run by default: identify and safely reconcile approved but uncredited coin refunds';

    public function handle(ApproveRefund $approval): int
    {
        $actor = $this->option('actor') ? User::query()->find($this->option('actor')) : null;
        if ($this->option('apply') && (! $actor || ! $actor->canAdmin('disputes') || ! $actor->canAdmin('finance'))) {
            $this->error('Apply requires --actor identifying an authorized dispute and finance admin.');

            return self::FAILURE;
        }
        $count = $review = 0;
        $query = ParcelReturn::query()->where('refund_status', 'approved_uncredited')->when($this->option('return'), fn ($q, $ids) => $q->whereIn('id', $ids));
        foreach ($query->lazyById(100) as $case) {
            try {
                $data = $this->terms($case);
                if ($this->option('apply')) {
                    $approval->handle($case, $actor, $data, true);
                }
                $this->line('#'.$case->id.($this->option('apply') ? ' reconciled.' : ' terms ready for transactional validation; dry-run only.'));
                $count++;
            } catch (ValidationException $exception) {
                $this->warn('#'.$case->id.' needs admin review: '.implode(' ', array_merge(...array_values($exception->errors()))));
                $review++;
            }
        }
        $this->info("{$count} terms-ready/reconciled; {$review} require review. No historical cash refunds were converted.");

        return $review ? self::FAILURE : self::SUCCESS;
    }

    private function terms(ParcelReturn $case): array
    {
        $offer = $case->refund_offer_id ? DB::table('refund_offers')->where('id', $case->refund_offer_id)->first() : null;
        if ($case->cash_refunded_cents > 0 || ($case->refund_method && $case->refund_method !== 'coins') || ($offer && $offer->method !== 'coins')
            || ! in_array($case->responsibility, ['seller', 'logistics', 'buyer', 'platform'], true)
            || ! $case->responsibility_reviewed_at || $case->physical_return_required === null || ! $case->return_shipping_responsibility
            || (! $offer && (! $case->refund_cents || $case->product_refund_cents === null || $case->shipping_refund_cents === null))
            || ($offer && $offer->responsibility !== $case->responsibility)) {
            throw ValidationException::withMessages(['approval' => 'Complete exact financial terms and separate return-shipping responsibility in the admin approval interface.']);
        }
        $items = $case->requestedItems->map(fn ($item) => ['order_item_id' => $item->order_item_id, 'quantity' => $item->approved_quantity ?? $item->quantity, 'amount' => ParcelFinance::decimal($item->approved_cents ?? $item->requested_cents)])
            ->filter(fn ($item) => $item['quantity'] > 0)->values()->all();
        $products = (int) ($offer?->product_cents ?? $case->product_refund_cents);
        if ($case->requestedItems->isNotEmpty() && collect($items)->sum(fn ($item) => ParcelFinance::cents($item['amount'])) !== $products) {
            throw ValidationException::withMessages(['approval' => 'The historical approved total and item allocations disagree. Review the exact amounts first.']);
        }

        return ['items' => $items, 'product_cents' => $products,
            'shipping_amount' => ParcelFinance::decimal((int) ($offer?->shipping_cents ?? $case->shipping_refund_cents)),
            'responsibility' => $case->responsibility, 'return_shipping_responsibility' => $case->return_shipping_responsibility,
            'physical_return_required' => $case->physical_return_required, 'reason' => 'Reconciliation of precisely recorded approved coin obligation.'];
    }
}
