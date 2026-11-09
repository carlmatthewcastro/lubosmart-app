<?php

use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

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
config(['filesystems.disks.local.root' => $stage.DIRECTORY_SEPARATOR.'uploads']);
$owner = User::factory()->create(['name' => 'Operations Logistics', 'role' => 'logistics', 'email' => 'operations@example.test', 'password' => 'Browser@2026']);
$owner->application()->create(['requested_role' => 'logistics', 'status' => 'approved', 'business_name' => 'Operations Logistics']);
$center = LogisticsCenter::create(['code' => 'OPS-BROWSER', 'name' => 'Operations Center', 'address' => 'Synthetic center', 'is_active' => true]);
$center->forceFill(['company_user_id' => $owner->id])->save();
$owner->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
if (Artisan::call('lubosmart:logistics-demo', ['account' => $owner->id]) !== 0) {
    throw new RuntimeException('Could not prepare logistics sample parcels.');
}
foreach (['seller', 'rider'] as $role) {
    User::query()->where('email', 'demo-logistics-'.$owner->id.'-'.$role.'@example.invalid')->firstOrFail()->update(['password' => 'Browser@2026']);
}
$source = Delivery::query()->where('status', 'unassigned')->with('sellerOrder.order', 'sellerOrder.items')->firstOrFail();
$legacyOrder = $source->sellerOrder->order->replicate();
$legacyOrder->shipping_recipient_name = 'DEMO unallocated recipient';
$legacyOrder->save();
$legacyParcel = $source->sellerOrder->replicate();
$legacyParcel->order_id = $legacyOrder->id;
$legacyParcel->save();
foreach ($source->sellerOrder->items as $item) {
    $copy = $item->replicate();
    $copy->seller_order_id = $legacyParcel->id;
    $copy->save();
}
$legacyDelivery = $source->replicate();
$legacyDelivery->forceFill(['seller_order_id' => $legacyParcel->id, 'logistics_center_id' => null, 'service_area_id' => null])->save();
$parcels = Delivery::with('sellerOrder.order')->get()->mapWithKeys(fn ($parcel) => [
    str_replace('DEMO ', '', $parcel->sellerOrder->order->shipping_recipient_name) => ['id' => $parcel->id, 'tracking' => $parcel->tracking_reference, 'seller_order_id' => $parcel->seller_order_id],
]);
file_put_contents($stage.DIRECTORY_SEPARATOR.'operations.json', $parcels->toJson());
