<?php

use App\Models\Category;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

test('verified Google users register with their selected role and pending seller store', function () {
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
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
        'business_category_id' => $category->id,
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
        'business_category_id' => $category->id,
        'status' => 'pending',
    ]);
});

test('Google does not link existing accounts based only on email equality', function () {
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
        'intent' => 'register',
        'started_at' => now()->timestamp,
        'role' => 'buyer',
        'store_name' => null,
        'business_category_id' => null,
    ]]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('home'))->assertSessionHasErrors('google');

    $this->assertGuest();
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'google_id' => null,
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
        'intent' => 'register',
        'started_at' => now()->timestamp,
        'role' => 'rider',
        'store_name' => null,
        'business_category_id' => null,
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
        'intent' => 'register',
        'started_at' => now()->timestamp,
        'role' => 'buyer',
        'store_name' => null,
        'business_category_id' => null,
    ]]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('home'))
        ->assertSessionHasErrors('google');

    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'unverified@example.com']);
    $this->assertDatabaseCount('stores', 0);
});

test('Google seller signup defers store details but requires a public role', function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
    ]);
    Socialite::fake('google');

    $this->from('/')
        ->post(route('auth.google.redirect'), [
            'role' => 'seller',
            'store_name' => '',
            'business_category_id' => '',
        ])
        ->assertRedirect('https://socialite.fake/google/authorize')
        ->assertSessionHasNoErrors();

    $this->from('/')
        ->post(route('auth.google.redirect'), [])
        ->assertRedirect('/')
        ->assertSessionHasErrors('role');
});

test('verified Google buyers can shop without an approval application', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-buyer', 'name' => 'Google Buyer', 'email' => 'buyer@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'started_at' => now()->timestamp, 'role' => 'buyer']]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard', absolute: false));
    $user = User::query()->where('email', 'buyer@example.com')->firstOrFail();
    expect($user->status)->toBe('active');
    expect($user->email_verified_at)->not->toBeNull();
    $this->assertDatabaseCount('registration_applications', 0);
    $this->get('/dashboard')->assertRedirect('/dashboard/buyer');
});

test('Google sellers begin a draft application without needing a store at signup', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-seller', 'name' => 'Google Seller', 'email' => 'seller@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'started_at' => now()->timestamp, 'role' => 'seller']]);
    $this->get(route('auth.google.callback'))->assertSessionHasNoErrors();
    $user = User::query()->where('email', 'seller@example.com')->firstOrFail();
    expect($user->status)->toBe('pending');
    expect($user->application->status)->toBe('draft');
    expect($user->store)->toBeNull();
    $this->get('/dashboard')->assertRedirect('/application');
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
        'intent' => 'register',
        'started_at' => now()->timestamp,
        'role' => 'buyer',
        'store_name' => null,
        'business_category_id' => null,
    ]]);

    $this->get(route('auth.google.callback', ['error' => 'access_denied']))
        ->assertRedirect(route('home'))
        ->assertSessionHasErrors('google');

    $this->assertGuest();
});

test('Google seller signup rechecks category availability after consent', function () {
    config(['services.google.client_id' => 'client', 'services.google.client_secret' => 'secret']);
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
    Socialite::fake('google', GoogleUser::fake(['id' => 'seller', 'email' => 'seller@example.com', 'verified_email' => true]));
    $this->post(route('auth.google.redirect'), ['intent' => 'register', 'role' => 'seller', 'store_name' => 'Store', 'business_category_id' => $category->id])->assertRedirect();
    $category->update(['is_active' => false]);
    $this->get(route('auth.google.callback'))->assertSessionHasErrors('google');
    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'seller@example.com']);
});
