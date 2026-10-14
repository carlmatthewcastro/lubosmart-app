<?php

use App\Models\Category;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

test('Google registration saves a trusted provider ID with the selected role and still requires an email code', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    Socialite::fake('google', GoogleUser::fake(['id' => 'trusted-google', 'name' => 'Test User', 'email' => 'trusted@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('register'));
    $data = match ($role) {
        'seller' => sellerRegistrationData(), 'sorting_center' => logisticsRegistrationData(),
        'courier' => riderRegistrationData(), default => sharedRegistrationData(),
    };
    $this->post('/register', [...$data, 'email' => 'trusted@example.com', 'google_id' => 'forged-google', 'status' => 'approved', 'middle_initial' => 'C.'])
        ->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'))->assertSessionMissing('pending_google_registration');
    $user = User::where('email', 'trusted@example.com')->firstOrFail();
    expect($user->google_id)->toBe('trusted-google');
    expect($user->role)->toBe($role);
    expect($user->status)->toBe('unverified');
    expect($user->email_verified_at)->toBeNull();
    $this->assertDatabaseHas('user_profiles', ['user_id' => $user->id, 'middle_initial' => 'C.', 'sex' => 'female']);
    Notification::assertSentTo($user, VerifyAccountEmail::class);
})->with(['buyer', 'seller', 'courier', 'sorting_center']);

test('pending Google registration rejects a changed email and expired identity', function () {
    session(['pending_google_registration' => ['id' => 'trusted-google', 'email' => 'trusted@example.com', 'expires_at' => now()->addMinutes(30)->timestamp]]);
    $this->post('/register', sharedRegistrationData(['email' => 'different@example.com']))->assertSessionHasErrors('email');
    $this->travel(31)->minutes();
    $this->post('/register', sharedRegistrationData(['email' => 'trusted@example.com']))->assertSessionHasErrors('google');
    $this->assertDatabaseCount('users', 0);
});

test('new Google identities choose a role before any account is created', function () {
    config(['services.google.client_id' => 'test-client-id', 'services.google.client_secret' => 'test-client-secret']);
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-google', 'name' => 'Maria Clara Santos', 'email' => 'google@example.com', 'verified_email' => true, 'role' => 'admin', 'status' => 'approved']));
    $this->post(route('auth.google.redirect'), ['intent' => 'login'])->assertRedirect('https://socialite.fake/google/authorize');
    $this->get(route('auth.google.callback'))->assertRedirect(route('register'))->assertSessionHasNoErrors();
    $this->assertGuest();
    $this->assertDatabaseCount('users', 0);
    $this->get('/register')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('googleRegistration.email', 'google@example.com')->where('googleRegistration.first_name', 'Maria Clara')
        ->where('googleRegistration.last_name', 'Santos')->missing('googleRegistration.id'));
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
        'role' => 'seller',
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

test('Google buyers must finish registration including ID before account creation', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-buyer', 'name' => 'Google Buyer', 'email' => 'buyer@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('register'));
    $this->assertGuest();
    $this->assertDatabaseCount('users', 0);
    $this->post('/register', sharedRegistrationData(['email' => 'buyer@example.com', 'identity' => null]))->assertSessionHasErrors('identity');
    $this->assertDatabaseCount('users', 0);
});
test('Google seller registration cannot skip business requirements', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-seller', 'name' => 'Google Seller', 'email' => 'seller@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('register'));
    $this->post('/register', sharedRegistrationData(['email' => 'seller@example.com', 'role' => 'seller']))->assertSessionHasErrors(['business_name', 'business_permit']);
    $this->assertDatabaseCount('users', 0);
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
    $this->post('/choose-role', ['role' => 'seller', 'status' => 'approved'])->assertRedirect('/application');
    expect($user->fresh()->status)->toBe('incomplete');
    $this->actingAs($user->fresh())->post('/choose-role', ['role' => 'admin'])->assertSessionHasErrors('role');
    $this->post('/choose-role', ['role' => 'buyer'])->assertForbidden();
    expect($user->fresh()->role)->toBe('seller');
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

test('Google callback ignores legacy store and role data and requires complete registration', function () {
    config(['services.google.client_id' => 'client', 'services.google.client_secret' => 'secret']);
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
    Socialite::fake('google', GoogleUser::fake(['id' => 'seller', 'email' => 'seller@example.com', 'verified_email' => true]));
    $this->post(route('auth.google.redirect'), ['intent' => 'register', 'policy_accepted' => true, 'role' => 'seller', 'store_name' => 'Store', 'business_category_id' => $category->id])->assertRedirect();
    $this->get(route('auth.google.callback'))->assertSessionHasNoErrors()->assertRedirect('/register');
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('stores', 0);
});
