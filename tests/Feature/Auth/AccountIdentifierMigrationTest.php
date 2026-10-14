<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function identifierUpgradeDatabase(): string
{
    $old = DB::getDefaultConnection();
    config(['database.connections.account_upgrade' => array_replace(config('database.connections.sqlite'), ['database' => ':memory:'])]);
    DB::purge('account_upgrade');
    DB::setDefaultConnection('account_upgrade');
    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('email');
        $table->string('phone')->nullable();
    });

    return $old;
}

test('identifier migration refuses ambiguous legacy accounts before changing schema or values', function (array $records) {
    $old = identifierUpgradeDatabase();
    try {
        DB::table('users')->insert($records);
        $migration = require database_path('migrations/2026_10_13_041027_add_normalized_account_identifiers_and_registration_codes.php');
        expect(fn () => $migration->up())->toThrow(RuntimeException::class, 'Normalized account identifiers collide.');
        expect(Schema::hasColumn('users', 'email_normalized'))->toBeFalse();
        expect(Schema::hasTable('registration_email_codes'))->toBeFalse();
        expect(DB::table('users')->get(['email', 'phone'])->map(fn ($row) => (array) $row)->all())->toBe($records);
    } finally {
        DB::setDefaultConnection($old);
        DB::purge('account_upgrade');
    }
})->with([
    [[['email' => 'Old@Example.com', 'phone' => null], ['email' => 'old@example.com', 'phone' => null]]],
    [[['email' => 'one@example.com', 'phone' => '09171234567'], ['email' => 'two@example.com', 'phone' => '+639171234567']]],
]);

test('identifier migration preserves raw legacy values and can safely resume', function () {
    $old = identifierUpgradeDatabase();
    try {
        DB::table('users')->insert(['email' => ' Old@Example.com ', 'phone' => '+639171234567']);
        DB::table('users')->insert(['email' => 'other@example.com', 'phone' => 'old unrecognized phone']);
        $migration = require database_path('migrations/2026_10_13_041027_add_normalized_account_identifiers_and_registration_codes.php');
        $migration->up();
        $migration->up();
        $first = DB::table('users')->where('id', 1)->first();
        expect($first->email)->toBe(' Old@Example.com ');
        expect($first->phone)->toBe('+639171234567');
        expect($first->email_normalized)->toBe('old@example.com');
        expect($first->phone_normalized)->toBe('09171234567');
        expect(DB::table('users')->where('id', 2)->value('phone_normalized'))->toBeNull();
    } finally {
        DB::setDefaultConnection($old);
        DB::purge('account_upgrade');
    }
});
