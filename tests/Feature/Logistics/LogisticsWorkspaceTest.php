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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function logisticsCartFixture(?int $grams = 750, int $quantity = 3): array
{
    $rider = User::factory()->create(['role' => 'courier']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'sorting_center')->firstOrFail();
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Covered Store', 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Fixture category']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Packed item', 'price' => 100, 'stock' => 100, 'status' => 'active', 'weight_grams' => $grams]);
    $addressData = ['label' => 'Home', 'recipient_name' => 'Fixture Name', 'phone' => '09171234567', 'line1' => 'Test street', 'barangay' => 'Test Barangay', 'city' => 'Test City', 'province' => 'Laguna', 'region' => 'CALABARZON', 'zip' => '4000'];
    $address = Address::query()->create($addressData + ['user_id' => $buyer->id]);
    Address::query()->create($addressData + ['user_id' => $seller->id]);
    $cart = Cart::query()->create(['user_id' => $buyer->id]);
    CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => $quantity]);
    $areaId = DB::table('service_areas')->insertGetId(['sorting_center_id' => $center->id, 'code' => 'FIXTURE-'.$center->id, 'name' => 'Test Barangay, Test City', 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'province_name' => 'Laguna', 'city_name' => 'Test City', 'barangay_name' => 'Test Barangay', 'is_active' => true]);
    DB::table('rider_service_area')->insert(['rider_id' => $rider->id, 'service_area_id' => $areaId]);
    $rateId = DB::table('shipping_rates')->insertGetId(['service_area_id' => $areaId, 'base_fee_cents' => 5000, 'included_weight_grams' => 1000, 'extra_kg_fee_cents' => 1500, 'max_weight_grams' => 20000, 'is_active' => true]);
    DB::table('commerce_settings')->where('id', 1)->update(['logistics_shipping_enabled' => true]);

    return compact('buyer', 'seller', 'operator', 'center', 'rider', 'store', 'product', 'address', 'cart', 'areaId', 'rateId');
}

test('checkout quotes area and started extra kilograms and preserves shipping snapshots after rate edits', function () {
    $f = logisticsCartFixture();
    $this->actingAs($f['buyer'])->getJson('/cart/shipping-quote?address_id='.$f['address']->id)->assertOk()->assertJsonPath('options.0.total', 80)->assertJsonPath('options.0.parcels.0.weight_grams', 2250);
    $this->post('/checkout', ['address_id' => $f['address']->id, 'sorting_center_id' => $f['center']->id, 'expected_shipping_total' => 80, 'checkout_key' => fake()->uuid()])->assertSessionHasNoErrors()->assertRedirect('/orders');
    $parcel = SellerOrder::query()->sole();
    expect($parcel->shipping_fee)->toBe('80.00')->and($parcel->shipping_weight_grams)->toBe(2250)->and($parcel->shipping_quote['extra_kg'])->toBe(2);
    expect($parcel->delivery->sorting_center_id)->toBe($f['center']->id);
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
    $this->actingAs($f['buyer'])->post('/checkout', ['address_id' => $f['address']->id, 'sorting_center_id' => $condition === 'no provider' ? null : $f['center']->id, 'expected_shipping_total' => $condition === 'stale quote' ? 50 : 80, 'checkout_key' => fake()->uuid()])->assertSessionHasErrors($field);
    $this->assertDatabaseCount('orders', 0);
    expect($f['product']->fresh()->stock)->toBe(100);
    $this->assertDatabaseCount('cart_items', 1);
})->with([['missing weight', 'shipping_fee'], ['overweight', 'shipping_fee'], ['paused rate', 'sorting_center_id'], ['uncovered destination', 'sorting_center_id'], ['uncovered pickup', 'sorting_center_id'], ['inactive center', 'sorting_center_id'], ['no provider', 'sorting_center_id'], ['stale quote', 'shipping_fee']]);

