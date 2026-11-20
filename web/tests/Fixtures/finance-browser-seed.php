<?php

use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
$temporary = realpath(sys_get_temp_dir());
if (! $stage || ! str_starts_with($stage, $temporary.DIRECTORY_SEPARATOR.'lubosmart-auth-browser-')
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('Finance browser fixtures require an isolated temporary database.');
}
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (($argv[1] ?? '') === 'finalization') {
    $parcel = SellerOrder::query()->firstOrFail();
    $admin = User::query()->where('role', 'admin')->firstOrFail();
    $return = ParcelReturn::query()->create(['workflow_version' => 2, 'seller_order_id' => $parcel->id, 'buyer_id' => $parcel->order->buyer_id,
        'status' => 'received', 'received_at' => now(), 'reason' => 'Synthetic approved whole-parcel return.', 'responsibility' => 'seller', 'responsibility_reviewed_at' => now(), 'responsibility_reason' => 'Synthetic seller preparation evidence reviewed.']);
    $offer = DB::table('refund_offers')->insertGetId(['parcel_return_id' => $return->id, 'actor_id' => $admin->id,
        'product_cents' => 20000, 'shipping_cents' => 0, 'coin_restore_cents' => 0, 'cash_refund_cents' => 20000, 'method' => 'coins', 'responsibility' => 'seller', 'reason' => 'Synthetic exact voluntary coin offer.', 'created_at' => now()]);
    $return->update(['refund_offer_id' => $offer]);
    echo 'Synthetic finalization refund offer ready';
    exit;
}
$parcel = SellerOrder::query()->firstOrFail();
$parcel->update(['subtotal' => 900, 'discount_amount' => 100, 'shipping_fee' => 80, 'commission_basis_points' => 1000,
    'commission_amount' => 90, 'seller_proceeds' => 810, 'status' => 'completed']);
$parcel->order->update(['status' => 'completed']);
$parcel->delivery->update(['status' => 'delivered', 'delivered_at' => now()]);
DB::table('cod_collections')->insert(['delivery_id' => $parcel->delivery->id, 'rider_id' => $parcel->delivery->rider_id,
    'reference' => (string) Str::uuid(), 'amount' => 980, 'received_amount' => 980, 'status' => 'reconciled',
    'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
echo 'Synthetic finance fixture ready';
