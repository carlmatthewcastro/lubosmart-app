<?php

use App\Actions\Checkout\CreateOrderFromCart;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function logisticsCartFixture(?int $grams = 750, int $quantity = 3): array
{
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Covered Store '.$seller->id, 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Fixture category']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Packed item', 'price' => 100, 'stock' => 100, 'status' => 'active', 'weight_grams' => $grams]);
    $addressData = ['label' => 'Home', 'recipient_name' => 'Fixture Name', 'phone' => '09171234567', 'line1' => 'Test street', 'barangay' => 'Test Barangay', 'city' => 'Test City', 'province' => 'Laguna', 'region' => 'CALABARZON', 'zip' => '4000'];
    $address = Address::query()->create($addressData + ['user_id' => $buyer->id]);
    Address::query()->create($addressData + ['user_id' => $seller->id]);
    $cart = Cart::query()->create(['user_id' => $buyer->id]);
    CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => $quantity]);
    $areaId = DB::table('service_areas')->insertGetId(['logistics_center_id' => $center->id, 'code' => 'FIXTURE-'.$center->id, 'name' => 'Test Barangay, Test City', 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'province_name' => 'Laguna', 'city_name' => 'Test City', 'barangay_name' => 'Test Barangay', 'is_active' => true]);
    DB::table('rider_service_area')->insert(['rider_id' => $rider->id, 'service_area_id' => $areaId]);
    $rateId = DB::table('shipping_rates')->insertGetId(['service_area_id' => $areaId, 'base_fee_cents' => 5000, 'included_weight_grams' => 1000, 'extra_kg_fee_cents' => 1500, 'max_weight_grams' => 20000, 'is_active' => true]);
    DB::table('commerce_settings')->where('id', 1)->update(['logistics_shipping_enabled' => true]);

    return compact('buyer', 'seller', 'operator', 'center', 'rider', 'store', 'product', 'address', 'cart', 'areaId', 'rateId');
}

test('rider coverage page exposes only eligible company riders and their center assignments', function () {
    $own = logisticsCartFixture();
    $other = logisticsCartFixture();
    $suspended = User::factory()->create(['role' => 'rider', 'status' => 'suspended', 'logistics_center_id' => $own['center']->id, 'logistics_company_id' => $own['operator']->id]);
    $unverified = User::factory()->unverified()->create(['role' => 'rider', 'logistics_center_id' => $own['center']->id, 'logistics_company_id' => $own['operator']->id]);
    DB::table('rider_service_area')->insert([
        ['rider_id' => $own['rider']->id, 'service_area_id' => $other['areaId']],
        ['rider_id' => $suspended->id, 'service_area_id' => $own['areaId']],
        ['rider_id' => $unverified->id, 'service_area_id' => $own['areaId']],
    ]);

    $this->actingAs($own['operator'])->get('/logistics/rider-coverage')->assertInertia(fn (Assert $page) => $page
        ->component('logistics/rider-coverage')
        ->has('centers', 1)->where('centers.0.id', $own['center']->id)
        ->has('riders', 1)->where('riders.0.id', $own['rider']->id)
        ->where('assignments.total', 1)
        ->where('assignments.data.0.rider_id', $own['rider']->id)
        ->where('assignments.data.0.area_id', $own['areaId']));
});

test('rider coverage page requires an authenticated logistics operator', function () {
    $this->get('/logistics/rider-coverage')->assertRedirect('/login');
    $this->actingAs(User::factory()->create(['role' => 'buyer']))->get('/logistics/rider-coverage')->assertForbidden();
});

test('rider coverage page handles operators without operational centers', function () {
    $operator = User::factory()->create(['role' => 'logistics']);

    $this->actingAs($operator)->get('/logistics/rider-coverage')->assertInertia(fn (Assert $page) => $page
        ->component('logistics/rider-coverage')->has('centers', 0)->has('riders', 0)->where('assignments.total', 0));
});

test('checkout quotes area and started extra kilograms and preserves shipping snapshots after rate edits', function () {
    $f = logisticsCartFixture();
    $this->actingAs($f['buyer'])->getJson('/cart/shipping-quote?address_id='.$f['address']->id)->assertOk()->assertJsonPath('options.0.total', 80)->assertJsonPath('options.0.parcels.0.weight_grams', 2250);
    $this->post('/checkout', ['address_id' => $f['address']->id, 'logistics_center_id' => $f['center']->id, 'expected_shipping_total' => 80, 'checkout_key' => fake()->uuid()])->assertSessionHasNoErrors()->assertRedirect('/orders');
    $parcel = SellerOrder::query()->sole();
    expect($parcel->shipping_fee)->toBe('80.00')->and($parcel->shipping_weight_grams)->toBe(2250)->and($parcel->shipping_quote['extra_kg'])->toBe(2);
    expect($parcel->delivery->logistics_center_id)->toBe($f['center']->id);
    DB::table('shipping_rates')->where('id', $f['rateId'])->update(['base_fee_cents' => 9000]);
    expect($parcel->fresh()->shipping_fee)->toBe('80.00')->and($parcel->fresh()->shipping_quote['base_fee_cents'])->toBe(5000);
    expect($f['product']->fresh()->stock)->toBe(97);
});

