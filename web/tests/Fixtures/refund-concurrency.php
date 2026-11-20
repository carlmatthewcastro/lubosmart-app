<?php

// Uses a newly created loopback-MySQL schema only. Never migrates the configured database.
use App\Http\Controllers\ReturnWorkflowController;
use App\Models\ParcelReturn;
use App\Models\User;
use App\Services\ApproveRefund;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__, 2).'/vendor/autoload.php';
putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = 'testing';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['mail.default' => 'array', 'queue.default' => 'sync', 'cache.default' => 'array', 'session.driver' => 'array']);
set_exception_handler(function (Throwable $exception): void {
    fwrite(STDERR, get_class($exception).': concurrency acceptance failed.'.($exception instanceof RuntimeException ? ' '.$exception->getMessage() : '')."\n");
    exit(1);
});
$worker = ($argv[1] ?? '') === 'worker';
$database = $worker ? getenv('REFUND_TEST_DATABASE') : 'lubosmart_refund_test_'.bin2hex(random_bytes(6));
if (! preg_match('/^lubosmart_refund_test_[a-f0-9]{12}$/D', $database)) {
    throw new RuntimeException('Unsafe test schema name.');
}
$connection = config('database.connections.mysql');
if (getenv('REFUND_MYSQL_PORT')) {
    $connection = [...$connection, 'host' => '127.0.0.1', 'port' => getenv('REFUND_MYSQL_PORT'), 'username' => 'root', 'password' => '', 'url' => null];
}
if (! in_array($connection['host'] ?? '', ['127.0.0.1', 'localhost'], true)) {
    throw new RuntimeException('Concurrency tests require loopback MySQL.');
}
$connection['database'] = $database;
$connection['url'] = null;
config(['database.default' => 'mysql', 'database.connections.mysql' => $connection]);
DB::purge('mysql');

if ($worker) {
    $deadline = microtime(true) + 15;
    while (! file_exists($argv[4]) && microtime(true) < $deadline) {
        usleep(10000);
    }
    if (! file_exists($argv[4])) {
        exit(3);
    }
    try {
        $actor = User::query()->findOrFail((int) $argv[3]);
        $data = json_decode(file_get_contents(dirname($argv[4]).DIRECTORY_SEPARATOR.'payload.json'), true, 512, JSON_THROW_ON_ERROR);
        if ($argv[2] === 'partial') {
            $request = Request::create('/returns', 'POST', $data);
            $request->setUserResolver(fn () => $actor);
            app(ReturnWorkflowController::class)->store($request);
        } else {
            app(ApproveRefund::class)->handle(ParcelReturn::query()->findOrFail((int) $argv[5]), $actor, $data, $argv[2] === 'reconcile');
        }
        echo "success\n";
        exit(0);
    } catch (ValidationException $e) {
        echo "rejected\n";
        exit(2);
    } catch (Throwable $e) {
        fwrite(STDERR, get_class($e).': refund concurrency worker failed: '.$e->getMessage()."\n");
        exit(3);
    }
}

