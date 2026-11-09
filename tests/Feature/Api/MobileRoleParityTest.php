<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\StoreVoucher;
use App\Models\SupportCase;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

function roleClient(User $user)
{
    app('auth')->forgetGuards();

    return test()->withToken($user->createToken('Parity test', ['api:v1', 'role:'.$user->role], now()->addDay())->plainTextToken);
}

function roleInventory(): array
{
    $seller = User::factory()->create(['role' => 'seller']);
    $category = Category::create(['name' => 'Mobile department', 'is_active' => true]);
    $store = Store::create(['user_id' => $seller->id, 'name' => 'Parity store '.$seller->id, 'status' => 'approved', 'business_category_id' => $category->id]);

    return compact('seller', 'category', 'store');
}

test('mobile session isolates onboarding tokens from operational APIs and promotes approved accounts', function () {
    $user = User::factory()->create(['status' => 'pending']);
    $response = $this->postJson('/api/v1/auth/session', ['email' => $user->email, 'password' => 'password', 'device_name' => 'Phone'])->assertCreated()->assertJsonPath('data.kind', 'onboarding');
    $token = $response->json('data.access_token');
    app('auth')->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/onboarding/status')->assertOk()->assertJsonPath('data.user.status', 'pending');
    $this->getJson('/api/v1/cart')->assertForbidden();
    $this->postJson('/api/v1/onboarding/promote')->assertForbidden();
    $user->forceFill(['status' => 'approved'])->save();
    app('auth')->forgetGuards();
    $promoted = $this->postJson('/api/v1/onboarding/promote')->assertCreated()->assertJsonPath('data.kind', 'operational');
    expect(PersonalAccessToken::findToken($token))->toBeNull();
    app('auth')->forgetGuards();
    $this->withToken($promoted->json('data.access_token'))->getJson('/api/v1/cart')->assertOk();
});

test('mobile registration reuses required identity fields without a browser session', function () {
    Notification::fake();
    $data = sharedRegistrationData(['email' => 'phone-registration@example.test']);

    $response = $this->postJson('/api/v1/auth/register', $data)->assertCreated()->assertJsonPath('data.kind', 'onboarding')->assertJsonPath('data.user.status', 'unverified');
    $this->assertDatabaseHas('registration_applications', ['requested_role' => 'buyer', 'status' => 'submitted']);
    $this->assertDatabaseCount('registration_documents', 1);
    app('auth')->forgetGuards();
    $this->withToken($response->json('data.access_token'))->getJson('/api/v1/onboarding/status')->assertOk();
    $this->getJson('/api/v1/orders')->assertForbidden();
});

test('mobile google validates provider identity and never links an arbitrary email', function () {
    $user = User::factory()->create(['google_id' => 'verified-mobile-google']);
    Socialite::shouldReceive('driver->userFromToken')->andReturn((new GoogleUser)->map(['id' => 'verified-mobile-google', 'email' => $user->email])->setRaw(['email_verified' => true]));
    $this->postJson('/api/v1/auth/google', ['access_token' => 'synthetic-provider-token', 'device_name' => 'Test'])->assertCreated()->assertJsonPath('data.user.id', $user->id);
});

test('mobile password recovery consumes the code token and revokes device sessions', function () {
    Notification::fake();
    $user = User::factory()->create();
    $old = $user->createToken('Old', ['api:v1', 'role:buyer'])->plainTextToken;
    DB::table('email_security_codes')->insert(['user_id' => $user->id, 'purpose' => 'password', 'email' => $user->email, 'code_hash' => Hash::make('123456'), 'expires_at' => now()->addMinutes(10), 'attempts' => 0]);
    $confirmation = $this->postJson('/api/v1/auth/password/verify', ['email' => $user->email, 'purpose' => 'password', 'code' => '123456'])->assertOk()->json('data.confirmation_token');
    $payload = ['email' => $user->email, 'confirmation_token' => $confirmation, 'password' => 'Changed@2026', 'password_confirmation' => 'Changed@2026'];
    $this->postJson('/api/v1/auth/password/reset', $payload)->assertOk();
    expect(Hash::check('Changed@2026', $user->fresh()->password))->toBeTrue();
    expect(PersonalAccessToken::findToken($old))->toBeNull();
    $this->postJson('/api/v1/auth/password/reset', $payload)->assertUnprocessable();
    $this->postJson('/api/v1/auth/password/code', ['email' => 'someone@example.test', 'purpose' => 'profile'])->assertForbidden();
});