test('shipping charges are separated by seller rather than combining all cart weight', function () {
    $f = logisticsCartFixture(1000, 1);
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Second Store', 'status' => 'approved']);
    $pickup = $f['address']->replicate();
    $pickup->user_id = $seller->id;
    $pickup->save();
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $f['product']->category_id, 'name' => 'Second parcel', 'price' => 100, 'stock' => 10, 'status' => 'active', 'weight_grams' => 1000]);
    CartItem::query()->create(['cart_id' => $f['cart']->id, 'product_id' => $product->id, 'quantity' => 1]);
    $order = app(CreateOrderFromCart::class)->handle($f['buyer'], $f['address']->id, $f['center']->id);
    expect($order->shipping_total)->toBe('100.00')->and($order->sellerOrders)->toHaveCount(2)->and($order->sellerOrders->pluck('shipping_fee')->all())->toBe(['50.00', '50.00']);
});

test('unquotable orders fail without stock changes or falling back to flat shipping', function (string $condition, string $field) {
    $f = logisticsCartFixture();
    match ($condition) {
        'missing weight' => $f['product']->update(['weight_grams' => null]),
        'overweight' => $f['product']->update(['weight_grams' => 10000]),
        'paused rate' => DB::table('shipping_rates')->where('id', $f['rateId'])->update(['is_active' => false]),
        'uncovered destination' => $f['address']->update(['barangay' => 'Outside Coverage']),
        'uncovered pickup' => Address::query()->where('user_id', $f['seller']->id)->update(['barangay' => 'Outside Coverage']),
        'inactive center' => $f['center']->update(['is_active' => false]),
        default => null,
    };
    $this->actingAs($f['buyer'])->post('/checkout', ['address_id' => $f['address']->id, 'logistics_center_id' => $condition === 'no provider' ? null : $f['center']->id, 'expected_shipping_total' => $condition === 'stale quote' ? 50 : 80, 'checkout_key' => fake()->uuid()])->assertSessionHasErrors($field);
    $this->assertDatabaseCount('orders', 0);
    expect($f['product']->fresh()->stock)->toBe(100);
    $this->assertDatabaseCount('cart_items', 1);
})->with([['missing weight', 'shipping_fee'], ['overweight', 'shipping_fee'], ['paused rate', 'logistics_center_id'], ['uncovered destination', 'logistics_center_id'], ['uncovered pickup', 'logistics_center_id'], ['inactive center', 'logistics_center_id'], ['no provider', 'logistics_center_id'], ['stale quote', 'shipping_fee']]);

test('shipping quote endpoint does not expose another buyers address or accept an omitted expected fee', function () {
    $f = logisticsCartFixture();
    $this->actingAs(User::factory()->create())->getJson('/cart/shipping-quote?address_id='.$f['address']->id)->assertNotFound();
    $this->actingAs($f['buyer'])->post('/checkout', ['address_id' => $f['address']->id, 'logistics_center_id' => $f['center']->id, 'checkout_key' => fake()->uuid()])->assertSessionHasErrors('expected_shipping_total');
    $this->assertDatabaseCount('orders', 0);
});

test('draft-only setup keeps legacy checkout available until the first rate is published', function () {
    $f = logisticsCartFixture(null);
    DB::table('shipping_rates')->where('id', $f['rateId'])->update(['is_active' => false]);
    DB::table('commerce_settings')->where('id', 1)->update(['logistics_shipping_enabled' => false]);
    $order = app(CreateOrderFromCart::class)->handle($f['buyer'], $f['address']->id);
    expect($order->shipping_total)->toBe('50.00');
    $this->actingAs($f['operator'])->patch('/logistics/shipping-rates/'.$f['rateId'], ['is_active' => true])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('commerce_settings', ['id' => 1, 'logistics_shipping_enabled' => true]);
    $this->patch('/logistics/shipping-rates/'.$f['rateId'], ['is_active' => false])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('commerce_settings', ['id' => 1, 'logistics_shipping_enabled' => true]);
});

