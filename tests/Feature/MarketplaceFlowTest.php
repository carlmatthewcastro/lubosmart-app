<?php

use App\Models\Address;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\StoreVoucher;
use App\Models\User;
use App\Notifications\OrderDeliveryUpdated;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Notification::fake();
    Storage::fake('local');
    Storage::fake('public');
    $this->buyer = User::factory()->create(['role' => 'buyer']);
    $this->seller = User::factory()->create(['role' => 'seller']);
    $this->logistics = User::factory()->create(['role' => 'logistics']);
    $this->rider = User::factory()->create(['role' => 'rider']);
    $this->admin = User::factory()->create(['role' => 'admin']);
    $this->category = Category::query()->create(['name' => 'Test bags']);
    $this->store = Store::query()->create(['user_id' => $this->seller->id, 'name' => 'Test market', 'status' => 'approved']);
    $this->product = Product::query()->create(['store_id' => $this->store->id, 'category_id' => $this->category->id, 'name' => 'Test tote', 'price' => '399.00', 'stock' => 10, 'status' => 'active']);
    $this->address = Address::query()->create(['user_id' => $this->buyer->id, 'label' => 'Home', 'recipient_name' => 'Test buyer', 'phone' => '09000000000', 'line1' => '10 Test Street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
    Address::query()->create(['user_id' => $this->seller->id, 'label' => 'Pickup', 'recipient_name' => 'Test seller', 'phone' => '09171234567', 'line1' => 'Seller test street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
    $this->center = LogisticsCenter::query()->create(['code' => 'TEST', 'name' => 'Test center', 'address' => 'Test']);
    $this->rider->forceFill(['logistics_center_id' => $this->center->id])->save();
    $this->areaId = DB::table('service_areas')->insertGetId(['logistics_center_id' => $this->center->id, 'code' => 'AREA-TEST', 'name' => 'Test area', 'province_code' => '130000000', 'city_code' => '133900000', 'barangay_code' => '133900001', 'province_name' => 'Metro Manila', 'city_name' => 'Manila', 'barangay_name' => 'Test', 'is_active' => true]);
    DB::table('rider_service_area')->insert(['rider_id' => $this->rider->id, 'service_area_id' => $this->areaId]);
    foreach ([$this->logistics, $this->rider] as $user) {
        $user->logisticsCenters()->attach($this->center->id, ['granted_by' => $this->admin->id]);
    }
});

function placeMarketplaceOrder($test, ?int $variantId = null, ?string $voucherCode = null): SellerOrder
{
    $test->actingAs($test->buyer)->put('/cart/'.$test->product->id, ['quantity' => 2, 'product_variant_id' => $variantId])->assertRedirect();
    $test->post('/checkout', ['address_id' => $test->address->id, 'checkout_key' => (string) Str::uuid(), 'voucher_code' => $voucherCode, 'expected_discount_total' => $voucherCode ? '25.00' : null])->assertRedirect('/orders');

    return SellerOrder::query()->latest('id')->firstOrFail();
}

function marketplacePhoto(): UploadedFile
{
    // A real 1px PNG exercises MIME validation without requiring the GD extension.
    return UploadedFile::fake()->createWithContent('proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII='));
}

function marketplaceScan(Delivery $delivery): array
{
    return ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner', 'amount' => (float) $delivery->sellerOrder->subtotal + (float) $delivery->sellerOrder->shipping_fee, 'recipient_name' => 'Test buyer'];
}

test('a seller waiting for email verification has hidden products and cannot receive a new checkout', function () {
    $this->actingAs($this->buyer)->put('/cart/'.$this->product->id, ['quantity' => 1])->assertSessionHasNoErrors();
    $this->seller->forceFill(['email_verified_at' => null])->save();
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->put('/cart/'.$this->product->id, ['quantity' => 2])->assertSessionHasErrors('quantity');
    $this->post('/checkout', ['address_id' => $this->address->id, 'checkout_key' => (string) Str::uuid()])->assertSessionHasErrors('cart');
    $this->assertDatabaseCount('orders', 0);
    expect($this->product->fresh()->stock)->toBe(10);
});

test('all five roles can complete the connected order delivery and cash workflow', function (bool $withOptions, string $subtotal, string $cod, float $proceeds) {
    $variant = $withOptions ? ProductVariant::query()->create(['product_id' => $this->product->id, 'name' => 'Large / Purple', 'stock' => 10]) : null;
    $voucher = $withOptions ? StoreVoucher::query()->create(['store_id' => $this->store->id, 'code' => 'FLOW-25', 'amount_cents' => 2500, 'minimum_cents' => 10000, 'usage_limit' => 5, 'expires_at' => now()->addDay(), 'is_active' => true]) : null;
    $sellerOrder = placeMarketplaceOrder($this, $variant?->id, $voucher?->code);
    expect($sellerOrder->subtotal)->toBe($subtotal)->and($this->product->fresh()->stock)->toBe(8);
    if ($variant) {
        expect($variant->fresh()->stock)->toBe(8);
        $this->assertDatabaseHas('order_items', ['seller_order_id' => $sellerOrder->id, 'variant_name' => 'Large / Purple']);
    }
    $delivery = $sellerOrder->delivery;

    $this->actingAs($this->seller)->patch('/orders/'.$sellerOrder->id, ['status' => 'processing'])->assertRedirect();
    $this->patch('/orders/'.$sellerOrder->id, ['status' => 'shipped'])->assertRedirect();
    $this->actingAs($this->logistics)->get('/deliveries')->assertInertia(fn (Assert $page) => $page->component('logistics/parcels')->has('available', 1));
    $this->post('/deliveries/'.$delivery->id, ['action' => 'claim', 'logistics_center_id' => $this->center->id])->assertRedirect();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'assign', 'service_area_id' => $this->areaId, 'rider_id' => $this->rider->id])->assertRedirect();
    $this->actingAs($this->rider)->post('/deliveries/'.$delivery->id, ['action' => 'picked_up'] + marketplaceScan($delivery))->assertRedirect();
    $this->actingAs($this->logistics)->post('/deliveries/'.$delivery->id, ['action' => 'receive', 'receipt_condition' => 'intact'] + marketplaceScan($delivery))->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'sort', 'service_area_id' => $this->areaId, 'sorting_bin' => 'Manila A'] + marketplaceScan($delivery))->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'assign', 'service_area_id' => $this->areaId, 'rider_id' => $this->rider->id] + marketplaceScan($delivery))->assertSessionHasNoErrors();
    $this->actingAs($this->rider)->post('/deliveries/'.$delivery->id, ['action' => 'accept_dispatch'] + marketplaceScan($delivery))->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'out_for_delivery'])->assertRedirect();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'delivered', 'proof' => marketplacePhoto()] + marketplaceScan($delivery))->assertRedirect();

    $this->assertDatabaseHas('orders', ['id' => $sellerOrder->order_id, 'status' => 'completed']);
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $delivery->id, 'rider_id' => $this->rider->id, 'amount' => $cod, 'status' => 'collected']);
    Storage::disk('local')->assertExists($delivery->fresh()->proof_photo_path);
    $this->actingAs($this->buyer)->get('/deliveries/'.$delivery->id.'/proof')->assertOk();
    $this->actingAs($this->logistics)->post('/deliveries/'.$delivery->id, ['action' => 'receive_cod', 'amount' => $cod, 'handover_reference' => 'CASH-001'])->assertRedirect();
    $this->actingAs($this->admin)->post('/deliveries/'.$delivery->id, ['action' => 'reconcile_cod'])->assertRedirect();
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $delivery->id, 'status' => 'reconciled']);
    $this->assertDatabaseCount('parcel_events', 11);
    $this->get('/reports')->assertInertia(fn (Assert $page) => $page->component('marketplace/reports')->where('totals.Completed parcels', 1)->where('totals.Seller proceeds', fn ($value) => (float) $value === $proceeds));
    Notification::assertSentToTimes($this->buyer, OrderDeliveryUpdated::class, 3);
    Notification::assertSentToTimes($this->seller, OrderDeliveryUpdated::class, 3);
})->with(['standard COD' => [false, '798.00', '848.00', 718.2], 'variant and voucher COD' => [true, '773.00', '823.00', 695.7]]);

