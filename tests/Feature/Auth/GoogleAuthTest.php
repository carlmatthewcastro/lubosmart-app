<?php

use App\Models\Category;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

test('Google signup uses the selected role and ignores submitted approval privileges', function () {
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
        'role' => 'admin',
        'status' => 'approved',
    ]));

    $this->post(route('auth.google.redirect'), ['intent' => 'register', 'policy_accepted' => true,
        'role' => 'seller',
        'status' => 'approved',
        'store_name' => 'Google Store',
        'business_category_id' => $category->id,
    ])->assertRedirect('https://socialite.fake/google/authorize');

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('application.edit'));

    $user = User::query()->where('email', 'google-seller@example.com')->firstOrFail();
    $this->assertAuthenticatedAs($user);
    expect($user->role)->toBe('seller');
    expect($user->email_verified_at)->not->toBeNull();
    expect($user->password)->toBeNull();
    $this->assertDatabaseCount('stores', 0);
    $this->post('/choose-role', ['role' => 'admin', 'status' => 'approved'])->assertSessionHasErrors('role');
    expect($user->fresh()->role)->toBe('seller');
    expect($user->fresh()->status)->toBe('incomplete');
});

test('a linked Google account cannot verify a changed local email that differs from the provider email', function () {
    $user = User::factory()->create(['google_id' => 'changed-local-email', 'email' => 'new-address@example.com', 'email_verified_at' => null]);
    Socialite::fake('google', GoogleUser::fake(['id' => 'changed-local-email', 'email' => 'original-address@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('verification.notice'));
    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->email)->toBe('new-address@example.com');
    expect($user->fresh()->email_verified_at)->toBeNull();
});

test('Google links an existing account using its verified email without changing role or status', function () {
    $user = User::factory()->create([
        'email' => 'existing@example.com',
        'google_id' => null,
        'role' => 'courier',
    ]);
    Socialite::fake('google', GoogleUser::fake([
        'id' => 'google-existing-456',
        'email' => 'existing@example.com',
        'verified_email' => true,
    ]));
    session(['google_registration' => [
        'intent' => 'register', 'policy_accepted' => true,
        'started_at' => now()->timestamp,
        'role' => 'buyer',
        'store_name' => null,
        'business_category_id' => null,
    ]]);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('dashboard'))->assertSessionHasNoErrors();

    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'google_id' => 'google-existing-456',
        'role' => 'courier',
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
        'intent' => 'register', 'policy_accepted' => true,
        'started_at' => now()->timestamp,
        'role' => 'courier',
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
        'intent' => 'register', 'policy_accepted' => true,
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

test('Google signup requires a selected role while login does not', function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
    ]);
    Socialite::fake('google');

    $this->from('/')
        ->post(route('auth.google.redirect'), ['intent' => 'register', 'policy_accepted' => true,
            'role' => 'seller',
            'store_name' => '',
            'business_category_id' => '',
        ])
        ->assertRedirect('https://socialite.fake/google/authorize')
        ->assertSessionHasNoErrors();

    $this->from('/')
        ->post(route('auth.google.redirect'), ['intent' => 'login'])
        ->assertRedirect('https://socialite.fake/google/authorize')
        ->assertSessionHasNoErrors();
});

test('verified Google buyers can shop while incomplete but need an approval application', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-buyer', 'name' => 'Google Buyer', 'email' => 'buyer@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'policy_accepted' => true, 'started_at' => now()->timestamp, 'role' => 'buyer']]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('application.edit'));
    $user = User::query()->where('email', 'buyer@example.com')->firstOrFail();
    expect($user->status)->toBe('incomplete');
    expect($user->email_verified_at)->not->toBeNull();
    $this->assertDatabaseCount('registration_applications', 1);
    $this->post('/choose-role', ['role' => 'seller'])->assertForbidden();
    $this->assertDatabaseCount('registration_applications', 1);
    $this->get('/dashboard')->assertRedirect('/application');
    $this->get('/cart')->assertRedirect('/application');
});

test('Google sellers begin a draft application without needing a store at signup', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-seller', 'name' => 'Google Seller', 'email' => 'seller@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'policy_accepted' => true, 'started_at' => now()->timestamp, 'role' => 'seller']]);
    $this->get(route('auth.google.callback'))->assertSessionHasNoErrors();
    $user = User::query()->where('email', 'seller@example.com')->firstOrFail();
    $this->post('/choose-role', ['role' => 'buyer'])->assertForbidden();
    expect($user->fresh()->status)->toBe('incomplete');
    expect($user->fresh()->application->status)->toBe('draft');
    expect($user->store)->toBeNull();
    $this->get('/dashboard')->assertRedirect('/application');
});

test('Google sign-in reports missing OAuth credentials', function () {
    config([
        'services.google.client_id' => null,
        'services.google.client_secret' => null,
    ]);

    $this->from('/')
        ->post(route('auth.google.redirect'), ['intent' => 'register', 'policy_accepted' => true, 'role' => 'buyer'])
        ->assertRedirect('/')
        ->assertSessionHasErrors('google');
});

test('role selection rejects admin privileges and cannot change an existing role', function () {
    $user = User::factory()->create(['role' => null, 'status' => 'incomplete', 'password' => null, 'google_id' => 'unassigned-google']);
    $this->actingAs($user)->get('/inventory')->assertRedirect('/choose-role');
    $this->post('/choose-role', ['role' => 'admin', 'status' => 'approved'])->assertSessionHasErrors('role');
    expect($user->fresh()->role)->toBeNull();
    $this->post('/choose-role', ['role' => 'courier', 'status' => 'approved'])->assertRedirect('/application');
    expect($user->fresh()->status)->toBe('incomplete');
    $this->actingAs($user->fresh())->post('/choose-role', ['role' => 'admin'])->assertSessionHasErrors('role');
    $this->post('/choose-role', ['role' => 'buyer'])->assertForbidden();
    expect($user->fresh()->role)->toBe('courier');
});

test('Google registration rejects cancelled consent', function () {
    session(['google_registration' => [
        'intent' => 'register', 'policy_accepted' => true,
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

test('Google sign in defers category validation to the application and ignores prior store details', function () {
    config(['services.google.client_id' => 'client', 'services.google.client_secret' => 'secret']);
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
    Socialite::fake('google', GoogleUser::fake(['id' => 'seller', 'email' => 'seller@example.com', 'verified_email' => true]));
    $this->post(route('auth.google.redirect'), ['intent' => 'register', 'policy_accepted' => true, 'role' => 'seller', 'store_name' => 'Store', 'business_category_id' => $category->id])->assertRedirect();
    $category->update(['is_active' => false]);
    $this->get(route('auth.google.callback'))->assertSessionHasNoErrors()->assertRedirect('/application');
    $this->assertDatabaseHas('users', ['email' => 'seller@example.com', 'role' => 'seller', 'status' => 'incomplete']);
    $this->assertDatabaseCount('stores', 0);
});