test('rider access changes belong to logistics and exclude administrators', function () {
    Notification::fake();
    $f = logisticsCartFixture();
    RegistrationApplication::query()->create(['user_id' => $f['rider']->id, 'requested_role' => 'rider', 'logistics_center_id' => $f['center']->id, 'status' => 'approved']);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch('/accounts/'.$f['rider']->id, ['status' => 'suspended', 'reason' => 'Admin review'])->assertForbidden();
    $this->actingAs($f['operator'])->patch('/accounts/'.$f['rider']->id, ['status' => 'deactivated', 'reason' => 'Attempt to replace restriction'])->assertSessionHasNoErrors();
    $this->patch('/accounts/'.$f['rider']->id, ['status' => 'approved', 'reason' => 'Attempt to restore'])->assertSessionHasNoErrors();
    expect($f['rider']->fresh()->status)->toBe('approved');
    $this->getJson('/accounts/'.$f['rider']->id)->assertOk()->assertJsonPath('allowedStatuses', ['approved', 'suspended', 'deactivated']);
    $this->get('/logistics/riders')->assertInertia(fn (Assert $page) => $page
        ->component('logistics/riders/index')
        ->has('riders', 1)
        ->where('riders.0.id', $f['rider']->id)
        ->where('riders.0.created_at', $f['rider']->created_at->toJSON())
        ->where('riders.0.email_verified_at', $f['rider']->email_verified_at->toJSON())
        ->where('riders.0.applicationStatus', 'approved')
        ->where('riders.0.canManage', true));
});

test('unprivileged roles cannot open logistics rate controls or delivery exports', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'rider') {
        linkRiderToApprovedCenter($user);
    }
    $this->actingAs($user)->get('/logistics/shipping-rates')->assertForbidden();
    $this->get('/logistics/reports/export')->assertForbidden();
    $this->getJson('/logistics/conversation-options')->assertForbidden();
})->with(['buyer', 'seller', 'rider', 'admin']);

test('only logistics can publish verified barangay rates with validated fees', function () {
    $f = logisticsCartFixture();
    Http::preventStrayRequests();
    Http::fake(['https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]), 'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]), 'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']])]);
    $payload = ['logistics_center_id' => $f['center']->id, 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'base_fee' => 60, 'included_weight_grams' => 1000, 'extra_kg_fee' => 20, 'max_weight_grams' => 20000, 'is_active' => true];
    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('shipping_rates', ['id' => $f['rateId'], 'base_fee_cents' => 6000, 'extra_kg_fee_cents' => 2000]);
    $this->assertDatabaseHas('audit_events', ['subject_type' => 'shipping_rate', 'actor_id' => $f['operator']->id]);
    $this->post('/logistics/shipping-rates', [...$payload, 'base_fee' => -1])->assertSessionHasErrors('base_fee');
    $this->post('/logistics/shipping-rates', [...$payload, 'max_weight_grams' => 500])->assertSessionHasErrors('max_weight_grams');
    $this->post('/logistics/shipping-rates', [...$payload, 'barangay_code' => '043404999'])->assertSessionHasErrors('barangay_code');
    $this->actingAs(User::factory()->create(['role' => 'logistics']))->post('/logistics/shipping-rates', $payload)->assertForbidden();
    $this->patch('/logistics/shipping-rates/'.$f['rateId'], ['is_active' => false])->assertNotFound();
    $this->actingAs($f['rider'])->get('/logistics/shipping-rates')->assertForbidden();
    $this->post('/logistics/shipping-rates', $payload)->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/logistics/shipping-rates')->assertForbidden();
    $this->actingAs($f['operator'])->patch('/logistics/shipping-rates/'.$f['rateId'], ['is_active' => false])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('shipping_rates', ['id' => $f['rateId'], 'is_active' => false]);
});