test('seller inventory API preserves ownership and stale stock checks', function () {
    $shop = roleInventory();
    $payload = ['name' => 'Native bag', 'category_id' => $shop['category']->id, 'price' => '100.00', 'stock' => 10, 'weight_grams' => 250, 'status' => 'active'];
    $response = roleClient($shop['seller'])->postJson('/api/v1/seller/products', $payload)->assertCreated();
    $id = $response->json('data.id');
    $this->getJson('/api/v1/seller/products/'.$id)->assertOk()->assertJsonPath('data.stock', 10)->assertJsonMissingPath('data.image_path');
    $this->putJson('/api/v1/seller/products/'.$id, [...$payload, 'stock' => 15])->assertUnprocessable()->assertJsonValidationErrors('expected_stock');
    $this->putJson('/api/v1/seller/products/'.$id, [...$payload, 'stock' => 15, 'expected_stock' => 9])->assertUnprocessable();
    $this->putJson('/api/v1/seller/products/'.$id, [...$payload, 'stock' => 15, 'expected_stock' => 10])->assertOk();
    roleClient(User::factory()->create(['role' => 'seller']))->getJson('/api/v1/seller/products/'.$id)->assertNotFound();
    $this->putJson('/api/v1/seller/products/'.$id, [...$payload, 'expected_stock' => 15])->assertForbidden();
    expect(Product::findOrFail($id)->stock)->toBe(15);
});

test('seller variants vouchers costs and finance reads use existing rules', function () {
    $shop = roleInventory();
    $product = Product::create(['store_id' => $shop['store']->id, 'category_id' => $shop['category']->id, 'name' => 'Variants', 'price' => 100, 'stock' => 10, 'status' => 'active']);
    roleClient($shop['seller'])->putJson('/api/v1/seller/products/'.$product->id.'/variants', ['expected_stock' => 10, 'variants' => [['name' => 'Blue', 'stock' => 10, 'is_active' => true]]])->assertOk();
    $this->postJson('/api/v1/seller/vouchers', ['code' => 'MOBILE-20', 'amount' => '20.00', 'minimum' => '100.00', 'usage_limit' => 10, 'expires_at' => now()->addDay()->toIso8601String()])->assertOk();
    $this->getJson('/api/v1/seller/vouchers')->assertOk()->assertJsonPath('data.data.0.code', 'MOBILE-20');
    $voucher = StoreVoucher::sole();
    $this->patchJson('/api/v1/seller/vouchers/'.$voucher->id, ['is_active' => false])->assertOk();
    $this->postJson('/api/v1/seller/costs', ['incurred_on' => now('Asia/Manila')->toDateString(), 'category' => 'packaging', 'description' => 'Synthetic packaging', 'amount' => '20.00'])->assertOk();
    $this->getJson('/api/v1/seller/costs')->assertJsonPath('data.totals.costs', 2000)->assertJsonPath('data.totals.profit', -2000);
    $this->getJson('/api/v1/seller/settlements')->assertOk();
    $this->getJson('/api/v1/seller/reports')->assertOk();
});

test('mobile support keeps private attachments and unrelated conversations inaccessible', function () {
    $buyer = User::factory()->create();
    $response = roleClient($buyer)->postJson('/api/v1/support', ['kind' => 'complaint', 'subject' => 'Synthetic concern', 'body' => 'Please review this test concern.'])->assertCreated();
    $id = $response->json('data.id');
    $this->getJson('/api/v1/support/'.$id)->assertOk()->assertJsonPath('data.messages.data.0.body', 'Please review this test concern.')->assertJsonMissingPath('data.messages.data.0.attachment_path');
    $this->postJson('/api/v1/support/'.$id.'/messages', ['body' => 'Follow-up test message'])->assertOk();
    roleClient(User::factory()->create())->getJson('/api/v1/support/'.$id)->assertForbidden();
    $this->postJson('/api/v1/support/'.$id.'/messages', ['body' => 'Foreign message'])->assertForbidden();
    expect(SupportCase::findOrFail($id)->messages()->count())->toBe(2);
});

test('all target roles can read only their permitted shared workspaces', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'rider') {
        linkRiderToApprovedCenter($user);
    }
    roleClient($user)->getJson('/api/v1/settings/profile')->assertOk()->assertJsonPath('data.user.id', $user->id)->assertJsonMissingPath('data.user.bank_account');
    foreach (['/workspace', '/returns', '/support'] as $path) {
        $this->getJson('/api/v1'.$path)->assertOk();
    }
    if ($role === 'rider') {
        $this->getJson('/api/v1/rider/earnings')->assertOk()->assertJsonPath('data.totals.fees', 0);
    }
    if ($role !== 'seller') {
        $this->getJson('/api/v1/seller/costs')->assertForbidden();
    }
})->with(['buyer', 'seller', 'rider']);