$server = new PDO('mysql:host='.$connection['host'].';port='.($connection['port'] ?? 3306), $connection['username'], $connection['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
// The generated identifier is validated above and cannot select the configured database.
$server->exec('CREATE DATABASE `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$stage = sys_get_temp_dir().DIRECTORY_SEPARATOR.$database;
mkdir($stage);
function assertRace(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
function raceWorkers(string $kind, array $jobs, string $stage, string $database, array $expected = ['success', 'success']): void
{
    $barrier = $stage.DIRECTORY_SEPARATOR.$kind.'.ready';
    $workers = [];
    $environment = array_merge(getenv(), ['REFUND_TEST_DATABASE' => $database, 'APP_ENV' => 'testing']);
    foreach ($jobs as [$buyer, $resource]) {
        $pipes = [];
        $process = proc_open([PHP_BINARY, __FILE__, 'worker', $kind, (string) $buyer, $barrier, (string) $resource], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname(__DIR__, 2), $environment, ['bypass_shell' => true, 'create_no_window' => true]);
        fclose($pipes[0]);
        $workers[] = [$process, $pipes];
    }
    file_put_contents($barrier, 'ready');
    $results = [];
    foreach ($workers as [$process, $pipes]) {
        $output = stream_get_contents($pipes[1]);
        $errors = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $status = proc_close($process);
        assertRace(in_array($status, [0, 2], true), $kind.' worker error: '.$errors);
        $results[] = trim($output);
    }
    sort($results);
    assertRace($results === $expected, $kind.' must permit exactly one competing transaction.');
}

try {
    Artisan::call('migrate', ['--force' => true]);
    require dirname(__DIR__).'/Support/RefundScenario.php';
    $fixture = refundScenario();
    $item = $fixture['parcel']->items()->sole();
    $case = ParcelReturn::query()->create(['workflow_version' => 3, 'seller_order_id' => $fixture['parcel']->id, 'buyer_id' => $fixture['buyer']->id, 'reason' => 'Synthetic concurrency approval.']);
    $case->requestedItems()->create(['order_item_id' => $item->id, 'quantity' => 1, 'requested_cents' => 10000]);
    $payload = ['action' => 'approve', 'product_cents' => 10000, 'items' => [['order_item_id' => $item->id, 'quantity' => 1, 'amount' => '100.00']], 'shipping_amount' => '0.00', 'responsibility' => 'seller', 'return_shipping_responsibility' => 'platform', 'physical_return_required' => true, 'reason' => 'Synthetic reviewed concurrent approval.'];
    file_put_contents($stage.DIRECTORY_SEPARATOR.'payload.json', json_encode($payload, JSON_THROW_ON_ERROR));
    raceWorkers('approval', [[$fixture['admin']->id, $case->id], [$fixture['admin']->id, $case->id]], $stage, $database);
    assertRace(DB::table('wallet_transactions')->where('parcel_return_id', $case->id)->count() === 1, 'Approval retries duplicated wallet credit.');
    assertRace(DB::table('return_tasks')->where('parcel_return_id', $case->id)->count() === 1, 'Approval retries duplicated transport.');
    echo "PASS concurrent identical approval credits exactly once\n";

    $second = ParcelReturn::query()->create(['workflow_version' => 3, 'seller_order_id' => $fixture['parcel']->id, 'buyer_id' => $fixture['buyer']->id, 'reason' => 'Synthetic uncredited obligation.']);
    $second->requestedItems()->create(['order_item_id' => $item->id, 'quantity' => 1, 'requested_cents' => 10000]);
    $second->forceFill(['refund_status' => 'approved_uncredited', 'refund_cents' => 10000, 'product_refund_cents' => 10000, 'shipping_refund_cents' => 0,
        'responsibility' => 'seller', 'responsibility_reviewed_at' => now(), 'physical_return_required' => true, 'return_shipping_responsibility' => 'platform'])->save();
    raceWorkers('reconcile', [[$fixture['admin']->id, $second->id], [$fixture['admin']->id, $second->id]], $stage, $database);
    assertRace(DB::table('wallet_transactions')->where('parcel_return_id', $second->id)->count() === 1, 'Concurrent reconciliation duplicated credit.');
    assertRace((int) DB::table('buyer_wallets')->where('buyer_id', $fixture['buyer']->id)->value('balance_cents') === 20000, 'Final wallet balance must equal both approved obligations.');
    echo "PASS concurrent reconciliation credits exactly once\n";

    $next = refundScenario();
    $next['parcel']->items()->update(['quantity' => 1, 'price_each' => '200.00']);
    file_put_contents($stage.DIRECTORY_SEPARATOR.'payload.json', json_encode(['seller_order_id' => $next['parcel']->id, 'reason_kind' => 'other', 'reason' => 'Competing requests for the same last eligible unit.', 'shipping_amount' => '0.00', 'items' => [['order_item_id' => $next['parcel']->items()->sole()->id, 'quantity' => 1, 'amount' => '200.00']]], JSON_THROW_ON_ERROR));
    raceWorkers('partial', [[$next['buyer']->id, $next['parcel']->id], [$next['buyer']->id, $next['parcel']->id]], $stage, $database, ['rejected', 'success']);
    assertRace(ParcelReturn::query()->where('seller_order_id', $next['parcel']->id)->count() === 1, 'Concurrent requests reserved the same unit twice.');
    echo "PASS competing partial requests reserve eligible quantity once\n";

} finally {
    DB::disconnect('mysql');
    try {
        $server->exec('DROP DATABASE `'.$database.'`');
        echo "Disposable test schema removed.\n";
    } catch (Throwable) {
        fwrite(STDERR, 'Server disconnected; disposable schema pending cleanup: '.$database."\n");
    }
}