test('rated parcels require pickup approval receipt and sorting before delivery dispatch', function () {
    Notification::fake();
    $f = logisticsCartFixture();
    $order = app(CreateOrderFromCart::class)->handle($f['buyer'], $f['address']->id, $f['center']->id);
    $sellerOrder = $order->sellerOrders->sole();
    $sellerOrder->update(['status' => 'shipped']);
    $delivery = $sellerOrder->delivery;
    $scan = ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner'];
    $assignment = ['action' => 'assign', 'rider_id' => $f['rider']->id, 'service_area_id' => $f['areaId']];
    $this->actingAs($f['operator'])->post('/deliveries/'.$delivery->id, $assignment)->assertStatus(409);
    $this->post('/deliveries/'.$delivery->id, ['action' => 'approve_pickup'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'approve_pickup'])->assertStatus(409);
    $this->post('/deliveries/'.$delivery->id, $assignment)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'receive', 'receipt_condition' => 'intact'] + $scan)->assertStatus(409);
    $this->actingAs($f['rider'])->post('/deliveries/'.$delivery->id, ['action' => 'picked_up'] + $scan)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'in_transit'])->assertStatus(409);
    $this->actingAs(User::factory()->create(['role' => 'logistics']))->post('/deliveries/'.$delivery->id, ['action' => 'receive', 'receipt_condition' => 'intact'] + $scan)->assertForbidden();
    $this->actingAs($f['operator'])->post('/deliveries/'.$delivery->id, ['action' => 'sort', 'service_area_id' => $f['areaId'], 'sorting_bin' => 'Route A'] + $scan)->assertStatus(409);
    $this->post('/deliveries/'.$delivery->id, ['action' => 'receive', 'receipt_condition' => 'intact'] + $scan)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'sort', 'service_area_id' => $f['areaId'], 'sorting_bin' => 'Route A'] + $scan)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, $assignment + $scan)->assertSessionHasNoErrors();
    expect($delivery->fresh()->status)->toBe('in_transit')->and($delivery->fresh()->received_at)->not->toBeNull()->and($delivery->fresh()->sorted_at)->not->toBeNull();
    $this->actingAs($f['rider'])->post('/deliveries/'.$delivery->id, ['action' => 'out_for_delivery'])->assertConflict();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'accept_dispatch'] + $scan)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'out_for_delivery'])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('parcel_events', 8);
});

test('logistics dashboards queues reports and conversations stay within their own center', function () {
    $own = logisticsCartFixture();
    $other = logisticsCartFixture();
    foreach ([$own, $other] as $f) {
        $order = app(CreateOrderFromCart::class)->handle($f['buyer'], $f['address']->id, $f['center']->id);
        $parcel = $order->sellerOrders->sole();
        $parcel->update(['status' => 'completed']);
        $parcel->delivery->update(['status' => 'delivered', 'delivered_at' => now()]);
    }
    $this->actingAs($own['operator'])->get('/dashboard/logistics')->assertInertia(fn (Assert $page) => $page->component('logistics/dashboard')->where('metrics.delivered', 1)->has('recentParcels', 1));
    $this->get('/deliveries')->assertInertia(fn (Assert $page) => $page->component('logistics/parcels')->where('deliveries.total', 1));
    $this->get('/reports')->assertInertia(fn (Assert $page) => $page->component('logistics/reports')->where('totals.Completed Parcels', 1)->missing('totals.Seller proceeds'));
    $csv = $this->get('/logistics/reports/export')->assertOk()->streamedContent();
    expect(substr_count($csv, 'Covered Store'))->toBe(1);
    $options = $this->getJson('/logistics/conversation-options')->assertOk();
    expect(collect($options->json('recipients'))->pluck('id')->all())->toContain($own['buyer']->id, $own['seller']->id, $own['rider']->id)->not->toContain($other['buyer']->id, $other['seller']->id, $other['rider']->id);
    $this->post('/support', ['kind' => 'message', 'subject' => 'Order or Delivery Follow-up', 'body' => 'Pickup update', 'recipient_email' => $own['rider']->email])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('support_case_participants', ['user_id' => $own['rider']->id]);
    $this->post('/support', ['kind' => 'message', 'subject' => 'Order or Delivery Follow-up', 'body' => 'Cross-center attempt', 'recipient_email' => $other['rider']->email])->assertSessionHasErrors('recipient_email');
});

