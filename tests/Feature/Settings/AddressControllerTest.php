<?php

use App\Models\Address;
use App\Models\Order;
use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '130000000', 'name' => 'NCR']]),
        'https://psgc.gitlab.io/api/provinces/' => Http::response([]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '137404000', 'name' => 'Manila', 'regionCode' => '130000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/137404000/barangays/' => Http::response([['code' => '137404001', 'name' => 'Test Barangay']]),
    ]);
});

function addressSubmission(array $overrides = []): array
{
    return [...savedAddressData(), 'region_code' => '130000000', 'province_code' => '130000000', 'city_code' => '137404000', 'barangay_code' => '137404001', ...$overrides];
}

function savedAddressData(array $overrides = []): array
{
    return [...[
        'label' => 'Home', 'recipient_name' => 'Buyer', 'phone' => '09123456789',
        'line1' => '10 Test Street', 'line2' => null, 'barangay' => 'Test Barangay',
        'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000',
    ], ...$overrides];
}

test('guests cannot manage addresses', function () {
    $this->get('/settings/addresses')->assertRedirect('/login');
    $this->post('/settings/addresses', savedAddressData())->assertRedirect('/login');
    $this->assertDatabaseCount('addresses', 0);
});

test('address settings only shows addresses belonging to the signed in user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Address::query()->create(savedAddressData(['user_id' => $user->id]));
    Address::query()->create(savedAddressData(['user_id' => $other->id, 'label' => 'Private']));
    $this->actingAs($user)->get('/settings/addresses')->assertInertia(fn (Assert $page) => $page->component('settings/addresses')->has('addresses', 1)->where('addresses.0.label', 'Home'));
});

test('approved accounts can save an address and switch the default without duplicate defaults', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/settings/addresses', addressSubmission(['user_id' => 999]))->assertSessionHasNoErrors()->assertRedirect('/settings/addresses');
    $first = Address::query()->firstOrFail();
    expect($first->user_id)->toBe($user->id);
    expect($first->is_default)->toBeTrue();
    $this->post('/settings/addresses', addressSubmission(['label' => 'Work', 'is_default' => true]))->assertSessionHasNoErrors();
    $second = Address::query()->where('label', 'Work')->firstOrFail();
    expect($first->fresh()->is_default)->toBeFalse();
    expect($second->is_default)->toBeTrue();
    $this->patch("/settings/addresses/{$first->id}/default")->assertRedirect('/settings/addresses');
    expect($first->fresh()->is_default)->toBeTrue();
    expect($second->fresh()->is_default)->toBeFalse();
    $this->delete("/settings/addresses/{$first->id}")->assertRedirect('/settings/addresses');
    expect($first->fresh())->toBeNull();
    expect($second->fresh()->is_default)->toBeTrue();
});

test('another user cannot edit delete or select a private address', function () {
    $user = User::factory()->create();
    $owner = User::factory()->create();
    $address = Address::query()->create(savedAddressData(['user_id' => $owner->id]));
    $this->actingAs($user)->put("/settings/addresses/{$address->id}", savedAddressData(['line1' => 'Changed']))->assertForbidden();
    $this->delete("/settings/addresses/{$address->id}")->assertForbidden();
    $this->patch("/settings/addresses/{$address->id}/default")->assertForbidden();
    expect($address->fresh()->line1)->toBe('10 Test Street');
    expect($address->fresh()->is_default)->toBeFalse();
});

test('invalid addresses cannot be saved', function () {
    $this->actingAs(User::factory()->create())->post('/settings/addresses', savedAddressData(['recipient_name' => '', 'line1' => str_repeat('a', 201)]))->assertSessionHasErrors(['recipient_name', 'line1']);
    $this->assertDatabaseCount('addresses', 0);
});