test('shipping quote endpoint does not expose another buyers address or accept an omitted expected fee', function () {
    $f = logisticsCartFixture();
    $this->actingAs(User::factory()->create())->getJson('/cart/shipping-quote?address_id='.$f['address']->id)->assertNotFound();
    $this->actingAs($f['buyer'])->post('/checkout', ['address_id' => $f['address']->id, 'sorting_center_id' => $f['center']->id, 'checkout_key' => fake()->uuid()])->assertSessionHasErrors('expected_shipping_total');
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

test('logistics cannot turn an admin suspension into its own deactivation to restore a rider', function () {
    Notification::fake();
    $f = logisticsCartFixture();
    RegistrationApplication::query()->create(['user_id' => $f['rider']->id, 'requested_role' => 'courier', 'sorting_center_id' => $f['center']->id, 'status' => 'approved']);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch('/accounts/'.$f['rider']->id, ['status' => 'suspended', 'reason' => 'Admin review'])->assertSessionHasNoErrors();
    $this->actingAs($f['operator'])->patch('/accounts/'.$f['rider']->id, ['status' => 'deactivated', 'reason' => 'Attempt to replace restriction'])->assertSessionHasErrors('status');
    $this->patch('/accounts/'.$f['rider']->id, ['status' => 'approved', 'reason' => 'Attempt to restore'])->assertSessionHasErrors('status');
    expect($f['rider']->fresh()->status)->toBe('suspended');
    $this->getJson('/accounts/'.$f['rider']->id)->assertOk()->assertJsonPath('allowedStatuses', []);
});

test('unprivileged roles cannot open logistics rate controls or delivery exports', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'courier') {
        linkRiderToApprovedCenter($user);
    }
    $this->actingAs($user)->get('/logistics/shipping-rates')->assertForbidden();
    $this->get('/logistics/reports/export')->assertForbidden();
    $this->getJson('/logistics/conversation-options')->assertForbidden();
})->with(['buyer', 'seller', 'courier', 'admin']);

test('only logistics can publish verified barangay rates with validated fees', function () {
    $f = logisticsCartFixture();
    Http::preventStrayRequests();
    Http::fake(['https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]), 'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]), 'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']])]);
    $payload = ['sorting_center_id' => $f['center']->id, 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'base_fee' => 60, 'included_weight_grams' => 1000, 'extra_kg_fee' => 20, 'max_weight_grams' => 20000, 'is_active' => true];
    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('shipping_rates', ['id' => $f['rateId'], 'base_fee_cents' => 6000, 'extra_kg_fee_cents' => 2000]);
    $this->assertDatabaseHas('audit_events', ['subject_type' => 'shipping_rate', 'actor_id' => $f['operator']->id]);
    $this->post('/logistics/shipping-rates', [...$payload, 'base_fee' => -1])->assertSessionHasErrors('base_fee');
    $this->post('/logistics/shipping-rates', [...$payload, 'max_weight_grams' => 500])->assertSessionHasErrors('max_weight_grams');
    $this->post('/logistics/shipping-rates', [...$payload, 'barangay_code' => '043404999'])->assertSessionHasErrors('barangay_code');
    $this->actingAs(User::factory()->create(['role' => 'sorting_center']))->post('/logistics/shipping-rates', $payload)->assertForbidden();
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
    $assignment = ['action' => 'assign', 'rider_id' => $f['rider']->id, 'service_area_id' => $f['areaId']];
    $this->actingAs($f['operator'])->post('/deliveries/'.$delivery->id, $assignment)->assertStatus(409);
    $this->post('/deliveries/'.$delivery->id, ['action' => 'approve_pickup'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'approve_pickup'])->assertStatus(409);
    $this->post('/deliveries/'.$delivery->id, $assignment)->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'receive'])->assertStatus(409);
    $this->actingAs($f['rider'])->post('/deliveries/'.$delivery->id, ['action' => 'picked_up'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'in_transit'])->assertStatus(409);
    $this->actingAs(User::factory()->create(['role' => 'sorting_center']))->post('/deliveries/'.$delivery->id, ['action' => 'receive'])->assertForbidden();
    $this->actingAs($f['operator'])->post('/deliveries/'.$delivery->id, ['action' => 'sort'])->assertStatus(409);
    $this->post('/deliveries/'.$delivery->id, ['action' => 'receive'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, ['action' => 'sort'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$delivery->id, $assignment)->assertSessionHasNoErrors();
    expect($delivery->fresh()->status)->toBe('in_transit')->and($delivery->fresh()->received_at)->not->toBeNull()->and($delivery->fresh()->sorted_at)->not->toBeNull();
    $this->actingAs($f['rider'])->post('/deliveries/'.$delivery->id, ['action' => 'out_for_delivery'])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('parcel_events', 7);
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
    $this->actingAs($own['operator'])->get('/dashboard/sorting_center')->assertInertia(fn (Assert $page) => $page->component('logistics/dashboard')->where('metrics.delivered', 1)->has('recentParcels', 1));
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