test('delivered commission ignores browser values rounds cents and is recorded only once', function () {
    $this->product->update(['price' => '100.05']);
    $parcel = placeMarketplaceOrder($this);
    expect($parcel->commission_amount)->toBeNull();
    $parcel->delivery->forceFill(['rider_id' => $this->rider->id, 'logistics_center_id' => $this->center->id, 'status' => 'out_for_delivery'])->save();
    $payload = ['action' => 'delivered', 'proof' => marketplacePhoto(), 'commission_amount' => 0, 'seller_proceeds' => 999999, 'commission_basis_points' => 0] + marketplaceScan($parcel->delivery);
    $this->actingAs($this->rider)->post('/deliveries/'.$parcel->delivery->id, $payload)->assertSessionHasNoErrors();
    expect($parcel->fresh()->commission_amount)->toBe('20.01');
    expect($parcel->fresh()->seller_proceeds)->toBe('180.09');
    expect($parcel->fresh()->commission_basis_points)->toBe(1000);
    $this->post('/deliveries/'.$parcel->delivery->id, $payload)->assertConflict();
    $this->assertDatabaseCount('cod_collections', 1);
    Notification::assertSentToTimes($this->buyer, OrderDeliveryUpdated::class, 1);
});

test('parcel assignment requires a matching area and a covered rider', function () {
    $parcel = placeMarketplaceOrder($this);
    $parcel->update(['status' => 'shipped']);
    $parcel->delivery->forceFill(['logistics_center_id' => $this->center->id, 'pickup_approved_at' => now()])->save();
    DB::table('service_areas')->where('id', $this->areaId)->update(['barangay_name' => 'Different destination']);
    $payload = ['action' => 'assign', 'rider_id' => $this->rider->id, 'service_area_id' => $this->areaId];
    $this->actingAs($this->logistics)->post('/deliveries/'.$parcel->delivery->id, $payload)->assertSessionHasErrors('service_area_id');
    DB::table('service_areas')->where('id', $this->areaId)->update(['barangay_name' => 'Test']);
    DB::table('rider_service_area')->where('rider_id', $this->rider->id)->delete();
    $this->post('/deliveries/'.$parcel->delivery->id, $payload)->assertSessionHasErrors('rider_id');
    expect($parcel->delivery->fresh()->status)->toBe('unassigned');
});

