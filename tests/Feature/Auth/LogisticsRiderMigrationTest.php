<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function logisticsUpgradeDatabase(): string
{
    $previous = DB::getDefaultConnection();
    config(['database.connections.logistics_upgrade' => array_replace(config('database.connections.sqlite'), ['database' => ':memory:'])]);
    DB::purge('logistics_upgrade');
    DB::setDefaultConnection('logistics_upgrade');
    Schema::create('users', function (Blueprint $t) {
        $t->id();
        $t->string('status')->default('rejected');
    });
    Schema::create('registration_applications', function (Blueprint $t) {
        $t->id();
        $t->foreignId('user_id');
        $t->string('requested_role');
        $t->string('business_name')->nullable();
    });
    Schema::create('sorting_centers', function (Blueprint $t) {
        $t->id();
        $t->string('name');
    });
    Schema::create('rider_profiles', function (Blueprint $t) {
        $t->id();
        $t->foreignId('user_id');
        $t->string('plate_number')->nullable();
    });
    DB::table('users')->insert(['id' => 1, 'status' => 'rejected']);

    return $previous;
}
test('logistics migration stops legacy company collisions before any schema changes', function () {
    $previous = logisticsUpgradeDatabase();
    try {
        DB::table('registration_applications')->insert([['user_id' => 1, 'requested_role' => 'sorting_center', 'business_name' => ' Bilis Hatid '], ['user_id' => 2, 'requested_role' => 'sorting_center', 'business_name' => 'bilis hatid']]);
        $migration = require database_path('migrations/2026_10_13_052049_add_logistics_registration_and_rider_invitations.php');
        expect(fn () => $migration->up())->toThrow(RuntimeException::class, 'Duplicate legacy company names');
        expect(Schema::hasColumn('registration_applications', 'sec_number'))->toBeFalse();
        expect(Schema::hasTable('rider_activation_invitations'))->toBeFalse();
    } finally {
        DB::setDefaultConnection($previous);
        DB::purge('logistics_upgrade');
    }
});
test('logistics migration stops legacy plate collisions before any schema changes', function () {
    $previous = logisticsUpgradeDatabase();
    try {
        DB::table('rider_profiles')->insert([['user_id' => 1, 'plate_number' => ' 123abc '], ['user_id' => 2, 'plate_number' => '123ABC']]);
        $migration = require database_path('migrations/2026_10_13_052049_add_logistics_registration_and_rider_invitations.php');
        expect(fn () => $migration->up())->toThrow(RuntimeException::class, 'Duplicate legacy rider plates');
        expect(Schema::hasColumn('registration_applications', 'sec_number'))->toBeFalse();
        expect(Schema::hasColumn('rider_profiles', 'plate_normalized'))->toBeFalse();
    } finally {
        DB::setDefaultConnection($previous);
        DB::purge('logistics_upgrade');
    }
});
test('logistics migration preserves legacy names plates and statuses without guessing company owners', function () {
    $previous = logisticsUpgradeDatabase();
    try {
        DB::table('registration_applications')->insert(['user_id' => 1, 'requested_role' => 'sorting_center', 'business_name' => ' Bilis Hatid ']);
        DB::table('rider_profiles')->insert(['user_id' => 1, 'plate_number' => ' 123abc ']);
        $migration = require database_path('migrations/2026_10_13_052049_add_logistics_registration_and_rider_invitations.php');
        $migration->up();
        $migration->up();
        expect(DB::table('registration_applications')->value('business_name'))->toBe(' Bilis Hatid ');
        expect(DB::table('registration_applications')->value('company_name_normalized'))->toBe('bilis hatid');
        expect(DB::table('rider_profiles')->value('plate_number'))->toBe(' 123abc ');
        expect(DB::table('rider_profiles')->value('plate_normalized'))->toBe('123ABC');
        expect(DB::table('users')->value('status'))->toBe('rejected');
        expect(DB::table('users')->value('logistics_company_id'))->toBeNull();
    } finally {
        DB::setDefaultConnection($previous);
        DB::purge('logistics_upgrade');
    }
});
