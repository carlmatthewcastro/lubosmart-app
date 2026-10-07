<?php

use App\Models\Order;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('Google users can edit their display name without changing their verified provider identity', function () {
    $user = User::factory()->create(['google_id' => 'trusted-google-id', 'name' => 'Google Nickname']);
    $verifiedAt = $user->email_verified_at;

    $this->actingAs($user)->get('/settings/profile')->assertInertia(fn (Assert $page) => $page
        ->component('settings/profile')->where('googleConnected', true));

    $this->patch('/settings/profile', [
        'name' => 'Carl Matthew De la Cruz', 'email' => $user->email,
        'google_id' => 'injected-provider-id', 'status' => 'suspended', 'role' => 'admin',
    ])->assertSessionHasNoErrors()->assertRedirect('/settings/profile');

    $user->refresh();
    expect($user->name)->toBe('Carl Matthew De la Cruz');
    expect($user->google_id)->toBe('trusted-google-id');
    expect($user->email_verified_at->equalTo($verifiedAt))->toBeTrue();
    expect($user->role)->toBe('buyer');
    expect($user->status)->toBe('active');
});

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete('/settings/profile', [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/');

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/profile')
        ->delete('/settings/profile', [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect('/settings/profile');

    expect($user->fresh())->not->toBeNull();
});

test('profile contact information updates without granting an injected role', function () {
    $user = User::factory()->create(['role' => 'buyer']);
    $this->actingAs($user)->patch('/settings/profile', ['name' => 'Buyer', 'email' => $user->email, 'phone' => '09123456789', 'role' => 'admin', 'status' => 'active'])->assertSessionHasNoErrors();
    expect($user->fresh()->phone)->toBe('09123456789');
    expect($user->fresh()->role)->toBe('buyer');
    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

test('buyers without registration applications cannot delete retained order history', function () {
    $user = User::factory()->create();
    $order = Order::query()->create(['buyer_id' => $user->id, 'shipping_recipient_name' => 'Buyer', 'shipping_phone' => '09123456789', 'shipping_line1' => '10 Test Street', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150]);
    $this->actingAs($user)->delete('/settings/profile', ['password' => 'password'])->assertSessionHasErrors('password');
    $this->assertAuthenticatedAs($user);
    expect($user->fresh())->not->toBeNull();
    expect($order->fresh()->buyer_id)->toBe($user->id);
});
