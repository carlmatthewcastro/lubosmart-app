<?php

use App\Models\Delivery;
use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

test('populated upgrades retain legacy pay returns snapshots and checkpoint rider identities', function () {
    $original = DB::getDefaultConnection();
    config(['database.connections.finalization_upgrade' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('finalization_upgrade');
    Schema::clearResolvedInstance('db.schema');
    try {
        $paths = collect(glob(database_path('migrations/*.php')))->filter(fn ($path) => basename($path) < '2026_11_15_')->map(fn ($path) => 'database/migrations/'.basename($path))->values()->all();
        Artisan::call('migrate', ['--database' => 'finalization_upgrade', '--path' => $paths, '--force' => true]);
        $buyer = User::factory()->create();
        $seller = User::factory()->create(['role' => 'seller']);
        $pickup = User::factory()->create(['role' => 'rider']);
        $deliveryRider = User::factory()->create(['role' => 'rider']);
        $center = linkRiderToApprovedCenter($deliveryRider);
        $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Synthetic upgrade store', 'status' => 'approved']);
        $order = Order::query()->create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Synthetic buyer', 'shipping_phone' => '09171234567', 'shipping_line1' => 'Synthetic street', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => '123.45', 'shipping_total' => '50.00', 'total' => '173.45', 'payment_method' => 'cod', 'status' => 'completed']);
        $parcel = SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => '123.45', 'shipping_fee' => '50.00', 'commission_basis_points' => 1000, 'commission_amount' => '12.35', 'seller_proceeds' => '111.10', 'status' => 'completed']);
        $delivery = Delivery::query()->create(['seller_order_id' => $parcel->id, 'logistics_center_id' => $center->id, 'rider_id' => $deliveryRider->id, 'status' => 'delivered', 'picked_up_at' => now()->subDays(2), 'received_at' => now()->subDays(2), 'dispatch_prepared_at' => now()->subDay(), 'dispatch_accepted_at' => now()->subDay(), 'delivered_at' => now()->subDay()]);
        foreach (['picked_up' => $pickup, 'delivered' => $deliveryRider] as $type => $actor) {
            DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $center->id, 'actor_id' => $actor->id, 'type' => $type, 'reference' => (string) Str::uuid(), 'notes' => '{}', 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        }
        $return = ParcelReturn::query()->create(['seller_order_id' => $parcel->id, 'buyer_id' => $buyer->id, 'rider_id' => $pickup->id, 'status' => 'collected', 'reason' => 'Historical in-progress whole parcel return.']);
        DB::table('rider_payments')->insert(['delivery_id' => $delivery->id, 'rider_id' => $pickup->id, 'logistics_center_id' => $center->id, 'recorded_by' => $seller->id, 'leg' => 'pickup', 'amount_cents' => 750, 'notes' => 'Historical fee record.']);
        Artisan::call('migrate', ['--database' => 'finalization_upgrade', '--force' => true]);
        expect($pickup->fresh()->rider_capability)->toBe('both');
        expect($delivery->fresh()->pickup_rider_id)->toBe($pickup->id)->and($delivery->fresh()->delivery_rider_id)->toBe($deliveryRider->id);
        expect($parcel->fresh()->commission_amount)->toBe('12.35')->and($parcel->fresh()->seller_proceeds)->toBe('111.10');
        expect($parcel->fresh()->coins_redeemed_cents)->toBe(0)->and($parcel->fresh()->cod_due_cents)->toBeNull();
        expect($return->fresh()->workflow_version)->toBe(1)->and($return->fresh()->status)->toBe('collected');
        expect(DB::table('rider_payments')->value('amount_cents'))->toBe(750);
        expect(DB::table('buyer_wallets')->count())->toBe(0)->and(DB::table('weekly_rider_payments')->count())->toBe(0);
    } finally {
        DB::setDefaultConnection($original);
        Schema::clearResolvedInstance('db.schema');
        DB::purge('finalization_upgrade');
    }
});
