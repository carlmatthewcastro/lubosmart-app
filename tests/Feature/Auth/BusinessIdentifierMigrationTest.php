<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function businessUpgradeDatabase(): string
{
    $previous = DB::getDefaultConnection();
    config(['database.connections.business_upgrade' => array_replace(config('database.connections.sqlite'), ['database' => ':memory:'])]);
    DB::purge('business_upgrade');
    DB::setDefaultConnection('business_upgrade');
    Schema::create('stores', function (Blueprint $table) {
        $table->id();
        $table->string('name', 160);
    });
    Schema::create('registration_applications', function (Blueprint $table) {
        $table->id();
        $table->string('status')->default('draft');
    });

    return $previous;
}

test('business identifier migration refuses legacy collisions before changing schema', function () {
    $previous = businessUpgradeDatabase();
    try {
        DB::table('stores')->insert([['name' => ' Old Shop '], ['name' => 'old shop']]);
        $migration = require database_path('migrations/2026_10_13_045000_add_account_creation_contract_to_applications_and_stores.php');
        expect(fn () => $migration->up())->toThrow(RuntimeException::class, 'Duplicate normalized shop names exist');
        expect(Schema::hasColumn('stores', 'name_normalized'))->toBeFalse();
        expect(Schema::hasColumn('registration_applications', 'registration_contract'))->toBeFalse();
        expect(DB::table('stores')->pluck('name')->all())->toBe([' Old Shop ', 'old shop']);
    } finally {
        DB::setDefaultConnection($previous);
        DB::purge('business_upgrade');
    }
});

test('business identifier migration preserves old names statuses and can resume', function () {
    $previous = businessUpgradeDatabase();
    try {
        DB::table('stores')->insert(['name' => ' Old Shop '.str_repeat('a', 60)]);
        DB::table('registration_applications')->insert(['status' => 'rejected']);
        $migration = require database_path('migrations/2026_10_13_045000_add_account_creation_contract_to_applications_and_stores.php');
        $migration->up();
        $migration->up();
        expect(DB::table('stores')->value('name'))->toBe(' Old Shop '.str_repeat('a', 60));
        expect(DB::table('stores')->value('name_normalized'))->toBe('old shop '.str_repeat('a', 60));
        expect(DB::table('registration_applications')->value('status'))->toBe('rejected');
        expect(DB::table('registration_applications')->value('registration_contract'))->toBeNull();
    } finally {
        DB::setDefaultConnection($previous);
        DB::purge('business_upgrade');
    }
});