function operationalParcelFixture(string $status = 'picked_up'): array
{
    $f = logisticsCartFixture();
    $order = app(CreateOrderFromCart::class)->handle($f['buyer'], $f['address']->id, $f['center']->id);
    $sellerOrder = $order->sellerOrders->sole();
    $sellerOrder->update(['status' => 'shipped']);
    $delivery = $sellerOrder->delivery;
    $delivery->update(['status' => $status, 'rider_id' => $f['rider']->id, 'pickup_approved_at' => now(), 'picked_up_at' => now()]);

    return $f + compact('order', 'sellerOrder', 'delivery') + ['scan' => ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner']];
}

test('approved pickup remains assignable and reaches the delivery rider through physical handovers', function (bool $differentRider, bool $legacy) {
    Notification::fake();
    $f = logisticsCartFixture(750, 1);
    $order = app(CreateOrderFromCart::class)->handle($f['buyer'], $f['address']->id, $f['center']->id);
    $parcel = $order->sellerOrders->sole();
    $parcel->update(['status' => 'shipped']);
    $delivery = $parcel->delivery;
    if ($legacy) {
        $delivery->forceFill(['logistics_center_id' => null, 'service_area_id' => null])->save();
    }
    $scan = ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner'];
    $url = '/deliveries/'.$delivery->id;
    $this->actingAs($f['operator'])->post($url, $legacy ? ['action' => 'claim', 'logistics_center_id' => $f['center']->id] : ['action' => 'approve_pickup'])->assertSessionHasNoErrors();
    $this->get('/deliveries?stage=pickups')->assertInertia(fn (Assert $page) => $page
        ->has('deliveries.data', 1)->where('deliveries.data.0.id', $delivery->id)->where('deliveries.data.0.status', 'unassigned')
        ->where('deliveries.data.0.pickup_approved_at', fn ($value) => $value !== null));
    $this->getJson('/logistics/notifications')->assertJsonPath('pickupRequests', 1);
    $this->post($url, ['action' => 'assign', 'service_area_id' => $f['areaId'], 'rider_id' => $f['rider']->id])->assertSessionHasNoErrors();
    $this->get('/deliveries?stage=incoming')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 1)->where('deliveries.data.0.id', $delivery->id));
    $this->actingAs($f['rider'])->get('/deliveries?stage=pickups')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 1)->where('deliveries.data.0.id', $delivery->id));
    $this->post($url, ['action' => 'picked_up'] + $scan)->assertSessionHasNoErrors();
    $this->post($url, ['action' => 'out_for_delivery'])->assertConflict();
    $this->actingAs($f['operator'])->post($url, ['action' => 'receive', 'receipt_condition' => 'intact'] + $scan)->assertSessionHasNoErrors();
    $this->post($url, ['action' => 'sort', 'service_area_id' => $f['areaId'], 'sorting_bin' => 'Route 1'] + $scan)->assertSessionHasNoErrors();
    $this->get('/deliveries?stage=dispatch')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 1)->where('deliveries.data.0.id', $delivery->id));
    $deliveryRider = $f['rider'];
    if ($differentRider) {
        $deliveryRider = User::factory()->create(['role' => 'rider', 'logistics_center_id' => $f['center']->id, 'logistics_company_id' => $f['operator']->id]);
        $deliveryRider->logisticsCenters()->attach($f['center']->id, ['granted_by' => $f['operator']->id]);
        DB::table('rider_service_area')->insert(['rider_id' => $deliveryRider->id, 'service_area_id' => $f['areaId']]);
    }
    $assignment = ['action' => 'assign', 'service_area_id' => $f['areaId'], 'rider_id' => $deliveryRider->id];
    $this->post($url, $assignment)->assertSessionHasErrors('tracking_reference');
    $this->post($url, $assignment + $scan)->assertSessionHasNoErrors();
    $this->actingAs($deliveryRider)->get('/deliveries?stage=dispatch')->assertInertia(fn (Assert $page) => $page
        ->has('deliveries.data', 1)->where('deliveries.data.0.id', $delivery->id)->where('deliveries.data.0.status', 'in_transit'));
    $this->post($url, ['action' => 'out_for_delivery'])->assertConflict();
    $this->post($url, ['action' => 'accept_dispatch'] + $scan)->assertSessionHasNoErrors();
    $this->post($url, ['action' => 'out_for_delivery'])->assertSessionHasNoErrors();
    $proof = UploadedFile::fake()->createWithContent('proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII='));
    $this->post($url, ['action' => 'delivered', 'proof' => $proof, 'amount' => '150.00', 'recipient_name' => 'Fixture Name'] + $scan)->assertSessionHasNoErrors();
    expect($delivery->fresh()->status)->toBe('delivered');
    expect($parcel->fresh()->status)->toBe('completed');
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $delivery->id, 'rider_id' => $deliveryRider->id, 'amount' => 150, 'status' => 'collected']);
})->with(['same pickup and delivery rider' => [false, false], 'different delivery rider' => [true, false], 'accepted unallocated pickup' => [false, true]]);

