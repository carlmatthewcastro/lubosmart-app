<?php

use App\Models\Address;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

function mobileShop(): array
{
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $category = Category::query()->create(['name' => 'Mobile bags', 'is_active' => true]);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Mobile store '.$seller->id, 'status' => 'approved', 'business_category_id' => $category->id]);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Mobile bag', 'price' => '100.25', 'stock' => 10, 'weight_grams' => 500, 'status' => 'active']);
    $addressData = ['label' => 'Home', 'recipient_name' => 'Synthetic Buyer', 'phone' => '09171234567', 'line1' => '5 Synthetic Street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000'];
    $address = $buyer->addresses()->create($addressData);
    $seller->addresses()->create($addressData);

    return compact('buyer', 'seller', 'category', 'store', 'product', 'address');
}

function mobileClient(User $user, ?array $abilities = null)
{
    app('auth')->forgetGuards();
    $token = $user->createToken('Synthetic phone', $abilities ?? ['api:v1', 'role:'.$user->role], now()->addDay());

    return test()->withToken($token->plainTextToken);
}

function mobilePurchase(array $shop): Order
{
    mobileClient($shop['buyer'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 2])->assertOk();
    test()->postJson('/api/v1/orders', [
        'address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(),
        'expected_items_subtotal' => '200.50', 'expected_shipping_total' => '50.00',
    ])->assertCreated()->assertJsonPath('data.total', '250.50');

    return Order::query()->where('buyer_id', $shop['buyer']->id)->latest('id')->firstOrFail();
}

test('device login returns an expiring scoped token and an allow-listed user', function () {
    $user = User::factory()->create();

    $response = $this->postJson('/api/v1/auth/tokens', ['email' => ' '.strtoupper($user->email).' ', 'password' => 'password', 'device_name' => 'Android test']);

    $response->assertCreated()->assertJsonPath('data.token_type', 'Bearer')->assertJsonPath('data.user.id', $user->id)
        ->assertJsonMissingPath('data.user.password')->assertJsonMissingPath('data.user.bank_account');
    $token = PersonalAccessToken::findToken($response->json('data.access_token'));
    expect($token->abilities)->toBe(['api:v1', 'role:buyer']);
    expect($token->expires_at->isFuture())->toBeTrue();
    expect($token->token)->not->toBe($response->json('data.access_token'));
    app('auth')->forgetGuards();
    $this->withToken($response->json('data.access_token'))->get('/api/v1/me')->assertOk()->assertJsonPath('data.id', $user->id);
});

test('device login rejects wrong credentials and google-only accounts without issuing tokens', function (string $kind) {
    $user = User::factory()->create($kind === 'google' ? ['password' => null, 'google_id' => 'synthetic-google'] : []);

    $this->postJson('/api/v1/auth/tokens', ['email' => $kind === 'unknown' ? 'absent@example.test' : $user->email, 'password' => 'wrong', 'device_name' => 'Test'])
        ->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');

    $this->assertDatabaseCount('personal_access_tokens', 0);
})->with(['wrong', 'unknown', 'google']);

test('device login requires verified approved operational accounts', function (string $state) {
    $user = User::factory()->create(match ($state) {
        'unverified' => ['email_verified_at' => null],
        'unaffiliated rider' => ['role' => 'rider'],
        default => ['status' => $state],
    });

    $this->postJson('/api/v1/auth/tokens', ['email' => $user->email, 'password' => 'password', 'device_name' => 'Test'])->assertForbidden();

    $this->assertDatabaseCount('personal_access_tokens', 0);
})->with(['pending', 'suspended', 'deactivated', 'pending_reverification', 'unverified', 'unaffiliated rider']);