test('registration addresses can be edited but cannot be removed through delivery settings', function () {
    $user = User::factory()->create();
    $address = Address::query()->create(savedAddressData(['user_id' => $user->id]));
    RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => 'buyer'])->forceFill(['address_id' => $address->id])->save();
    $this->actingAs($user)->put("/settings/addresses/{$address->id}", addressSubmission(['line1' => 'Changed']))->assertSessionHasNoErrors();
    expect($user->application->address_id)->toBe($address->id);
    $this->assertDatabaseHas('addresses', ['id' => $user->application->address_id, 'line1' => 'Changed']);
    $this->delete("/settings/addresses/{$address->id}")->assertSessionHasErrors('address');
    expect($address->fresh()->line1)->toBe('Changed');
});

test('editing and deleting delivery addresses preserves existing order shipping details', function () {
    $user = User::factory()->create();
    $address = Address::query()->create(savedAddressData(['user_id' => $user->id, 'is_default' => true]));
    $order = Order::query()->create(['buyer_id' => $user->id, 'address_id' => $address->id, 'shipping_recipient_name' => 'Buyer', 'shipping_phone' => '09123456789', 'shipping_line1' => '10 Test Street', 'shipping_barangay' => 'Test Barangay', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150]);
    $this->actingAs($user)->put("/settings/addresses/{$address->id}", addressSubmission(['line1' => '20 New Street']))->assertSessionHasNoErrors();
    expect($address->fresh()->line1)->toBe('20 New Street');
    expect($address->fresh()->is_default)->toBeTrue();
    expect($order->fresh()->shipping_line1)->toBe('10 Test Street');
    $this->delete("/settings/addresses/{$address->id}")->assertSessionHasNoErrors();
    expect($order->fresh()->shipping_line1)->toBe('10 Test Street');
    expect($order->fresh()->address_id)->toBeNull();
});

test('saved locations come from the registration API and phone numbers are normalized', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/settings/addresses', addressSubmission([
        'phone' => '+639123456789', 'province' => 'Injected province', 'city' => 'Injected city',
    ]))->assertSessionHasNoErrors();
    $this->assertDatabaseHas('addresses', [
        'user_id' => $user->id, 'phone' => '09123456789', 'province' => 'Metro Manila (NCR)',
        'city' => 'Manila', 'barangay' => 'Test Barangay', 'region' => '130000000',
    ]);
});

test('delivery addresses follow registration validation rules', function (array $changes, string $field) {
    $this->actingAs(User::factory()->create())->post('/settings/addresses', addressSubmission($changes))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('addresses', 0);
})->with([
    'missing region' => [['region_code' => ''], 'region_code'],
    'invalid hierarchy' => [['region_code' => '040000000'], 'barangay_code'],
    'wrong city' => [['city_code' => '043404000'], 'barangay_code'],
    'wrong barangay' => [['barangay_code' => '137404002'], 'barangay_code'],
    'invalid phone' => [['phone' => '12345'], 'phone'],
    'invalid postal code' => [['zip' => '10000'], 'zip'],
    'invalid recipient' => [['recipient_name' => '1234'], 'recipient_name'],
]);

test('address service failure does not save unverified delivery details', function () {
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake(['https://psgc.gitlab.io/api/provinces/' => Http::response([], 503)]);
    $this->actingAs(User::factory()->create())->post('/settings/addresses', addressSubmission())->assertSessionHasErrors('province_code');
    $this->assertDatabaseCount('addresses', 0);
});

test('delivery address stores the same separate house and street fields as registration', function () {
    $this->actingAs(User::factory()->create())->post('/settings/addresses', addressSubmission([
        'house_number' => '12B', 'street' => 'Sample Subdivision', 'line1' => 'Ignored text',
    ]))->assertSessionHasNoErrors();
    $this->assertDatabaseHas('addresses', ['house_number' => '12B', 'street' => 'Sample Subdivision', 'line1' => '12B Sample Subdivision']);
});

test('delivery street requires its house number', function () {
    $this->actingAs(User::factory()->create())->post('/settings/addresses', addressSubmission([
        'street' => 'Sample Subdivision', 'house_number' => '',
    ]))->assertSessionHasErrors('house_number');
    $this->assertDatabaseCount('addresses', 0);
});