test('scan workspace starts empty and opens only an exact own-center parcel reference', function () {
    $own = operationalParcelFixture();
    $other = operationalParcelFixture();

    $this->actingAs($own['operator'])->get('/logistics/scan')->assertInertia(fn (Assert $page) => $page->component('logistics/scan')->where('deliveries.total', 0)->has('available', 0));
    $this->get('/logistics/scan?search='.strtolower($own['delivery']->tracking_reference).'&stage=cash')->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 1)->where('deliveries.data.0.id', $own['delivery']->id));
    $this->get('/logistics/scan?search='.$other['delivery']->tracking_reference)->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 0)->has('available', 0));
    $this->get('/logistics/scan?search='.urlencode($own['store']->name))->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 0));
    $this->get('/logistics/scan?search=LM-UNKNOWN')->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 0));
    $this->assertDatabaseCount('parcel_events', 0);
});

test('scan workspace excludes guests and other operational roles', function () {
    $this->get('/logistics/scan')->assertRedirect('/login');
    $this->actingAs(User::factory()->create(['role' => 'buyer']))->get('/logistics/scan')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/logistics/scan')->assertForbidden();
    $f = logisticsCartFixture();
    $this->actingAs($f['rider'])->get('/logistics/scan')->assertForbidden();
});

test('scanned parcel operations return to the scan workspace with updated state', function () {
    $f = operationalParcelFixture();
    $url = '/logistics/scan?search='.$f['delivery']->tracking_reference;

    $this->actingAs($f['operator'])->from($url)->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive', 'receipt_condition' => 'intact'] + $f['scan'])->assertRedirect($url)->assertSessionHasNoErrors();
    $this->get($url)->assertInertia(fn (Assert $page) => $page->component('logistics/scan')->where('deliveries.data.0.receipt_condition', 'intact')->has('deliveries.data.0.events', 1));
});

test('logistics notification counts include only the operators operational centers', function () {
    $own = operationalParcelFixture();
    $other = operationalParcelFixture('in_transit');
    $own['rider']->application()->create(['requested_role' => 'rider', 'status' => 'submitted', 'logistics_center_id' => $own['center']->id]);
    $other['rider']->application()->create(['requested_role' => 'rider', 'status' => 'submitted', 'logistics_center_id' => $other['center']->id]);

    $this->actingAs($own['operator'])->getJson('/logistics/notifications')->assertOk()
        ->assertJson(['riderApplications' => 1, 'pickupRequests' => 0, 'incoming' => 1, 'sorting' => 0, 'activeDeliveries' => 0])
        ->assertHeader('Cache-Control', 'no-store, private');
    $own['delivery']->update(['received_at' => now()]);
    $this->getJson('/logistics/notifications')->assertJsonPath('incoming', 0)->assertJsonPath('sorting', 1);
    $own['delivery']->update(['sorted_at' => now(), 'status' => 'in_transit']);
    $this->getJson('/logistics/notifications')->assertJsonPath('sorting', 0)->assertJsonPath('activeDeliveries', 1);
});

test('logistics notifications require a logistics account and handle empty centers', function () {
    $this->getJson('/logistics/notifications')->assertUnauthorized();
    $this->actingAs(User::factory()->create(['role' => 'buyer']))->getJson('/logistics/notifications')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/logistics/notifications')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'logistics']))->getJson('/logistics/notifications')
        ->assertOk()->assertExactJson(['riderApplications' => 0, 'pickupRequests' => 0, 'incoming' => 0, 'sorting' => 0, 'dispatch' => 0, 'exceptions' => 0, 'cash' => 0, 'activeDeliveries' => 0]);
});

test('parcel tracking lookup excludes other centers and unknown codes', function () {
    $own = operationalParcelFixture();
    $other = operationalParcelFixture();

    $this->actingAs($own['operator'])->get('/deliveries?search='.$own['delivery']->tracking_reference)
        ->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 1)->where('deliveries.data.0.id', $own['delivery']->id));
    $this->get('/deliveries?search='.$other['delivery']->tracking_reference)->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 0));
    $this->get('/deliveries?search=LM-UNKNOWN')->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 0));
});

test('receipt requires the attached parcel reference and a reason for manual entry', function () {
    $f = operationalParcelFixture();
    $payload = ['action' => 'receive', 'receipt_condition' => 'intact'];

    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, $payload)->assertSessionHasErrors('tracking_reference');
    $this->post('/deliveries/'.$f['delivery']->id, $payload + ['tracking_reference' => $f['delivery']->tracking_reference, 'capture_method' => 'manual'])->assertSessionHasErrors('reason');
    $this->post('/deliveries/'.$f['delivery']->id, $payload + ['tracking_reference' => $f['delivery']->tracking_reference, 'capture_method' => 'manual', 'reason' => 'Damaged barcode; checked printed text.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('deliveries', ['id' => $f['delivery']->id, 'receipt_condition' => 'intact']);
    $event = DB::table('parcel_events')->sole();
    expect(json_decode($event->notes, true)['evidence']['reason'])->toBe('Damaged barcode; checked printed text.');
});

test('receipt retries with the same request key record one handover', function () {
    $f = operationalParcelFixture();
    $payload = ['action' => 'receive', 'receipt_condition' => 'intact', 'request_key' => fake()->uuid()] + $f['scan'];

    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, $payload)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, $payload)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, ['request_key' => fake()->uuid()] + $payload)->assertConflict();
    $this->assertDatabaseCount('parcel_events', 1);
});