test('checkout retries return the same order without deducting stock twice', function () {
    $key = (string) Str::uuid();
    $this->actingAs($this->buyer)->put('/cart/'.$this->product->id, ['quantity' => 2]);
    foreach ([1, 2] as $attempt) {
        $this->post('/checkout', ['address_id' => $this->address->id, 'checkout_key' => $key])->assertRedirect('/orders');
    }
    $this->assertDatabaseCount('orders', 1);
    expect($this->product->fresh()->stock)->toBe(8);
});

test('buyers can add quantities and only their own addresses are accepted at checkout', function () {
    $this->actingAs($this->buyer)->put('/cart/'.$this->product->id, ['quantity' => 1, 'add' => true])->assertRedirect();
    $this->put('/cart/'.$this->product->id, ['quantity' => 1, 'add' => true])->assertRedirect();
    expect(CartItem::query()->first()->quantity)->toBe(2);
    $this->address->update(['user_id' => $this->seller->id]);
    $this->post('/checkout', ['address_id' => $this->address->id, 'checkout_key' => (string) Str::uuid()])->assertSessionHasErrors('address_id');
    $this->assertDatabaseCount('orders', 0);
    expect($this->product->fresh()->stock)->toBe(10);
});

test('cart rejects unavailable quantity and removes items when quantity is zero', function () {
    $this->actingAs($this->buyer)->put('/cart/'.$this->product->id, ['quantity' => 11])->assertSessionHasErrors('quantity');
    $this->put('/cart/'.$this->product->id, ['quantity' => 1])->assertRedirect();
    $this->put('/cart/'.$this->product->id, ['quantity' => 0])->assertRedirect();
    $this->assertDatabaseCount('cart_items', 0);
});

test('catalog filters products and excludes hidden unapproved and inactive categories', function () {
    $department = Category::query()->create(['name' => 'Bags department']);
    $this->category->update(['parent_id' => $department->id]);
    $this->get('/shop?category='.$department->id)->assertInertia(fn (Assert $page) => $page->has('products.data', 1));
    $this->get('/shop?search=tote')->assertInertia(fn (Assert $page) => $page->has('products.data', 1));
    $this->get('/shop?search=unknown')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->product->update(['status' => 'hidden']);
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->product->update(['status' => 'active']);
    $this->store->update(['status' => 'pending']);
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->store->update(['status' => 'approved']);
    $this->category->update(['is_active' => false]);
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
});