test('device login validates input and throttles repeated attempts', function () {
    $this->postJson('/api/v1/auth/tokens', [])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'device_name']);
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->postJson('/api/v1/auth/tokens', ['email' => 'throttle@example.test', 'password' => 'wrong', 'device_name' => 'Test'])->assertUnauthorized();
    }
    $this->postJson('/api/v1/auth/tokens', ['email' => 'throttle@example.test', 'password' => 'wrong', 'device_name' => 'Test'])->assertTooManyRequests()->assertHeader('Retry-After');
});

test('protected endpoints reject missing invalid expired or insufficient tokens', function (string $kind) {
    $user = User::factory()->create();
    $token = match ($kind) {
        'missing' => '', 'invalid' => 'invalid-synthetic',
        'expired' => $user->createToken('Expired', ['api:v1', 'role:buyer'], now()->subMinute())->plainTextToken,
        default => $user->createToken('Limited', ['profile:read'], now()->addDay())->plainTextToken,
    };

    $this->withToken($token)->get('/api/v1/me')->assertStatus($kind === 'limited' ? 403 : 401)->assertHeader('Content-Type', 'application/json');
})->with(['missing', 'invalid', 'expired', 'limited']);

test('a browser session alone does not authenticate the stateless device API', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'web')->get('/api/v1/me')->assertUnauthorized();
    $this->actingAs($user, 'web')->get('/dashboard/buyer')->assertOk();
});

test('logout revokes only the current device and logout all revokes the others', function () {
    $user = User::factory()->create();
    $first = $user->createToken('First', ['api:v1', 'role:buyer'], now()->addDay());
    $second = $user->createToken('Second', ['api:v1', 'role:buyer'], now()->addDay());

    $this->withToken($first->plainTextToken)->deleteJson('/api/v1/auth/token')->assertNoContent();
    expect(PersonalAccessToken::findToken($first->plainTextToken))->toBeNull();
    app('auth')->forgetGuards();
    $this->withToken($second->plainTextToken)->getJson('/api/v1/me')->assertOk();
    $this->deleteJson('/api/v1/auth/tokens')->assertNoContent();
    app('auth')->forgetGuards();
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('credential and access changes revoke issued device tokens', function (string $field) {
    $user = User::factory()->create();
    $token = $user->createToken('Before change', ['api:v1', 'role:buyer'], now()->addDay());
    $value = match ($field) {
        'password' => Hash::make('Changed@2026'), 'email' => 'changed@example.test',
        'role' => 'seller', 'email_verified_at' => null, default => 'suspended',
    };

    $user->forceFill([$field => $value])->save();

    expect(PersonalAccessToken::findToken($token->plainTextToken))->toBeNull();
    $this->withToken($token->plainTextToken)->getJson('/api/v1/me')->assertUnauthorized();
})->with(['password', 'email', 'role', 'email_verified_at', 'status']);

test('rider tokens lose operational access when their company is unavailable', function () {
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    mobileClient($rider)->getJson('/api/v1/me')->assertOk();

    $center->update(['is_active' => false]);
    app('auth')->forgetGuards();

    $this->getJson('/api/v1/deliveries')->assertForbidden();
});

test('public catalog uses marketplace availability and safe paginated resources', function () {
    $shop = mobileShop();
    ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Blue', 'stock' => 2, 'is_active' => true]);
    ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Retired', 'stock' => 8, 'is_active' => false]);

    $this->getJson('/api/v1/products?search=Mobile&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.price', '100.25')
        ->assertJsonPath('data.0.variants.0.name', 'Blue')->assertJsonCount(1, 'data.0.variants')->assertJsonStructure(['links', 'meta'])
        ->assertJsonMissingPath('data.0.store.user_id')->assertJsonMissingPath('data.0.image_path');
    $shop['category']->update(['is_active' => false]);
    $this->getJson('/api/v1/products')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/products/'.$shop['product']->id)->assertNotFound();
    $this->getJson('/api/v1/categories')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/products?per_page=999')->assertUnprocessable();
});

test('cart writes are absolute scoped and do not reserve stock', function () {
    $shop = mobileShop();
    mobileClient($shop['buyer'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 2])->assertOk();
    $this->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 2])->assertOk();
    $this->getJson('/api/v1/cart')->assertJsonPath('data.items.0.quantity', 2)->assertJsonPath('data.items.0.is_available', true);
    $this->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 99])->assertUnprocessable()->assertJsonValidationErrors('quantity');
    $this->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 2, 'add' => true])->assertUnprocessable();
    expect($shop['product']->fresh()->stock)->toBe(10);
    mobileClient(User::factory()->create())->getJson('/api/v1/cart')->assertJsonCount(0, 'data.items');
    mobileClient($shop['seller'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 1])->assertForbidden();
});

