<?php

use App\Models\ParcelReturn;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require_once __DIR__.'/../Support/RefundScenario.php';

test('populated refund upgrade preserves cash wallet and custody facts without issuing credit or inventing proof', function () {
    $original = DB::getDefaultConnection();
    config(['database.connections.refund_upgrade' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('refund_upgrade');
    Schema::clearResolvedInstance('db.schema');
    try {
        $paths = collect(glob(database_path('migrations/*.php')))->filter(fn ($path) => basename($path) < '2026_11_16_120000_')
            ->map(fn ($path) => 'database/migrations/'.basename($path))->values()->all();
        Artisan::call('migrate', ['--database' => 'refund_upgrade', '--path' => $paths, '--force' => true]);
        $f = refundScenario();
        $approved = ParcelReturn::query()->create(['workflow_version' => 2, 'seller_order_id' => $f['parcel']->id, 'buyer_id' => $f['buyer']->id,
            'status' => 'collected', 'rider_id' => $f['rider']->id, 'collected_at' => now(), 'reason' => 'Historical approval without a financial decision.']);
        $second = refundScenario();
        $credited = ParcelReturn::query()->create(['workflow_version' => 2, 'seller_order_id' => $second['parcel']->id, 'buyer_id' => $second['buyer']->id,
            'status' => 'refunded', 'reason' => 'Historical credited return.', 'refund_method' => 'coins', 'coins_refunded_cents' => 10000,
            'refund_cents' => 10000, 'product_refund_cents' => 10000, 'shipping_refund_cents' => 0, 'refunded_at' => now(), 'received_at' => now(),
            'seller_debit_cents' => 9000, 'commission_reversal_cents' => 1000, 'refund_reference' => 'HISTORICAL-COIN-REFUND']);
        $credited->events()->create(['actor_id' => $second['seller']->id, 'action' => 'receive', 'notes' => 'Actual historical seller receipt.']);
        DB::table('buyer_wallets')->insert(['buyer_id' => $second['buyer']->id, 'balance_cents' => 10000]);
        DB::table('wallet_transactions')->insert(['buyer_id' => $second['buyer']->id, 'actor_id' => $second['admin']->id, 'order_id' => $second['parcel']->order_id,
            'parcel_return_id' => $credited->id, 'type' => 'approved_refund_credit', 'amount_cents' => 10000, 'balance_after_cents' => 10000,
            'reference' => 'LC-HISTORICAL', 'operation_key' => 'return:'.$credited->id.':credit', 'created_at' => now()]);
        $snapshots = [];
        foreach (['buyer_wallets', 'wallet_transactions', 'cod_collections', 'seller_orders', 'parcel_returns'] as $table) {
            $snapshots[$table] = DB::table($table)->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        }
        Artisan::call('migrate', ['--database' => 'refund_upgrade', '--force' => true]);
        foreach ($snapshots as $table => $records) {
            foreach ($records as $record) {
                $after = (array) DB::table($table)->where('id', $record['id'])->first();
                expect(array_intersect_key($after, $record))->toBe($record);
            }
        }
        expect($approved->fresh()->refund_status)->toBe('approved_uncredited');
        expect($approved->fresh()->task->status)->toBe('collected');
        expect($credited->fresh()->refund_status)->toBe('credited');
        expect($credited->fresh()->task->confirmed_by)->toBe($second['seller']->id);
        expect(DB::table('return_task_proofs')->count())->toBe(0);
        expect(DB::table('wallet_transactions')->count())->toBe(1);
    } finally {
        DB::setDefaultConnection($original);
        Schema::clearResolvedInstance('db.schema');
        DB::purge('refund_upgrade');
    }
});