test('seller inventory supports uploads and rejects other stores and categories', function () {
    $data = ['name' => 'New tote', 'description' => 'Test', 'category_id' => $this->category->id, 'price' => '199.00', 'stock' => 5, 'status' => 'active'];
    $this->actingAs($this->seller)->post('/inventory', $data + ['image' => marketplacePhoto()])->assertRedirect();
    $created = Product::query()->latest('id')->first();
    Storage::disk('public')->assertExists($created->image_path);
    $this->postJson('/inventory/'.$created->id, [...$data, '_method' => 'PUT', 'name' => 'Updated tote', 'stock' => 9, 'status' => 'hidden'])->assertRedirect();
    expect($created->fresh()->name)->toBe('Updated tote')->and($created->fresh()->stock)->toBe(9)->and($created->fresh()->status)->toBe('hidden');
    $other = User::factory()->create(['role' => 'seller']);
    Store::query()->create(['user_id' => $other->id, 'name' => 'Other', 'status' => 'approved']);
    $this->actingAs($other)->put('/inventory/'.$created->id, $data)->assertForbidden();
    $root = Category::query()->create(['name' => 'Different department']);
    $this->store->update(['business_category_id' => $root->id]);
    $this->seller->unsetRelation('store');
    $this->actingAs($this->seller)->post('/inventory', $data)->assertSessionHasErrors('category_id');
});

test('order records and conversations are private to participants', function () {
    $order = placeMarketplaceOrder($this);
    $this->post('/orders/'.$order->id.'/messages', ['body' => 'Please update me'])->assertRedirect();
    $this->actingAs($this->seller)->post('/orders/'.$order->id.'/messages', ['body' => 'Preparing now'])->assertRedirect();
    $other = User::factory()->create(['role' => 'buyer']);
    $this->actingAs($other)->get('/orders')->assertInertia(fn (Assert $page) => $page->has('orders.data', 0)->where('messages', []));
    $this->post('/orders/'.$order->id.'/messages', ['body' => 'Not mine'])->assertForbidden();
    $this->get('/deliveries/'.$order->delivery->id.'/proof')->assertForbidden();
    $this->assertDatabaseCount('order_messages', 2);
});

test('sellers cannot skip preparation or change another store order', function () {
    $order = placeMarketplaceOrder($this);
    $this->actingAs($this->seller)->patch('/orders/'.$order->id, ['status' => 'shipped'])->assertConflict();
    $other = User::factory()->create(['role' => 'seller']);
    $this->actingAs($other)->patch('/orders/'.$order->id, ['status' => 'processing'])->assertForbidden();
    expect($order->fresh()->status)->toBe('pending');
});

test('delivery operations enforce center membership rider assignment and status order', function () {
    $order = placeMarketplaceOrder($this);
    $delivery = $order->delivery;
    $this->actingAs($this->logistics)->post('/deliveries/'.$delivery->id, ['action' => 'claim', 'logistics_center_id' => $this->center->id])->assertConflict();
    $order->update(['status' => 'shipped']);
    $this->post('/deliveries/'.$delivery->id, ['action' => 'claim', 'logistics_center_id' => $this->center->id])->assertRedirect();
    $other = User::factory()->create(['role' => 'logistics']);
    $this->actingAs($other)->post('/deliveries/'.$delivery->id, ['action' => 'assign', 'service_area_id' => $this->areaId, 'rider_id' => $this->rider->id])->assertForbidden();
    $outside = User::factory()->create(['role' => 'rider']);
    $this->actingAs($this->logistics)->post('/deliveries/'.$delivery->id, ['action' => 'assign', 'service_area_id' => $this->areaId, 'rider_id' => $outside->id])->assertSessionHasErrors('rider_id');
    $this->post('/deliveries/'.$delivery->id, ['action' => 'assign', 'service_area_id' => $this->areaId, 'rider_id' => $this->rider->id])->assertRedirect();
    $this->actingAs($outside)->post('/deliveries/'.$delivery->id, ['action' => 'picked_up'] + marketplaceScan($delivery))->assertForbidden();
    $this->actingAs($this->rider)->post('/deliveries/'.$delivery->id, ['action' => 'delivered', 'proof' => marketplacePhoto()] + marketplaceScan($delivery))->assertConflict();
    $this->assertDatabaseCount('cod_collections', 0);
});

test('delivery proof and COD are required and delivery cannot be confirmed twice', function () {
    $order = placeMarketplaceOrder($this);
    $delivery = $order->delivery;
    $delivery->forceFill(['rider_id' => $this->rider->id, 'logistics_center_id' => $this->center->id, 'status' => 'out_for_delivery'])->save();
    $this->actingAs($this->rider)->post('/deliveries/'.$delivery->id, ['action' => 'delivered'] + marketplaceScan($delivery))->assertSessionHasErrors('proof');
    $this->post('/deliveries/'.$delivery->id, ['action' => 'delivered', 'proof' => marketplacePhoto()] + marketplaceScan($delivery))->assertRedirect();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'delivered', 'proof' => marketplacePhoto()] + marketplaceScan($delivery))->assertConflict();
    $this->assertDatabaseCount('cod_collections', 1);
    expect(Storage::disk('local')->allFiles('delivery-proofs'))->toHaveCount(1);
});