test('sorting rejects a destination mismatch without changing the parcel', function () {
    $f = operationalParcelFixture();
    $f['delivery']->update(['received_at' => now(), 'receipt_condition' => 'intact']);
    DB::table('service_areas')->where('id', $f['areaId'])->update(['barangay_name' => 'Wrong barangay']);

    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'sort', 'service_area_id' => $f['areaId'], 'sorting_bin' => 'A1'] + $f['scan'])->assertSessionHasErrors('service_area_id');
    expect($f['delivery']->fresh()->sorted_at)->toBeNull();
    $this->assertDatabaseCount('parcel_events', 0);
});

test('damaged receipt holds a parcel and prevents sorting dispatch and retry', function () {
    $f = operationalParcelFixture();
    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive', 'receipt_condition' => 'damaged'] + $f['scan'])->assertSessionHasNoErrors();

    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'sort', 'service_area_id' => $f['areaId'], 'sorting_bin' => 'A1'] + $f['scan'])->assertConflict();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'retry', 'reason' => 'Try again'])->assertConflict();
    $this->get('/deliveries?stage=exceptions')->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 1));
    $this->assertDatabaseHas('deliveries', ['id' => $f['delivery']->id, 'exception_status' => 'held']);
});

test('a separate delivery rider accepts a manifest while pickup rider history remains intact', function () {
    $f = operationalParcelFixture();
    $second = User::factory()->create(['role' => 'rider', 'logistics_center_id' => $f['center']->id]);
    $second->logisticsCenters()->attach($f['center']->id, ['granted_by' => $f['operator']->id]);
    DB::table('rider_service_area')->insert(['rider_id' => $second->id, 'service_area_id' => $f['areaId']]);
    $f['delivery']->update(['received_at' => now(), 'sorted_at' => now(), 'receipt_condition' => 'intact', 'sorting_bin' => 'A1']);

    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'assign', 'rider_id' => $second->id, 'service_area_id' => $f['areaId']] + $f['scan'])->assertSessionHasNoErrors();
    $this->actingAs($f['rider'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'accept_dispatch'] + $f['scan'])->assertForbidden();
    $this->actingAs($second)->post('/deliveries/'.$f['delivery']->id, ['action' => 'out_for_delivery'])->assertConflict();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'accept_dispatch'] + $f['scan'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'accept_dispatch'] + $f['scan'])->assertConflict();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'out_for_delivery'])->assertSessionHasNoErrors();
    $assignment = DB::table('parcel_events')->where('type', 'assign')->sole();
    $notes = json_decode($assignment->notes, true);
    expect($notes['before']['rider_id'])->toBe($f['rider']->id);
    expect($notes['after']['rider_id'])->toBe($second->id);
    expect($f['delivery']->fresh()->dispatch_reference)->not->toBeNull();
});

test('failed delivery returns to center and retry requires sorting and a fresh dispatch', function (bool $previousReceipt) {
    $f = operationalParcelFixture('out_for_delivery');
    $f['delivery']->update(['received_at' => $previousReceipt ? now() : null, 'sorted_at' => now(), 'dispatch_prepared_at' => now(), 'dispatch_accepted_at' => now()]);

    $this->actingAs($f['rider'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'failed_attempt'])->assertSessionHasErrors('reason');
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'failed_attempt', 'reason' => 'Recipient unavailable; parcel remains with rider.'])->assertSessionHasNoErrors();
    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'return_to_center', 'reason' => 'Return unopened parcel with pickup rider.'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_return', 'receipt_condition' => 'intact', 'reason' => 'Received from assigned rider.'] + $f['scan'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'retry', 'reason' => 'Recipient confirmed availability tomorrow.'])->assertSessionHasNoErrors();
    $fresh = $f['delivery']->fresh();
    expect($fresh->exception_status)->toBeNull();
    expect($fresh->sorted_at)->toBeNull();
    expect($fresh->dispatch_accepted_at)->toBeNull();
    expect($fresh->received_at)->not->toBeNull();
    expect($fresh->status)->toBe('picked_up');
    $this->actingAs($f['rider'])->post('/deliveries/'.$fresh->id, ['action' => 'in_transit'])->assertConflict();
    $this->assertDatabaseCount('cod_collections', 0);
    $this->assertDatabaseCount('parcel_events', 4);
})->with(['normal receipt history' => true, 'legacy route without receipt history' => false]);

