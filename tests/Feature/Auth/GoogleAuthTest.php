<?php

use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

test('verified Google users register with their selected role and pending seller store', function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
    ]);
    Socialite::fake('google', GoogleUser::fake([
        'id' => 'google-seller-123',
        'name' => 'Google Seller',
        'email' => 'google-seller@example.com',
        'verified_email' => true,
    ]));

    $this->post(route('auth.google.redirect'), [
        'role' => 'seller',
        'store_name' => 'Google Store',
        'store_description' => 'A store from Google registration.',
    ])->assertRedirect('https://socialite.fake/google/authorize');

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('dashboard', absolute: false));

    $user = User::query()->where('email', 'google-seller@example.com')->firstOrFail();
    $this->assertAuthenticatedAs($user);
    expect($user->role)->toBe('seller');
    expect($user->email_verified_at)->not->toBeNull();
    $this->assertDatabaseHas('stores', [
        'user_id' => $user->id,
        'name' => 'Google Store',
        'description' => 'A store from Google registration.',
        'status' => 'pending',
    ]);
});

test('verified Google users link to an existing account with the same email', function () {
    $user = User::factory()->create([
        'email' => 'existing@example.com',
        'google_id' => null,
        'role' => 'rider',
    ]);
    Socialite::fake('google', GoogleUser::fake([
        'id' => 'google-existing-456',
        'email' => 'existing@example.com',
        'verified_email' => true,
    ]));
    session(['google_registration' => [
        'role' => 'buyer',
        'store_name' => null,
        'store_description' => null,
    ]]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'google_id' => 'google-existing-456',
        'role' => 'rider',
    ]);
    $this->assertDatabaseCount('users', 1);
});

test('Google users can sign in to an account already linked to Google', function () {
    $user = User::factory()->create([
        'email' => 'linked@example.com',
        'google_id' => 'google-linked-789',
        'role' => 'buyer',
    ]);
    Socialite::fake('google', GoogleUser::fake([
        'id' => 'google-linked-789',
        'email' => 'linked@example.com',
        'verified_email' => true,
    ]));
    session(['google_registration' => [
        'role' => 'rider',
        'store_name' => null,
        'store_description' => null,
    ]]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'google_id' => 'google-linked-789',
        'role' => 'buyer',
    ]);
    $this->assertDatabaseCount('users', 1);
});

test('Google registration rejects unverified email addresses', function () {
    Socialite::fake('google', GoogleUser::fake([
        'id' => 'google-unverified-789',
        'email' => 'unverified@example.com',
        'verified_email' => false,
    ]));
    session(['google_registration' => [
        'role' => 'buyer',
        'store_name' => null,
        'store_description' => null,
    ]]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('home'))
        ->assertSessionHasErrors('google');

    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'unverified@example.com']);
    $this->assertDatabaseCount('stores', 0);
});

test('Google registration requires a role and seller store details before redirecting', function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
    ]);
    Socialite::fake('google');

    $this->from('/')
        ->post(route('auth.google.redirect'), [
            'role' => 'seller',
            'store_name' => '',
            'store_description' => '',
        ])
        ->assertRedirect('/')
        ->assertSessionHasErrors(['store_name', 'store_description']);

    $this->from('/')
        ->post(route('auth.google.redirect'), [])
        ->assertRedirect('/')
        ->assertSessionHasErrors('role');
});

test('Google sign-in reports missing OAuth credentials', function () {
    config([
        'services.google.client_id' => null,
        'services.google.client_secret' => null,
    ]);

    $this->from('/')
        ->post(route('auth.google.redirect'), ['role' => 'buyer'])
        ->assertRedirect('/')
        ->assertSessionHasErrors('google');
});

test('Google registration rejects cancelled consent', function () {
    session(['google_registration' => [
        'role' => 'buyer',
        'store_name' => null,
        'store_description' => null,
    ]]);

    $this->get(route('auth.google.callback', ['error' => 'access_denied']))
        ->assertRedirect(route('home'))
        ->assertSessionHasErrors('google');

    $this->assertGuest();
});