test('mobile verification rotates onboarding tokens and retains the approval gate', function () {
    Notification::fake();
    $registered = $this->postJson('/api/v1/auth/register', sharedRegistrationData(['email' => 'otp-native@example.test']))->assertCreated();
    $user = User::where('email', 'otp-native@example.test')->sole();
    $code = Notification::sent($user, VerifyAccountEmail::class)->sole()->code;
    $old = $registered->json('data.access_token');
    app('auth')->forgetGuards();
    $verified = $this->withToken($old)->postJson('/api/v1/onboarding/verify', ['code' => $code])->assertCreated()->assertJsonPath('data.user.status', 'pending');
    expect(PersonalAccessToken::findToken($old))->toBeNull();
    app('auth')->forgetGuards();
    $this->withToken($verified->json('data.access_token'))->getJson('/api/v1/cart')->assertForbidden();
    $this->deleteJson('/api/v1/onboarding/token')->assertNoContent();
    expect(PersonalAccessToken::findToken($verified->json('data.access_token')))->toBeNull();
});

test('company rider invitations cannot bypass activation through mobile onboarding', function () {
    $user = User::factory()->unverified()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($user);
    RegistrationApplication::create(['user_id' => $user->id, 'requested_role' => 'rider', 'status' => 'approved', 'registration_contract' => 'company-rider-2026-10']);
    $this->postJson('/api/v1/auth/session', ['email' => $user->email, 'password' => 'password', 'device_name' => 'Test'])->assertForbidden();
    $this->assertDatabaseCount('personal_access_tokens', 0);
});

test('native google enrollment verifies provider email and keeps documents and approval requirements', function () {
    Notification::fake();
    $google = (new GoogleUser)->map(['id' => 'native-enrollment', 'email' => 'native-google@example.test'])->setRaw(['email_verified' => true]);
    Socialite::shouldReceive('driver->userFromToken')->andReturn($google);
    $data = sharedRegistrationData(['email' => 'native-google@example.test', 'google_access_token' => 'synthetic-provider']);
    unset($data['password'], $data['password_confirmation']);
    $this->postJson('/api/v1/auth/register', [...$data, 'email' => 'foreign@example.test'])->assertUnprocessable()->assertJsonValidationErrors('google');
    $this->postJson('/api/v1/auth/register', $data)->assertCreated()->assertJsonPath('data.user.status', 'unverified')->assertJsonPath('data.kind', 'onboarding');
    $user = User::where('email', 'native-google@example.test')->sole();
    expect($user->google_id)->toBe('native-enrollment');
    expect($user->password)->toBeNull();
    $this->assertDatabaseCount('registration_documents', 1);
});

test('mobile profile contact changes require current credentials or a consumed email confirmation', function () {
    $user = User::factory()->create(['phone' => '09171234567']);
    roleClient($user)->patchJson('/api/v1/settings/profile', ['name' => $user->name, 'email' => $user->email, 'phone' => '09179876543'])->assertUnprocessable();
    expect($user->fresh()->phone)->toBe('09171234567');
    DB::table('email_security_codes')->insert(['user_id' => $user->id, 'purpose' => 'profile', 'email' => $user->email, 'code_hash' => Hash::make('123456'), 'expires_at' => now()->addMinutes(10), 'attempts' => 0]);
    $token = $this->postJson('/api/v1/settings/code/verify', ['email' => $user->email, 'purpose' => 'profile', 'code' => '123456'])->assertOk()->json('data.confirmation_token');
    $this->patchJson('/api/v1/settings/profile', ['name' => $user->name, 'email' => $user->email, 'phone' => '09179876543', 'otp_token' => $token])->assertOk();
    expect($user->fresh()->phone)->toBe('09179876543');
    $this->patchJson('/api/v1/settings/profile', ['name' => $user->name, 'email' => $user->email, 'phone' => '09170000000', 'otp_token' => $token])->assertUnprocessable();
    expect($user->fresh()->phone)->toBe('09179876543');
});

test('buyer wishlist and voucher preview connect to the existing cart contract', function () {
    $shop = roleInventory();
    $product = Product::create(['store_id' => $shop['store']->id, 'category_id' => $shop['category']->id, 'name' => 'Wishlist item', 'price' => 100, 'stock' => 10, 'status' => 'active']);
    StoreVoucher::create(['store_id' => $shop['store']->id, 'code' => 'NATIVE-20', 'amount_cents' => 2000, 'minimum_cents' => 10000, 'usage_limit' => 10, 'expires_at' => now()->addDay(), 'is_active' => true]);
    roleClient(User::factory()->create())->putJson('/api/v1/wishlist/'.$product->id, ['saved' => true])->assertOk();
    $this->getJson('/api/v1/wishlist')->assertJsonPath('data.0.id', $product->id);
    $this->putJson('/api/v1/cart/items/'.$product->id, ['quantity' => 2])->assertOk();
    $this->postJson('/api/v1/vouchers/preview', ['voucher_code' => 'NATIVE-20'])->assertOk()->assertJsonPath('discount_cents', 2000);
    $this->getJson('/api/v1/cart')->assertJsonPath('data.items.0.store_id', $shop['store']->id);
    $this->putJson('/api/v1/wishlist/'.$product->id, ['saved' => false])->assertOk();
    $this->getJson('/api/v1/wishlist')->assertJsonCount(0, 'data');
});