test('buyers can read and create only their own delivery addresses', function () {
    $shop = mobileShop();
    mobileClient($shop['buyer'])->getJson('/api/v1/addresses')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $shop['address']->id)->assertJsonMissingPath('data.0.user_id');
    $data = $shop['address']->only(['label', 'recipient_name', 'phone', 'line1', 'barangay', 'city', 'province', 'region', 'zip']);
    $data['user_id'] = $shop['seller']->id;
    $this->postJson('/api/v1/addresses', $data)->assertCreated()->assertJsonMissingPath('data.user_id');
    expect(Address::query()->where('user_id', $shop['buyer']->id)->count())->toBe(2);
    $this->getJson('/api/v1/shipping-quotes?address_id='.$shop['seller']->addresses()->first()->id)->assertNotFound();
});

test('checkout is amount-reviewed atomic and replay safe with owned reads and cancellation', function () {
    $shop = mobileShop();
    mobileClient($shop['buyer'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 2])->assertOk();
    $data = ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(), 'expected_items_subtotal' => '200.50', 'expected_shipping_total' => '50.00'];
    $this->postJson('/api/v1/orders', [...$data, 'expected_items_subtotal' => '199.00'])->assertUnprocessable();
    $this->postJson('/api/v1/orders', [...$data, 'address_id' => $shop['seller']->addresses()->first()->id])->assertUnprocessable()->assertJsonValidationErrors('address_id');
    $this->assertDatabaseCount('orders', 0);
    expect($shop['product']->fresh()->stock)->toBe(10);
    $created = $this->postJson('/api/v1/orders', $data)->assertCreated()->assertJsonPath('data.total', '250.50')
        ->assertJsonPath('data.parcels.0.cod_total', '250.50')->assertJsonMissingPath('data.parcels.0.commission_amount');
    $orderId = $created->json('data.id');
    $this->postJson('/api/v1/orders', $data)->assertCreated()->assertJsonPath('data.id', $orderId);
    $this->assertDatabaseCount('orders', 1);
    expect($shop['product']->fresh()->stock)->toBe(8);
    mobileClient(User::factory()->create())->getJson('/api/v1/orders/'.$orderId)->assertNotFound();
    $this->postJson('/api/v1/orders/'.$orderId.'/cancel')->assertForbidden();
    mobileClient($shop['buyer'])->getJson('/api/v1/orders/'.$orderId)->assertOk();
    $this->postJson('/api/v1/orders/'.$orderId.'/cancel')->assertOk()->assertJsonPath('data.status', 'cancelled');
    $this->postJson('/api/v1/orders/'.$orderId.'/cancel')->assertConflict();
    expect($shop['product']->fresh()->stock)->toBe(10);
});

