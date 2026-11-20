<?php

use App\Models\LogisticsCenter;
use App\Models\User;
use Illuminate\Support\Facades\DB;

test('role terminology upgrade preserves accounts applications and logistics memberships', function () {
    $previous = DB::getDefaultConnection();
    config(['database.connections.terminology_upgrade' => array_replace(config('database.connections.sqlite'), ['database' => ':memory:'])]);
    DB::purge('terminology_upgrade');
    DB::setDefaultConnection('terminology_upgrade');
    try {
        $this->artisan('migrate', ['--database' => 'terminology_upgrade', '--force' => true])->assertSuccessful();
        $operator = User::factory()->create(['role' => 'logistics']);
        $center = LogisticsCenter::query()->create(['code' => 'RENAME', 'name' => 'Delivery company', 'address' => 'Test address']);
        $operator->logisticsCenters()->attach($center->id, ['granted_by' => $operator->id]);
        $rider = User::factory()->create(['role' => 'rider', 'logistics_center_id' => $center->id]);
        $applicationId = DB::table('registration_applications')->insertGetId([
            'user_id' => $rider->id, 'requested_role' => 'rider', 'status' => 'draft',
            'logistics_center_id' => $center->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('registration_application_drafts')->insert([
            'registration_application_id' => $applicationId,
            'data' => json_encode(['logistics_center_id' => $center->id, 'first_name' => 'Preserved']),
            'saved_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $migration = require database_path('migrations/2026_10_18_000000_standardize_rider_and_logistics_names.php');
        $migration->down();
        $this->assertDatabaseHas('users', ['id' => $rider->id, 'role' => 'courier', 'sorting_center_id' => $center->id]);
        $this->assertDatabaseHas('users', ['id' => $operator->id, 'role' => 'sorting_center']);
        expect(json_decode(DB::table('registration_application_drafts')->value('data'), true))->toBe(['first_name' => 'Preserved', 'sorting_center_id' => $center->id]);

        $migration->up();

        $this->assertDatabaseHas('users', ['id' => $rider->id, 'role' => 'rider', 'logistics_center_id' => $center->id]);
        $this->assertDatabaseHas('registration_applications', ['user_id' => $rider->id, 'requested_role' => 'rider', 'logistics_center_id' => $center->id]);
        expect($operator->fresh()->logisticsCenters()->sole()->id)->toBe($center->id);
        expect($rider->fresh()->logisticsCenter->id)->toBe($center->id);
        expect(json_decode(DB::table('registration_application_drafts')->value('data'), true))->toBe(['first_name' => 'Preserved', 'logistics_center_id' => $center->id]);
        expect(DB::select('PRAGMA foreign_key_check'))->toBe([]);
    } finally {
        DB::setDefaultConnection($previous);
        DB::purge('terminology_upgrade');
    }
});

test('existing dashboard links redirect to the canonical role names', function () {
    $rider = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($rider);

    $this->actingAs($rider)->get('/dashboard/courier')->assertRedirect('/dashboard/rider');
    $this->actingAs($rider)->get('/dashboard/rider')->assertOk();
});
