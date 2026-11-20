<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('release preflight passes a migrated database without writing financial records', function () {
    $before = DB::table('wallet_transactions')->count();
    $this->artisan('returns:release-check')->expectsOutputToContain('Refund technical preflight passed')->assertSuccessful();
    expect(DB::table('wallet_transactions')->count())->toBe($before);
});

test('release preflight rejects a missing refund credit uniqueness constraint', function () {
    Schema::table('wallet_transactions', fn (Blueprint $table) => $table->dropUnique(['operation_key']));
    $this->artisan('returns:release-check')->expectsOutputToContain('FAIL wallet_transactions idempotency constraint')->assertFailed();
});

test('release preflight rejects pending migrations even when tables already exist', function () {
    DB::table('migrations')->where('migration', '2026_11_16_120000_separate_refund_credit_and_return_tasks')->delete();
    $this->artisan('returns:release-check')->expectsOutputToContain('1 pending')->assertFailed();
});