test('seller API scopes split purchases and prevents skipped or foreign preparation', function () {
    $shop = mobileShop();
    $order = mobilePurchase($shop);
    $parcel = $order->sellerOrders()->sole();

    mobileClient(User::factory()->create(['role' => 'seller']))->getJson('/api/v1/seller/orders')->assertJsonCount(0, 'data');
    $this->patchJson('/api/v1/seller/orders/'.$parcel->id, ['status' => 'processing'])->assertForbidden();
    mobileClient($shop['seller'])->getJson('/api/v1/seller/orders')->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.order');
    $this->patchJson('/api/v1/seller/orders/'.$parcel->id, ['status' => 'shipped'])->assertConflict();
    $this->patchJson('/api/v1/seller/orders/'.$parcel->id, ['status' => 'processing'])->assertOk()->assertJsonPath('data.status', 'processing');
    $this->patchJson('/api/v1/seller/orders/'.$parcel->id, ['status' => 'shipped'])->assertOk()->assertJsonPath('data.status', 'shipped');
    mobileClient($shop['buyer'])->postJson('/api/v1/orders/'.$order->id.'/cancel')->assertConflict();
    expect($shop['product']->fresh()->stock)->toBe(8);
});

test('parcel events share web custody cash proof and replay protections across roles', function () {
    Notification::fake();
    $shop = mobileShop();
    $order = mobilePurchase($shop);
    $parcel = $order->sellerOrders()->sole();
    $parcel->update(['status' => 'shipped']);
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    $area = DB::table('service_areas')->insertGetId(['logistics_center_id' => $center->id, 'code' => 'MOBILE', 'name' => 'Test', 'province_code' => '130000000', 'city_code' => '133900000', 'barangay_code' => '133900001', 'province_name' => 'Metro Manila', 'city_name' => 'Manila', 'barangay_name' => 'Test', 'is_active' => true]);
    DB::table('rider_service_area')->insert(['rider_id' => $rider->id, 'service_area_id' => $area]);
    $delivery = $parcel->delivery;
    $endpoint = '/api/v1/deliveries/'.$delivery->id.'/events';
    $event = fn (string $action, array $data = []) => ['action' => $action, 'request_key' => (string) Str::uuid(), ...$data];
    $scan = ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'manual', 'reason' => 'Synthetic test handover'];

    mobileClient($operator)->postJson($endpoint, $event('claim', ['logistics_center_id' => $center->id]))->assertOk();
    $this->postJson($endpoint, $event('assign', ['service_area_id' => $area, 'rider_id' => $rider->id]))->assertOk();
    mobileClient($rider)->getJson('/api/v1/deliveries')->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.parcel.order');
    $this->postJson($endpoint, ['action' => 'picked_up', ...$scan])->assertUnprocessable()->assertJsonValidationErrors('request_key');
    $this->postJson($endpoint, $event('picked_up', [...$scan, 'tracking_reference' => 'WRONG']))->assertUnprocessable();
    $pickedUp = $event('picked_up', $scan);
    $this->postJson($endpoint, $pickedUp)->assertOk();
    $this->postJson($endpoint, $pickedUp)->assertOk();
    expect(DB::table('parcel_events')->where('reference', $pickedUp['request_key'])->count())->toBe(1);
    $this->postJson($endpoint, $event('out_for_delivery'))->assertConflict();
    mobileClient($operator)->postJson($endpoint, $event('receive', [...$scan, 'receipt_condition' => 'intact']))->assertOk();
    $this->postJson($endpoint, $event('sort', [...$scan, 'service_area_id' => $area, 'sorting_bin' => 'M1']))->assertOk();
    $this->postJson($endpoint, $event('assign', [...$scan, 'service_area_id' => $area, 'rider_id' => $rider->id]))->assertOk();
    mobileClient($rider)->postJson($endpoint, $event('accept_dispatch', $scan))->assertOk();
    $this->postJson($endpoint, $event('out_for_delivery'))->assertOk();
    $this->postJson($endpoint, $event('delivered', [...$scan, 'amount' => '250.50', 'recipient_name' => 'Synthetic Buyer']))->assertUnprocessable()->assertJsonValidationErrors('proof');
    $delivered = $event('delivered', [...$scan, 'amount' => '250.50', 'recipient_name' => 'Synthetic Buyer']);
    $proof = UploadedFile::fake()->createWithContent('proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1sAAAAASUVORK5CYII='));
    $this->post($endpoint, [...$delivered, 'proof' => $proof], ['Accept' => 'application/json'])->assertOk();
    $this->assertDatabaseCount('cod_collections', 1);
    $this->postJson($endpoint, $delivered)->assertOk();
    $proofPath = $delivery->fresh()->proof_photo_path;
    Storage::disk('local')->assertExists($proofPath);
    mobileClient($shop['buyer'])->get('/api/v1/deliveries/'.$delivery->id.'/proof')->assertOk();
    mobileClient(User::factory()->create())->get('/api/v1/deliveries/'.$delivery->id.'/proof')->assertForbidden();
    mobileClient($operator)->postJson($endpoint, $event('receive_cod', ['amount' => '250.50', 'handover_reference' => 'SYNTHETIC-CASH']))->assertOk();
    $this->postJson($endpoint, $event('reconcile_cod'))->assertForbidden();
    mobileClient(User::factory()->create(['role' => 'admin']))->postJson($endpoint, $event('reconcile_cod'))->assertOk();
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $delivery->id, 'status' => 'reconciled', 'amount' => '250.50']);
    expect($order->fresh()->status)->toBe('completed');
});

