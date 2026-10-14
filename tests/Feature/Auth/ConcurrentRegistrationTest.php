<?php

use App\Models\SortingCenter;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

test('simultaneous validated registrations create exactly one account and verification delivery', function (string $role) {
    $database = tempnam(sys_get_temp_dir(), 'lubosmart-race-');
    $barrier = $database.'.start';
    $ready = [$database.'.one', $database.'.two'];
    $workers = [];
    try {
        config(['database.connections.account_race' => array_replace(config('database.connections.sqlite'), ['database' => $database, 'busy_timeout' => 10000])]);
        Artisan::call('migrate', ['--database' => 'account_race', '--force' => true]);
        DB::connection('account_race')->statement('PRAGMA journal_mode=WAL');
        if ($role === 'seller') {
            DB::connection('account_race')->table('categories')->insert(['name' => 'Home & Living', 'slug' => 'home-living', 'is_active' => true]);
        }
        if ($role === 'courier') {
            $company = User::on('account_race')->create(['name' => 'Race company', 'email' => 'race.company@example.com', 'role' => 'sorting_center', 'password' => null]);
            $company->forceFill(['status' => 'approved', 'email_verified_at' => now()])->save();
            $center = SortingCenter::on('account_race')->create(['code' => 'RACE', 'name' => 'Race company', 'address' => 'Synthetic address']);
            $center->forceFill(['company_user_id' => $company->id])->save();
            $company->sortingCenters()->attach($center->id, ['granted_by' => $company->id]);
        }
        foreach ($ready as $signal) {
            $worker = new Process([PHP_BINARY, base_path('tests/Fixtures/account-registration-worker.php'), base_path(), $database, $barrier, $signal, $role], base_path());
            $worker->setTimeout(20);
            $worker->start();
            $workers[] = $worker;
        }
        $deadline = microtime(true) + 10;
        while (! is_file($ready[0]) || ! is_file($ready[1])) {
            if (microtime(true) > $deadline || ! $workers[0]->isRunning() || ! $workers[1]->isRunning()) {
                throw new RuntimeException('Race setup failed: '.$workers[0]->getErrorOutput().$workers[1]->getErrorOutput().$workers[0]->getOutput().$workers[1]->getOutput());
            }
            usleep(10000);
        }
        touch($barrier);
        $results = [];
        foreach ($workers as $worker) {
            $worker->wait();
            expect($worker->isSuccessful())->toBeTrue($worker->getErrorOutput());
            $results[] = $worker->getOutput();
        }
        sort($results);
        expect($results)->toBe(['created', 'duplicate']);
        foreach (['users', 'user_profiles', 'registration_applications'] as $table) {
            expect(DB::connection('account_race')->table($table)->count())->toBe($role === 'courier' && $table === 'users' ? 2 : 1);
        }
        if ($role === 'courier') {
            expect(DB::connection('account_race')->table('rider_activation_invitations')->value('send_count'))->toBe(1);
            expect(DB::connection('account_race')->table('registration_documents')->count())->toBe(2);
        } else {
            expect(DB::connection('account_race')->table('email_verification_tokens')->count())->toBe(0);
            foreach (['registration_email_codes'] as $table) {
                expect(DB::connection('account_race')->table($table)->count())->toBe(1);
            } expect(DB::connection('account_race')->table('registration_email_codes')->value('send_count'))->toBe(1);
        }
        if ($role === 'seller') {
            expect(DB::connection('account_race')->table('stores')->count())->toBe(1);
            expect(DB::connection('account_race')->table('registration_documents')->count())->toBe(4);
        }
    } finally {
        foreach ($workers as $worker) {
            if ($worker->isRunning()) {
                $worker->stop();
            }
        }
        DB::purge('account_race');
        $uploadRoot = realpath($database.'.uploads');
        if ($uploadRoot && str_starts_with($uploadRoot, realpath(sys_get_temp_dir()).DIRECTORY_SEPARATOR) && basename($uploadRoot) === basename($database).'.uploads') {
            File::deleteDirectory($uploadRoot);
        }
        foreach ([$database, $barrier, ...$ready, $database.'-wal', $database.'-shm'] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }
})->with(['TC-BUY-022 actual concurrency' => 'buyer', 'TC-SEL-020 actual concurrency' => 'seller', 'TC-LOG-020 actual concurrency' => 'sorting_center', 'TC-RID-019 actual concurrency' => 'courier']);
