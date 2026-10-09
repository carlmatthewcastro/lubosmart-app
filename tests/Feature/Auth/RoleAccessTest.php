<?php

use App\Models\Order;
use App\Models\RegistrationApplication;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

test('each verified active role receives its own dashboard', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'courier') {
        linkRiderToApprovedCenter($user);
    }
    $this->actingAs($user)->get(route('dashboard.role', $role))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($role === 'admin' ? 'admin/dashboard' : 'workspace/dashboard')->where('role', $role)->has('stats', 3)->has('records', 0));
})->with(['buyer', 'seller', 'courier', 'sorting_center', 'admin']);

test('a role cannot open another role dashboard', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    $target = $role === 'admin' ? 'buyer' : 'admin';
    $this->actingAs($user)->get(route('dashboard.role', $target))->assertForbidden();
})->with(['buyer', 'seller', 'courier', 'sorting_center', 'admin']);

test('unverified accounts are sent to email verification', function () {
    $this->actingAs(User::factory()->unverified()->create())->get('/dashboard/buyer')->assertRedirect(route('verification.notice'));
});

test('pending accounts cannot reach operational dashboards', function () {
    $user = User::factory()->create(['status' => 'pending']);
    $this->actingAs($user)->get('/dashboard/buyer')->assertRedirect(route('application.waiting'));
});

test('suspending an existing session immediately denies access but permits logout', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    $user->forceFill(['status' => 'suspended'])->save();
    $this->get('/settings/profile')->assertForbidden();
    $this->post('/logout')->assertRedirect('/');
    $this->assertGuest();
});

test('suspended users cannot authenticate with a password', function () {
    User::factory()->create(['email' => 'suspended@example.com', 'status' => 'suspended']);
    $this->from('/login')->post('/login', ['email' => 'suspended@example.com', 'password' => 'password'])->assertRedirect('/login')->assertSessionHasErrors(['email' => 'Your account is suspended. Contact LubosMart support.']);
    $this->assertGuest();
});

test('public logistics registration is pending and cannot inject privileges', function () {
    Notification::fake();
    $this->post('/register', ['policy_accepted' => true, 'name' => 'Test Logistics', 'email' => 'CENTER@example.com', 'role' => 'sorting_center', 'password' => 'password', 'password_confirmation' => 'password', 'status' => 'approved', 'email_verified_at' => now(), 'reviewer_id' => 1])->assertRedirect(route('verification.notice'));
    $user = User::query()->where('email', 'center@example.com')->firstOrFail();
    expect($user->status)->toBe('unverified');
    expect($user->email_verified_at)->toBeNull();
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'requested_role' => 'sorting_center', 'status' => 'draft', 'reviewer_id' => null]);
    Notification::assertSentTo($user, VerifyAccountEmail::class);
});

test('Google login refuses unknown emails without creating an account', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'new-google-id', 'email' => 'new@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('register'))->assertSessionHasErrors(['google' => 'No account found for this email. Choose a role to create one.']);
    $this->assertGuest();
    $this->assertDatabaseCount('users', 0);
});

test('expired Google intent cannot create an account', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'expired', 'email' => 'expired@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'role' => 'buyer', 'started_at' => now()->subMinutes(16)->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('home'))->assertSessionHasErrors('google');
    $this->assertDatabaseCount('users', 0);
});

test('Google denies a suspended linked identity', function () {
    User::factory()->create(['google_id' => 'suspended-google', 'status' => 'suspended']);
    Socialite::fake('google', GoogleUser::fake(['id' => 'suspended-google', 'email' => 'suspended@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('home'))->assertSessionHasErrors('google');
    $this->assertGuest();
});

test('registration records produce a clear account closure response', function () {
    $user = User::factory()->create();
    RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => 'buyer']);
    $this->actingAs($user)->from('/settings/profile')->delete('/settings/profile', ['password' => 'password'])->assertRedirect('/settings/profile')->assertSessionHasErrors('password');
    $this->assertDatabaseHas('users', ['id' => $user->id]);
});

test('buyer dashboard omits another buyers orders', function () {
    $buyer = User::factory()->create();
    $other = User::factory()->create();
    Order::query()->create(['buyer_id' => $other->id, 'shipping_recipient_name' => 'Other buyer', 'shipping_phone' => '09171234567', 'shipping_line1' => 'Synthetic address', 'shipping_barangay' => 'Test', 'shipping_city' => 'Test City', 'shipping_province' => 'Test Province', 'shipping_region' => 'Test Region', 'shipping_zip' => '4000', 'subtotal' => '100.00', 'shipping_total' => '0.00', 'total' => '100.00']);
    $this->actingAs($buyer)->get('/dashboard/buyer')->assertOk()->assertInertia(fn (Assert $page) => $page->where('stats.Orders', 0)->has('records', 0));
});
