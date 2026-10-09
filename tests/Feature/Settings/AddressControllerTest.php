<?php

use App\Models\Address;
use App\Models\Order;
use App\Models\RegistrationApplication;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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
    $this->actingAs($user)->post('/settings/addresses', savedAddressData(['user_id' => 999]))->assertSessionHasNoErrors()->assertRedirect('/settings/addresses');
    $first = Address::query()->firstOrFail();
    expect($first->user_id)->toBe($user->id);
    expect($first->is_default)->toBeTrue();
    $this->post('/settings/addresses', savedAddressData(['label' => 'Work', 'is_default' => true]))->assertSessionHasNoErrors();
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

test('registration addresses cannot be edited or removed through delivery settings', function () {
    $user = User::factory()->create();
    $address = Address::query()->create(savedAddressData(['user_id' => $user->id]));
    RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => 'buyer'])->forceFill(['address_id' => $address->id])->save();
    $this->actingAs($user)->put("/settings/addresses/{$address->id}", savedAddressData(['line1' => 'Changed']))->assertSessionHasErrors('address');
    $this->delete("/settings/addresses/{$address->id}")->assertSessionHasErrors('address');
    expect($address->fresh()->line1)->toBe('10 Test Street');
});

test('editing and deleting delivery addresses preserves existing order shipping details', function () {
    $user = User::factory()->create();
    $address = Address::query()->create(savedAddressData(['user_id' => $user->id, 'is_default' => true]));
    $order = Order::query()->create(['buyer_id' => $user->id, 'address_id' => $address->id, 'shipping_recipient_name' => 'Buyer', 'shipping_phone' => '09123456789', 'shipping_line1' => '10 Test Street', 'shipping_barangay' => 'Test Barangay', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150]);
    $this->actingAs($user)->put("/settings/addresses/{$address->id}", savedAddressData(['line1' => '20 New Street']))->assertSessionHasNoErrors();
    expect($address->fresh()->line1)->toBe('20 New Street');
    expect($address->fresh()->is_default)->toBeTrue();
    expect($order->fresh()->shipping_line1)->toBe('10 Test Street');
    $this->delete("/settings/addresses/{$address->id}")->assertSessionHasNoErrors();
    expect($order->fresh()->shipping_line1)->toBe('10 Test Street');
    expect($order->fresh()->address_id)->toBeNull();
});
