<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
$temporary = realpath(sys_get_temp_dir());
if (! $stage || ! $temporary || ! str_starts_with($stage, $temporary.DIRECTORY_SEPARATOR)
    || ! str_starts_with(basename($stage), 'lubosmart-auth-browser-')
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('This fixture requires an isolated temporary SQLite database.');
}
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$seller = User::factory()->create(['name' => 'Seller Workspace', 'role' => 'seller', 'email' => 'seller@example.test', 'password' => 'Browser@2026']);
$store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Browser Store', 'status' => 'approved']);
$category = Category::query()->create(['name' => 'Test department']);
$product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Browser tote', 'price' => 100, 'stock' => 3, 'status' => 'active']);
$buyer = User::factory()->create(['name' => 'Buyer Workspace', 'email' => 'buyer@example.test', 'password' => 'Browser@2026']);
User::factory()->create(['role' => 'admin', 'name' => 'Review Administrator', 'email' => 'admin@example.test', 'password' => 'Browser@2026']);
$logistics = User::factory()->create(['role' => 'logistics', 'name' => 'Browser Logistics', 'email' => 'logistics@example.test', 'password' => 'Browser@2026']);
$rider = User::factory()->create(['role' => 'rider', 'name' => 'Browser Rider', 'email' => 'rider@example.test', 'password' => 'Browser@2026']);
$center = LogisticsCenter::query()->create(['code' => 'BROWSER', 'name' => 'Browser center', 'address' => 'Test address']);
$center->forceFill(['company_user_id' => $logistics->id])->save();
foreach ([$logistics, $rider] as $user) {
    $user->logisticsCenters()->attach($center->id, ['granted_by' => $logistics->id]);
}
$rider->forceFill(['logistics_center_id' => $center->id])->save();
$parcels = [];
foreach (['pending', 'processing', 'shipped', 'completed'] as $status) {
    $order = Order::query()->create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Browser recipient', 'shipping_phone' => '09123456789', 'shipping_line1' => 'Test street', 'shipping_barangay' => 'Test barangay', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150, 'payment_method' => 'cod', 'status' => $status === 'completed' ? 'completed' : 'pending']);
    $parcel = $order->sellerOrders()->create(['store_id' => $store->id, 'subtotal' => 100, 'shipping_fee' => 50, 'commission_amount' => 10, 'seller_proceeds' => 90, 'status' => $status]);
    $delivery = Delivery::query()->create(['seller_order_id' => $parcel->id, 'status' => $status === 'completed' ? 'delivered' : 'unassigned']);
    OrderItem::query()->create(['seller_order_id' => $parcel->id, 'product_id' => $product->id, 'product_name' => $product->name, 'quantity' => 1, 'price_each' => 100]);
    $delivery->ensureTrackingReference();
    if ($status === 'completed') {
        $delivery->update(['rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'delivered_at' => now()]);
        DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'reference' => (string) Str::uuid(), 'amount' => 150, 'received_amount' => 150, 'status' => 'reconciled', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $center->id, 'actor_id' => $rider->id, 'type' => 'delivered', 'reference' => (string) Str::uuid(), 'notes' => '{}', 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }
    $parcels[$status] = ['id' => $parcel->id, 'tracking' => $delivery->tracking_reference, 'delivery_id' => $delivery->id];
}
$parcels['product'] = ['id' => $product->id];
file_put_contents($stage.DIRECTORY_SEPARATOR.'operations.json', json_encode($parcels, JSON_THROW_ON_ERROR));