function nativeDeliveredParcel(): array
{
    $shop = roleInventory();
    $buyer = User::factory()->create();
    $order = Order::create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Synthetic Buyer', 'shipping_phone' => '09171234567', 'shipping_line1' => '5 Test Street', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150, 'status' => 'completed']);
    $product = Product::create(['store_id' => $shop['store']->id, 'category_id' => $shop['category']->id, 'name' => 'Delivered item', 'price' => 100, 'stock' => 10, 'status' => 'active']);
    $parcel = SellerOrder::create(['order_id' => $order->id, 'store_id' => $shop['store']->id, 'subtotal' => 100, 'shipping_fee' => 50, 'status' => 'completed']);
    $item = OrderItem::create(['seller_order_id' => $parcel->id, 'product_id' => $product->id, 'product_name' => $product->name, 'quantity' => 1, 'price_each' => 100]);
    $delivery = Delivery::create(['seller_order_id' => $parcel->id, 'status' => 'delivered', 'delivered_at' => now()]);

    return [...$shop, ...compact('buyer', 'parcel', 'product', 'item', 'delivery')];
}

test('native reviews are owned verified purchases and edits retain moderation', function () {
    $shop = nativeDeliveredParcel();
    roleClient($shop['buyer'])->putJson('/api/v1/order-items/'.$shop['item']->id.'/review', ['rating' => 4, 'body' => 'Verified purchase review'])->assertOk();
    ProductReview::sole()->update(['is_visible' => false]);
    $this->putJson('/api/v1/order-items/'.$shop['item']->id.'/review', ['rating' => 5, 'body' => 'Edited purchase review'])->assertOk();
    $this->getJson('/api/v1/products/'.$shop['product']->id.'/reviews')->assertJsonCount(0, 'data.data');
    $this->getJson('/api/v1/reviews')->assertJsonCount(1, 'data.data');
    roleClient(User::factory()->create())->putJson('/api/v1/order-items/'.$shop['item']->id.'/review', ['rating' => 5, 'body' => 'Unowned review'])->assertForbidden();
    expect(ProductReview::count())->toBe(1);
});

test('native returns preserve approval custody and receipt-once without unwanted stock restoration', function () {
    $shop = nativeDeliveredParcel();
    roleClient($shop['buyer'])->postJson('/api/v1/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'Synthetic delivered parcel return'])->assertOk();
    $return = ParcelReturn::sole();
    $this->postJson('/api/v1/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'Synthetic duplicate return request'])->assertConflict();
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $shop['delivery']->update(['logistics_center_id' => $center->id, 'rider_id' => $rider->id]);
    $return->update(['status' => 'assigned', 'rider_id' => $rider->id]);
    roleClient($rider)->getJson('/api/v1/returns')->assertJsonPath('data.data.0.allowed_actions.0', 'collect')->assertJsonPath('data.data.0.refund_reference', null);
    $this->patchJson('/api/v1/returns/'.$return->id, ['action' => 'collect', 'reason' => 'Synthetic handover', 'tracking_reference' => 'WRONG'])->assertUnprocessable();
    $this->patchJson('/api/v1/returns/'.$return->id, ['action' => 'collect', 'reason' => 'Synthetic handover', 'tracking_reference' => $shop['delivery']->tracking_reference])->assertOk();
    roleClient($shop['seller'])->patchJson('/api/v1/returns/'.$return->id, ['action' => 'receive', 'reason' => 'Inspected damaged goods', 'tracking_reference' => $shop['delivery']->tracking_reference, 'condition' => 'damaged', 'restock' => false])->assertOk();
    $this->patchJson('/api/v1/returns/'.$return->id, ['action' => 'receive', 'reason' => 'Duplicate receipt', 'tracking_reference' => $shop['delivery']->tracking_reference, 'condition' => 'intact', 'restock' => true])->assertConflict();
    expect($shop['product']->fresh()->stock)->toBe(10);
    roleClient(User::factory()->create())->getJson('/api/v1/returns')->assertJsonCount(0, 'data.data');
});