test('split orders only complete after every parcel is delivered', function () {
    $order = placeMarketplaceOrder($this);
    $secondStore = Store::query()->create(['user_id' => $this->admin->id, 'name' => 'Another store', 'status' => 'approved']);
    SellerOrder::query()->create(['order_id' => $order->order_id, 'store_id' => $secondStore->id, 'subtotal' => '100.00', 'shipping_fee' => '50.00', 'commission_basis_points' => 1000, 'commission_amount' => '10.00', 'seller_proceeds' => '90.00', 'status' => 'pending']);
    $order->delivery->forceFill(['rider_id' => $this->rider->id, 'logistics_center_id' => $this->center->id, 'status' => 'out_for_delivery'])->save();
    $this->actingAs($this->rider)->post('/deliveries/'.$order->delivery->id, ['action' => 'delivered', 'proof' => marketplacePhoto()] + marketplaceScan($order->delivery))->assertRedirect();
    expect($order->order->fresh()->status)->toBe('pending');
});

test('platform commission is admin only validated and audited', function () {
    $data = ['platform_commission_basis_points' => 1000];
    $this->actingAs($this->seller)->patch('/reports/settings', $data)->assertForbidden();
    $this->actingAs($this->admin)->patch('/reports/settings', ['shipping_fee_per_seller_order' => '-1', 'platform_commission_basis_points' => 10001])->assertSessionHasErrors(['shipping_fee_per_seller_order', 'platform_commission_basis_points']);
    $this->patch('/reports/settings', $data)->assertRedirect();
    $this->assertDatabaseHas('commerce_settings', $data);
    $this->assertDatabaseHas('audit_events', ['actor_id' => $this->admin->id, 'subject_type' => 'commerce_settings', 'action' => 'updated']);
});

test('role workspaces reject incompatible roles and redirect guests', function () {
    $this->get('/inventory')->assertRedirect('/login');
    $this->actingAs($this->buyer)->get('/inventory')->assertForbidden();
    $this->get('/deliveries')->assertForbidden();
    $this->get('/reports')->assertForbidden();
    $this->actingAs($this->seller)->get('/cart')->assertForbidden();
    $this->put('/cart/'.$this->product->id, ['quantity' => 1])->assertForbidden();
});

test('buyer cancellation restores stock once and refuses repeat cancellation', function () {
    $parcel = placeMarketplaceOrder($this);
    $this->post('/purchases/'.$parcel->order_id.'/cancel')->assertRedirect();
    expect($this->product->fresh()->stock)->toBe(10)->and($parcel->order->fresh()->status)->toBe('cancelled');
    $this->post('/purchases/'.$parcel->order_id.'/cancel')->assertConflict();
    expect($this->product->fresh()->stock)->toBe(10);
});

test('cancellation and waybills enforce ownership and preparation boundaries', function () {
    $parcel = placeMarketplaceOrder($this);
    $this->actingAs(User::factory()->create())->post('/purchases/'.$parcel->order_id.'/cancel')->assertForbidden();
    $this->get('/orders/'.$parcel->id.'/waybill')->assertForbidden();
    $this->actingAs($this->seller)->get('/orders/'.$parcel->id.'/waybill')->assertOk();
    $this->patch('/orders/'.$parcel->id, ['status' => 'processing'])->assertRedirect();
    $this->actingAs($this->buyer)->post('/purchases/'.$parcel->order_id.'/cancel')->assertConflict();
    expect($this->product->fresh()->stock)->toBe(8)->and($parcel->order->fresh()->status)->toBe('processing');
});

test('delivery uses the order commission snapshot after platform rates change', function () {
    $this->product->update(['price' => '100.05']);
    DB::table('commerce_settings')->where('id', 1)->update(['platform_commission_basis_points' => 1225]);
    $parcel = placeMarketplaceOrder($this);
    DB::table('commerce_settings')->where('id', 1)->update(['platform_commission_basis_points' => 1700]);
    $parcel->delivery->forceFill(['rider_id' => $this->rider->id, 'logistics_center_id' => $this->center->id, 'status' => 'out_for_delivery'])->save();
    $this->actingAs($this->rider)->post('/deliveries/'.$parcel->delivery->id, ['action' => 'delivered', 'proof' => marketplacePhoto()] + marketplaceScan($parcel->delivery))->assertSessionHasNoErrors();
    expect($parcel->fresh()->commission_basis_points)->toBe(1225);
    expect($parcel->fresh()->commission_amount)->toBe('24.51');
    expect($parcel->fresh()->seller_proceeds)->toBe('175.59');
});