test('delivery lists and events deny unrelated companies and riders', function () {
    $shop = mobileShop();
    $order = mobilePurchase($shop);
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $delivery = $order->sellerOrders()->sole()->delivery;
    $delivery->update(['rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'status' => 'assigned']);
    $other = User::factory()->create(['role' => 'rider']);
    $otherCenter = linkRiderToApprovedCenter($other);

    foreach ([$other, $otherCenter->users()->where('role', 'logistics')->firstOrFail()] as $actor) {
        mobileClient($actor)->getJson('/api/v1/deliveries')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/deliveries/'.$delivery->id)->assertNotFound();
        $this->postJson('/api/v1/deliveries/'.$delivery->id.'/events', ['action' => 'picked_up', 'request_key' => (string) Str::uuid()])->assertForbidden();
    }
    expect($delivery->fresh()->status)->toBe('assigned');
    $this->assertDatabaseCount('parcel_events', 0);
});

test('API errors remain JSON and hide internal exception data even in debug mode', function () {
    config(['app.debug' => true]);
    Route::middleware('api')->get('/api/v1/synthetic-error', fn () => throw new RuntimeException('synthetic-secret-internal'));

    $this->get('/api/v1/synthetic-error')->assertInternalServerError()->assertExactJson(['message' => 'Unable to complete the request.', 'code' => 'server_error']);
    $this->get('/api/v1/does-not-exist')->assertNotFound()->assertJsonPath('code', 'not_found');
    $this->post('/api/v1/auth/tokens')->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'device_name']);
});

test('catalog hides moderated products and restricted stores from direct API access', function (string $change) {
    $shop = mobileShop();
    match ($change) {
        'hidden' => $shop['product']->update(['status' => 'hidden']),
        'moderated' => $shop['product']->forceFill(['blocked_at' => now()])->save(),
        'seller' => $shop['seller']->forceFill(['status' => 'suspended'])->save(),
        'store' => $shop['store']->update(['status' => 'pending']),
    };

    $this->getJson('/api/v1/products')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/products/'.$shop['product']->id)->assertNotFound();
    mobileClient($shop['buyer'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 1])->assertUnprocessable();
    $this->assertDatabaseCount('cart_items', 0);
})->with(['hidden', 'moderated', 'seller', 'store']);

test('API checkout requires reviewed totals and rejects stale shipping without consuming stock', function () {
    $shop = mobileShop();
    mobileClient($shop['buyer'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 2])->assertOk();
    $data = ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid()];

    $this->postJson('/api/v1/orders', $data)->assertUnprocessable()->assertJsonValidationErrors(['expected_items_subtotal', 'expected_shipping_total']);
    $this->postJson('/api/v1/orders', [...$data, 'expected_items_subtotal' => '200.50', 'expected_shipping_total' => '40.00'])->assertUnprocessable();

    $this->assertDatabaseCount('orders', 0);
    expect($shop['product']->fresh()->stock)->toBe(10);
    $this->getJson('/api/v1/cart')->assertJsonPath('data.items.0.quantity', 2);
});

