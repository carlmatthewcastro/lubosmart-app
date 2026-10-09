<?php

use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

test('the account alignment migration can resume while preserving completed account records and saved drafts', function () {
    // Exercise schema changes outside the RefreshDatabase transaction, as SQLite requires.
    $originalConnection = DB::getDefaultConnection();
    config(['database.connections.migration_preservation' => array_replace(config('database.connections.sqlite'), ['database' => ':memory:'])]);
    DB::setDefaultConnection('migration_preservation');
    try {
        $paths = collect(glob(database_path('migrations/*.php')))
            ->reject(fn ($path) => basename($path) === '2026_10_09_055208_align_account_registration_flow.php')
            ->map(fn ($path) => 'database/migrations/'.basename($path))->all();
        Artisan::call('migrate', ['--database' => 'migration_preservation', '--path' => $paths]);
        $user = User::factory()->create(['role' => 'rider']);
        $admin = User::factory()->create(['role' => 'admin', 'name' => 'Existing Admin', 'email' => 'admin@example.com']);
        $adminPassword = $admin->password;
        $adminVerifiedAt = $admin->email_verified_at;
        $application = RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => 'rider', 'status' => 'draft']);
        DB::table('registration_applications')->where('id', $application->id)->update([
            'draft_data' => json_encode(['first_name' => 'Preserved', 'current_step' => 'address']), 'draft_saved_at' => now(),
        ]);
        $password = $user->password;
        $verifiedAt = $user->email_verified_at;

        $migration = require database_path('migrations/2026_10_09_055208_align_account_registration_flow.php');
        $migration->up();
        $migration->up();

        expect($user->fresh()->password)->toBe($password);
        expect($user->fresh()->email_verified_at->equalTo($verifiedAt))->toBeTrue();
        expect($user->fresh()->status)->toBe('approved');
        expect($user->fresh()->role)->toBe('courier');
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'name' => 'Existing Admin', 'email' => 'admin@example.com', 'role' => 'admin', 'status' => 'approved']);
        expect($admin->fresh()->password)->toBe($adminPassword);
        expect($admin->fresh()->email_verified_at->equalTo($adminVerifiedAt))->toBeTrue();
        expect($application->fresh()->requested_role)->toBe('courier');
        expect($application->fresh()->draft_data)->toBe(['first_name' => 'Preserved', 'current_step' => 'address']);
        $this->assertDatabaseCount('registration_application_drafts', 1);
        expect(Schema::hasColumn('users', 'sorting_center_id'))->toBeTrue();
        expect(Schema::hasColumn('registration_applications', 'draft_data'))->toBeFalse();
        expect(collect(Schema::getForeignKeys('registration_application_drafts'))->contains(fn ($key) => $key['columns'] === ['registration_application_id']))->toBeTrue();
    } finally {
        DB::purge('migration_preservation');
        DB::setDefaultConnection($originalConnection);
    }
});