test('short cash handover stays unreconciled until verified cash equals the collection', function () {
    $f = operationalParcelFixture('delivered');
    DB::table('cod_collections')->insert(['delivery_id' => $f['delivery']->id, 'rider_id' => $f['rider']->id, 'reference' => fake()->uuid(), 'amount' => 380, 'status' => 'collected', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_cod'])->assertSessionHasErrors('amount');
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_cod', 'amount' => 300, 'handover_reference' => 'CASH-001'])->assertSessionHasErrors('reason');
    $payload = ['action' => 'receive_cod', 'amount' => 300, 'handover_reference' => 'CASH-001', 'reason' => 'Rider short by PHP 80.', 'request_key' => fake()->uuid()];
    $this->post('/deliveries/'.$f['delivery']->id, $payload)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $f['delivery']->id, 'status' => 'collected', 'received_amount' => 300]);
    $this->actingAs(User::factory()->create(['role' => 'admin']))->post('/deliveries/'.$f['delivery']->id, ['action' => 'reconcile_cod'])->assertConflict();
    $this->actingAs($f['operator'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_cod', 'amount' => 380, 'handover_reference' => 'CASH-002'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $f['delivery']->id, 'status' => 'handed_over', 'received_amount' => 380, 'discrepancy_reason' => null]);
    $this->assertDatabaseCount('parcel_events', 2);
});

test('delivery requires actual full payment and recipient evidence and cleans up rejected proof', function () {
    Notification::fake();
    Storage::fake('local');
    $f = operationalParcelFixture('out_for_delivery');
    $proof = UploadedFile::fake()->createWithContent('proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII='));

    $this->actingAs($f['rider'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'delivered', 'proof' => $proof, 'amount' => 300, 'recipient_name' => 'Fixture Name'] + $f['scan'])->assertSessionHasErrors('amount');
    $this->assertDatabaseCount('cod_collections', 0);
    expect(Storage::disk('local')->allFiles('delivery-proofs'))->toBeEmpty();
    expect($f['sellerOrder']->fresh()->status)->toBe('shipped');
    Notification::assertNothingSent();
});

test('waybill reprints retain tracking identity and reject multi-box labels', function () {
    $f = operationalParcelFixture();
    $reference = $f['delivery']->tracking_reference;
    $url = '/orders/'.$f['sellerOrder']->id.'/waybill';
    $this->actingAs($f['seller'])->get($url)->assertInertia(fn (Assert $page) => $page->where('order.delivery.tracking_reference', $reference));
    $payload = ['packages' => 1, 'request_key' => fake()->uuid()];
    $this->post($url, $payload)->assertSessionHasNoErrors();
    $this->post($url, $payload)->assertSessionHasNoErrors();
    $this->post($url, ['packages' => 1, 'request_key' => fake()->uuid()])->assertSessionHasNoErrors();
    $this->post($url, ['packages' => 2, 'request_key' => fake()->uuid()])->assertSessionHasErrors('packages');
    $this->assertDatabaseHas('parcel_events', ['delivery_id' => $f['delivery']->id, 'type' => 'label_reprint_requested']);
    $this->assertDatabaseCount('parcel_events', 2);
    expect($f['delivery']->fresh()->tracking_reference)->toBe($reference);
});

test('legacy cash handovers require amount verification before admin reconciliation', function () {
    $f = operationalParcelFixture('delivered');
    DB::table('cod_collections')->insert(['delivery_id' => $f['delivery']->id, 'rider_id' => $f['rider']->id, 'reference' => fake()->uuid(), 'amount' => 380, 'status' => 'handed_over', 'collected_at' => now(), 'handed_over_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->post('/deliveries/'.$f['delivery']->id, ['action' => 'reconcile_cod'])->assertConflict();
    $this->actingAs($f['operator'])->get('/deliveries?stage=cash')->assertInertia(fn (Assert $page) => $page->where('deliveries.total', 1));
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_cod', 'amount' => 380, 'handover_reference' => 'VERIFIED-OLD-001'])->assertSessionHasNoErrors();
    $this->actingAs($admin)->post('/deliveries/'.$f['delivery']->id, ['action' => 'reconcile_cod'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $f['delivery']->id, 'status' => 'reconciled', 'received_amount' => 380]);
});
