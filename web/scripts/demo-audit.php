<?php

use App\Models\User;
use App\Services\Demo\DemoPreflight;
use App\Services\Demo\DemoVerification;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
set_exception_handler(static function (Throwable $exception): void {
    fwrite(STDERR, 'Demo audit failed: '.($exception::class === RuntimeException::class ? $exception->getMessage() : 'See the private application log.').PHP_EOL);
    exit(1);
});

if (! app()->environment('local')) {
    throw new RuntimeException('Local audit only; no deployed seeder reruns allowed.');
}
app(DemoPreflight::class)->inspect();
$snapshot = function (): array {
    $snapshot = [];
    foreach (DB::select('SHOW TABLES') as $row) {
        $table = array_values((array) $row)[0];
        if (in_array('id', Schema::getColumnListing($table), true)) {
            $snapshot[$table] = DB::table($table)->orderBy('id')->get()->mapWithKeys(fn ($record) => [$record->id => hash('sha256', json_encode($record, JSON_THROW_ON_ERROR))])->all();
        }
    }

    return $snapshot;
};
$before = $snapshot();
if (Artisan::call('db:seed', ['--class' => 'LubosMartDemoSeeder', '--no-interaction' => true]) !== 0) {
    throw new RuntimeException('Seeder rerun failed.');
}
$after = $snapshot();
$businessBefore = $before;
$businessAfter = $after;
unset($businessBefore['sessions'], $businessAfter['sessions']);
if ($businessBefore !== $businessAfter) {
    throw new RuntimeException('Seeder rerun changed database rows; audit failed.');
}
$result = ['idempotency' => 'passed: ID-bearing business rows unchanged, including stock, ledgers, assignments and workflow progress; volatile sessions excluded',
    'reconciliation' => app(DemoVerification::class)->reconcile(), 'baseline_existing_records' => 'not requested'];
if (isset($argv[1])) {
    $baseline = json_decode(file_get_contents($argv[1]), true, flags: JSON_THROW_ON_ERROR);
    $changed = [];
    $expectedWalletChanges = [];
    $volatileSessions = 0;
    foreach ($baseline as $table => $rows) {
        foreach ($rows as $id => $hash) {
            if (($after[$table][$id] ?? null) !== $hash) {
                if ($table === 'sessions') {
                    $volatileSessions++;

                    continue;
                }
                if ($table === 'buyer_wallets' && DB::table('buyer_wallets')->where('id', $id)->value('buyer_id')
                    === User::query()->where('email', config('demo.primary.buyer'))->value('id')) {
                    $expectedWalletChanges[] = $id;

                    continue;
                }
                $changed[] = ['table' => $table, 'id' => $id];
            }
        }
    }
    $result['baseline_existing_records'] = $changed ?: 'passed: original business rows unchanged except the reconciled primary buyer wallet';
    $result['authorized_primary_wallet_changes'] = $expectedWalletChanges;
    $result['volatile_session_differences'] = $volatileSessions;
    if ($changed) {
        throw new RuntimeException('Original baseline rows changed: '.json_encode($changed));
    }
}
Storage::disk('local')->put('demo/idempotency-results.json', json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
chmod(Storage::disk('local')->path('demo/idempotency-results.json'), 0600);
echo json_encode($result, JSON_THROW_ON_ERROR),PHP_EOL;
