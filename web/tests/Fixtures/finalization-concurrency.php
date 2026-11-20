<?php

// Uses a newly created loopback-MySQL schema only. Never migrates the configured database.
use App\Actions\Checkout\CreateOrderFromCart;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\StoreVoucher;
use App\Models\User;
use App\Services\LubosCoins;
use Illuminate\Contracts\Console\Kernel;
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
    fwrite(STDERR, get_class($exception).": concurrency acceptance failed.\n");
    exit(1);
});
$worker = ($argv[1] ?? '') === 'worker';
$database = $worker ? getenv('FINALIZATION_TEST_DATABASE') : 'lubosmart_finalization_test_'.bin2hex(random_bytes(6));
if (! preg_match('/^lubosmart_finalization_test_[a-f0-9]{12}$/D', $database)) {
    throw new RuntimeException('Unsafe test schema name.');
}
$connection = config('database.connections.mysql');
if (getenv('FINALIZATION_MYSQL_PORT')) {
    $connection = [...$connection, 'host' => '127.0.0.1', 'port' => getenv('FINALIZATION_MYSQL_PORT'), 'username' => 'root', 'password' => '', 'url' => null];
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
        $buyer = User::query()->findOrFail((int) $argv[3]);
        if ($argv[2] === 'wallet') {
            DB::transaction(fn () => app(LubosCoins::class)->redeem($buyer, Order::query()->findOrFail((int) $argv[5]), 8000), 3);
        } else {
            app(CreateOrderFromCart::class)->handle($buyer, (int) $argv[5], null, null, 'RACE-LAST-USE');
        }
        echo "success\n";
        exit(0);
    } catch (ValidationException $e) {
        echo "rejected\n";
        exit(2);
    } catch (Throwable $e) {
        fwrite(STDERR, get_class($e).": concurrency worker failed\n");
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
function raceWorkers(string $kind, array $jobs, string $stage, string $database): void
{
    $barrier = $stage.DIRECTORY_SEPARATOR.$kind.'.ready';
    $workers = [];
    $environment = array_merge(getenv(), ['FINALIZATION_TEST_DATABASE' => $database, 'APP_ENV' => 'testing']);
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
    assertRace($results === ['rejected', 'success'], $kind.' must permit exactly one competing transaction.');
}

try {
    Artisan::call('migrate', ['--force' => true]);
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Synthetic concurrency store', 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Synthetic concurrency category']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Synthetic race product', 'price' => '100.00', 'stock' => 10, 'status' => 'active']);
    DB::table('buyer_wallets')->insert(['buyer_id' => $buyer->id, 'balance_cents' => 10000]);
    $orders = [];
    foreach ([1, 2] as $index) {
        $order = Order::query()->create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Synthetic buyer', 'shipping_phone' => '09171234567', 'shipping_line1' => 'Synthetic street', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => '100.00', 'shipping_total' => '50.00', 'total' => '150.00', 'payment_method' => 'cod', 'status' => 'pending']);
        SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => '100.00', 'shipping_fee' => '50.00', 'coins_redeemed_cents' => 8000, 'merchandise_cash_cents' => 2000, 'cod_due_cents' => 7000, 'status' => 'pending']);
        $orders[] = $order;
    }
    raceWorkers('wallet', [[$buyer->id, $orders[0]->id], [$buyer->id, $orders[1]->id]], $stage, $database);
    assertRace((int) DB::table('buyer_wallets')->where('buyer_id', $buyer->id)->value('balance_cents') === 2000, 'Concurrent wallet balance must remain 2000.');
    assertRace(DB::table('wallet_transactions')->count() === 1 && DB::table('coin_allocations')->count() === 1, 'Only one wallet deduction and allocation may persist.');
    echo "PASS concurrent wallet overspend protection\n";

    StoreVoucher::query()->create(['store_id' => $store->id, 'code' => 'RACE-LAST-USE', 'amount_cents' => 1000, 'minimum_cents' => 10000, 'usage_limit' => 1, 'expires_at' => now()->addDay(), 'is_active' => true]);
    $jobs = [];
    foreach ([1, 2] as $index) {
        $racer = User::factory()->create();
        $address = Address::query()->create(['user_id' => $racer->id, 'label' => 'Synthetic', 'recipient_name' => 'Synthetic buyer', 'phone' => '09171234567', 'line1' => 'Synthetic street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
        $cart = Cart::query()->create(['user_id' => $racer->id]);
        CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);
        $jobs[] = [$racer->id, $address->id];
    }
    raceWorkers('voucher', $jobs, $stage, $database);
    assertRace(SellerOrder::query()->whereNotNull('store_voucher_id')->count() === 1, 'Voucher capacity exceeded.');
    assertRace($product->fresh()->stock === 9, 'Rejected redemption changed stock.');
    echo "PASS concurrent last voucher redemption\n";
} finally {
    DB::disconnect('mysql');
    try {
        $server->exec('DROP DATABASE `'.$database.'`');
        echo "Disposable test schema removed.\n";
    } catch (Throwable) {
        fwrite(STDERR, 'Server disconnected; disposable schema pending cleanup: '.$database."\n");
    }
}