test('API option lines preserve independent stock and unavailable lines can be removed', function () {
    $shop = mobileShop();
    $blue = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Blue', 'stock' => 2, 'is_active' => true]);
    $red = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Red', 'stock' => 8, 'is_active' => true]);
    $endpoint = '/api/v1/cart/items/'.$shop['product']->id;

    mobileClient($shop['buyer'])->putJson($endpoint, ['quantity' => 1])->assertUnprocessable();
    $this->putJson($endpoint, ['quantity' => 2, 'product_variant_id' => $blue->id])->assertOk();
    $this->putJson($endpoint, ['quantity' => 1, 'product_variant_id' => $red->id])->assertOk();
    $this->getJson('/api/v1/cart')->assertJsonCount(2, 'data.items');
    expect($blue->fresh()->stock)->toBe(2);
    $blue->update(['is_active' => false]);
    $this->getJson('/api/v1/cart')->assertJsonPath('data.items.0.is_available', false);
    $this->putJson($endpoint, ['quantity' => 0, 'product_variant_id' => $blue->id])->assertOk();
    $this->assertDatabaseCount('cart_items', 1);
});

test('split API purchases expose only each sellers parcel and its own COD amount', function () {
    $shop = mobileShop();
    $other = mobileShop();
    mobileClient($shop['buyer'])->putJson('/api/v1/cart/items/'.$shop['product']->id, ['quantity' => 1])->assertOk();
    $this->putJson('/api/v1/cart/items/'.$other['product']->id, ['quantity' => 1])->assertOk();

    $this->postJson('/api/v1/orders', ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(), 'expected_items_subtotal' => '200.50', 'expected_shipping_total' => '100.00'])
        ->assertCreated()->assertJsonCount(2, 'data.parcels')->assertJsonPath('data.total', '300.50')->assertJsonPath('data.parcels.0.cod_total', '150.25');
    mobileClient($shop['seller'])->getJson('/api/v1/seller/orders')->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.store.id', $shop['store']->id)->assertJsonPath('data.0.cod_total', '150.25')
        ->assertJsonMissingPath('data.0.order')->assertJsonMissingPath('data.0.total');
    mobileClient($other['seller'])->getJson('/api/v1/seller/orders')->assertJsonCount(1, 'data')->assertJsonPath('data.0.store.id', $other['store']->id);
});

test('mobile roles cannot call another roles operational endpoints', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'rider') {
        linkRiderToApprovedCenter($user);
    }

    mobileClient($user)->getJson($role === 'buyer' ? '/api/v1/deliveries' : '/api/v1/cart')->assertForbidden();
})->with(['buyer', 'seller', 'rider', 'logistics', 'admin']);

test('logistics discovery is scoped and distinguishes ready unallocated pickups', function () {
    $shop = mobileShop();
    $order = mobilePurchase($shop);
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    $otherRider = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($otherRider);

    mobileClient($operator)->getJson('/api/v1/logistics/configuration')->assertJsonCount(1, 'data.centers')
        ->assertJsonCount(1, 'data.riders')->assertJsonPath('data.riders.0.id', $rider->id)->assertJsonMissingPath('data.riders.0.email');
    $this->getJson('/api/v1/logistics/available-pickups')->assertJsonCount(0, 'data');
    $order->sellerOrders()->sole()->update(['status' => 'shipped']);
    $this->getJson('/api/v1/logistics/available-pickups')->assertJsonCount(1, 'data')->assertJsonPath('data.0.pickup_address.line1', '5 Synthetic Street');
    $this->getJson('/api/v1/deliveries')->assertJsonCount(0, 'data');
    mobileClient($shop['buyer'])->getJson('/api/v1/logistics/configuration')->assertForbidden();
});
