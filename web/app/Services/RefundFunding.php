<?php

namespace App\Services;

use App\Models\ParcelReturn;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RefundFunding
{
    /** Caller holds the store, parcel and return locks before the shared reserve lock. */
    public function allocate(ParcelReturn $return, int $amount, User $actor): void
    {
        $reserve = DB::table('refund_reserves')->where('id', 1)->lockForUpdate()->first();
        if ($amount < 0 || ! $reserve || $reserve->available_cents < $amount) {
            throw ValidationException::withMessages(['amount' => 'Record enough actual available refund funding before issuing this refund or credit.']);
        }
        abort_if(DB::table('refund_fund_entries')->where('operation_key', 'refund:'.$return->id)->exists(), 409, 'This refund is already funded.');
        DB::table('refund_reserves')->where('id', 1)->decrement('available_cents', $amount);
        DB::table('refund_fund_entries')->insert(['amount_cents' => -$amount, 'type' => 'refund_allocation', 'parcel_return_id' => $return->id,
            'actor_id' => $actor->id, 'operation_key' => 'refund:'.$return->id, 'reference' => 'RETURN-'.$return->id,
            'notes' => 'Approved '.$return->responsibility.' responsibility; recovery remains separate from cash backing.', 'created_at' => now()]);
    }
}
