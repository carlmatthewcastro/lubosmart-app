<?php

use App\Models\Order;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\Notification;
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
    expect($user->status)->toBe('approved');
});

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    Notification::fake();
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'current_password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('verification.notice'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
    Notification::assertSentTo($user, VerifyAccountEmail::class);
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
    $this->actingAs($user)->patch('/settings/profile', ['name' => 'Buyer', 'email' => $user->email, 'phone' => '09123456789', 'current_password' => 'password', 'role' => 'admin', 'status' => 'approved'])->assertSessionHasNoErrors();
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

test('admins can update only their display name without changing their sign-in identity', function () {
    Notification::fake();
    $admin = User::factory()->create(['role' => 'admin', 'google_id' => null, 'phone' => '09171234567']);
    $password = $admin->password;
    $verifiedAt = $admin->email_verified_at;

    $this->actingAs($admin)->patch('/settings/profile', [
        'name' => 'Owner Admin', 'role' => 'buyer', 'status' => 'incomplete', 'password' => 'injected-password',
    ])->assertSessionHasNoErrors()->assertRedirect('/settings/profile')->assertSessionHas('status', 'Admin name saved.');

    $this->assertDatabaseHas('users', [
        'id' => $admin->id, 'name' => 'Owner Admin', 'email' => $admin->email,
        'role' => 'admin', 'status' => 'approved', 'phone' => '09171234567', 'google_id' => null,
    ]);
    expect($admin->fresh()->password)->toBe($password);
    expect($admin->fresh()->email_verified_at->equalTo($verifiedAt))->toBeTrue();
    $this->assertDatabaseHas('audit_events', ['actor_id' => $admin->id, 'subject_id' => $admin->id, 'action' => 'profile_updated']);
    Notification::assertNothingSent();
});

test('admins cannot replace their sign-in email through profile settings', function () {
    Notification::fake();
    $admin = User::factory()->create(['role' => 'admin']);
    $verifiedAt = $admin->email_verified_at;

    $this->actingAs($admin)->patch('/settings/profile', [
        'name' => 'Changed Admin', 'email' => 'replacement@example.com', 'current_password' => 'password',
    ])->assertSessionHasErrors(['email' => 'The admin sign-in email cannot be changed in settings.']);

    $this->assertDatabaseHas('users', ['id' => $admin->id, 'name' => $admin->name, 'email' => $admin->email]);
    expect($admin->fresh()->email_verified_at->equalTo($verifiedAt))->toBeTrue();
    $this->assertDatabaseCount('audit_events', 0);
    Notification::assertNothingSent();
});

test('admins cannot change a contact number through profile settings', function () {
    $admin = User::factory()->create(['role' => 'admin', 'phone' => '09171234567']);

    $this->actingAs($admin)->patch('/settings/profile', [
        'name' => 'Changed Admin', 'phone' => '09171234568', 'current_password' => 'password',
    ])->assertSessionHasErrors(['phone' => 'Contact numbers are not part of admin settings.']);

    $this->assertDatabaseHas('users', ['id' => $admin->id, 'name' => $admin->name, 'phone' => '09171234567']);
    $this->assertDatabaseCount('audit_events', 0);
});

test('empty contact fields do not erase an existing admin contact when saving a name', function () {
    $admin = User::factory()->create(['role' => 'admin', 'phone' => '09171234567']);

    $this->actingAs($admin)->patch('/settings/profile', [
        'name' => 'Owner Admin', 'phone' => null, 'email' => $admin->email,
    ])->assertSessionHasNoErrors()->assertRedirect('/settings/profile');

    $this->assertDatabaseHas('users', ['id' => $admin->id, 'name' => 'Owner Admin', 'phone' => '09171234567']);
});
