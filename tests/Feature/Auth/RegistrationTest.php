<?php

use App\Models\Category;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use App\Support\AccountRules;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Testing\AssertableInertia as Assert;

test('signup rejects invalid optional middle initials', function (string $middle) {
    $this->post('/register', ['role' => 'buyer', 'middle_initial' => $middle])
        ->assertSessionHasErrors('middle_initial');
})->with(['digits' => '123', 'mixed digits' => 'M2', 'punctuation only' => '---', 'emoji' => 'M😀', 'too long' => 'ABCDEFGHIJK']);

test('optional middle initial rules accept blank and valid names', function (?string $middle) {
    $validator = Validator::make(
        ['middle_initial' => $middle],
        ['middle_initial' => ['nullable', ...AccountRules::name(10, 1)]],
    );
    expect($validator->passes())->toBeTrue();
})->with([null, '', 'M', 'M.', 'Peña', "D'Angelo", 'Ann-Marie']);

test('accounts register with shared details and retain verification and review boundaries', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $payload = ['policy_accepted' => true,
        'email' => $role.'@new-member.example', 'role' => $role,
        'password' => 'Register@2026', 'password_confirmation' => 'Register@2026',
    ];
    $this->post('/register', $role === 'seller' ? sellerRegistrationData($payload) : ($role === 'sorting_center' ? logisticsRegistrationData([...$payload, 'first_name' => 'Test', 'last_name' => 'User']) : sharedRegistrationData($payload)))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice', absolute: false));

    $user = User::query()->where('email', $role.'@new-member.example')->firstOrFail();
    $this->assertAuthenticatedAs($user);
    expect($user->name)->toBe('Test User');
    expect($user->email_verified_at)->toBeNull();
    expect($user->role)->toBe($role);
    expect($user->status)->toBe('unverified');
    Notification::assertSentTo($user, VerifyAccountEmail::class);
    $this->assertDatabaseCount('user_profiles', 1);
    $this->assertDatabaseCount('stores', $role === 'seller' ? 1 : 0);
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'requested_role' => $role, 'status' => 'submitted']);
    if ($role === 'buyer') {
        $this->get('/cart')->assertRedirect(route('verification.notice'));
    }
    $this->get('/application')->assertRedirect(route('verification.notice'));
    $user->markEmailAsVerified();
    $this->actingAs($user->fresh())->get('/application')->assertInertia(fn (Assert $page) => $page
        ->component($role === 'seller' ? 'onboarding/seller-application' : ($role === 'sorting_center' ? 'onboarding/logistics-application' : 'onboarding/application'))->where('profile.first_name', 'Test'));
})->with(['buyer', 'seller', 'sorting_center']);

test('structured signup preserves multiword names and prefills the partner application', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', sellerRegistrationData(['policy_accepted' => true,
        'first_name' => 'Carl Matthew',
        'last_name' => 'De la Cruz',
        'name' => 'Ignored legacy name',
        'email' => 'structured@example.com',
        'role' => 'seller',
        'password' => 'Register@2026',
        'password_confirmation' => 'Register@2026',
    ]))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice', absolute: false));

    $user = User::query()->where('email', 'structured@example.com')->firstOrFail();
    expect($user->name)->toBe('Carl Matthew De la Cruz');
    $this->assertDatabaseHas('user_profiles', [
        'user_id' => $user->id, 'first_name' => 'Carl Matthew', 'last_name' => 'De la Cruz',
        'middle_initial' => null, 'birthday' => '1995-01-01',
    ]);
    $user->markEmailAsVerified();
    $this->actingAs($user->fresh())->get('/application')->assertInertia(fn (Assert $page) => $page
        ->component('onboarding/seller-application')
        ->where('profile.first_name', 'Carl Matthew')
        ->where('profile.last_name', 'De la Cruz'));
});

test('structured signup requires both name parts without falling back to a supplied full name', function (array $names, string $field) {
    Notification::fake();
    $this->post('/register', array_merge(['role' => 'buyer', 'policy_accepted' => true,
        'name' => 'Legacy User', 'email' => 'invalid@example.com', 'phone' => '09170000001', 'birthday' => '1995-01-01',
        'password' => 'password', 'password_confirmation' => 'password',
    ], $names))->assertSessionHasErrors($field);

    $this->assertGuest();
    $this->assertDatabaseMissing('users', ['email' => 'invalid@example.com']);
    $this->assertDatabaseCount('user_profiles', 0);
})->with([
    'missing last name' => [['first_name' => 'Carl'], 'last_name'],
    'missing first name' => [['last_name' => 'De la Cruz'], 'first_name'],
    'blank first name' => [['first_name' => '   ', 'last_name' => 'De la Cruz'], 'first_name'],
    'long last name' => [['first_name' => 'Carl', 'last_name' => str_repeat('a', 81)], 'last_name'],
]);

test('registration screen can be rendered', function () {
    Notification::fake();
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new users can register', function () {
    Notification::fake();
    $response = $this->post('/register', sharedRegistrationData(['role' => 'buyer', 'policy_accepted' => true,
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'Register@2026',
        'password_confirmation' => 'Register@2026',
    ]));

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'role' => 'buyer',
    ]);
    $response->assertRedirect(route('verification.notice', absolute: false));
});

test('sellers can register with a pending store', function () {
    Notification::fake();
    Storage::fake('local');
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
    $response = $this->post('/register', sellerRegistrationData(['policy_accepted' => true,
        'name' => 'Seller User',
        'email' => 'seller@example.com',
        'role' => 'seller',
        'business_name' => 'Seller Store',
        'business_category_id' => $category->id,
        'password' => 'Register@2026',
        'password_confirmation' => 'Register@2026',
    ]));
    $this->assertAuthenticated();
    $user = User::query()->where('email', 'seller@example.com')->firstOrFail();
    $this->assertDatabaseHas('users', [
        'email' => 'seller@example.com',
        'role' => 'seller',
    ]);
    $this->assertDatabaseHas('stores', [
        'user_id' => $user->id,
        'name' => 'Seller Store',
        'business_category_id' => $category->id,
        'status' => 'pending',
    ]);
    $response->assertRedirect(route('verification.notice', absolute: false));
});

test('riders self-register without invitation and remain unverified until email verification', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', riderRegistrationData(['policy_accepted' => true,
        'name' => 'Rider User',
        'email' => 'rider@example.com',
        'role' => 'courier',
        'password' => 'Register@2026',
        'password_confirmation' => 'Register@2026',
    ]))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $rider = User::where('email', 'rider@example.com')->sole();
    $this->assertAuthenticatedAs($rider);
    expect($rider->status)->toBe('unverified');
    expect($rider->hasVerifiedEmail())->toBeFalse();
    expect($rider->application->status)->toBe('submitted');
});

test('new seller account creation requires its business details before an account is created', function () {
    Notification::fake();
    $response = $this->from('/register')->post('/register', sharedRegistrationData(['policy_accepted' => true,
        'name' => 'Seller User',
        'email' => 'seller@example.com',
        'role' => 'seller',
        'password' => 'Register@2026',
        'password_confirmation' => 'Register@2026',
    ]));

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors(['business_name', 'seller_type', 'tin', 'identity']);
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('registration_applications', 0);
    $this->assertDatabaseCount('stores', 0);
});

test('directly marking email verified without completing registration verification cannot bypass onboarding', function () {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['role' => 'buyer', 'policy_accepted' => true, 'name' => 'Buyer', 'email' => 'buyer@example.com', 'password' => 'Register@2026', 'password_confirmation' => 'Register@2026']))->assertSessionHasNoErrors();
    $user = User::query()->where('email', 'buyer@example.com')->firstOrFail();
    expect($user->status)->toBe('unverified');
    expect($user->email_verified_at)->toBeNull();
    $this->assertDatabaseCount('registration_applications', 1);
    $this->get('/cart')->assertRedirect(route('verification.notice'));
    $user->markEmailAsVerified();
    $this->actingAs($user->fresh())->get('/dashboard')->assertRedirect('/application');
    $this->get('/cart')->assertRedirect('/application');
    $this->post('/checkout', [])->assertRedirect('/application');
});

test('restricted roles cannot self-register', function (string $role) {
    Notification::fake();
    $response = $this->from('/register')->post('/register', sharedRegistrationData(['policy_accepted' => true,
        'name' => 'Admin User',
        'email' => $role.'@example.com',
        'role' => $role,
        'password' => 'Register@2026',
        'password_confirmation' => 'Register@2026',
    ]));

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors('role');
    $this->assertDatabaseMissing('users', ['email' => $role.'@example.com']);
})->with(['admin', 'owner', 'rider', 'logistics']);

test('seller signup rejects inactive or child categories', function (string $kind) {
    Notification::fake();
    $parent = Category::query()->create(['name' => 'Parent', 'slug' => 'parent']);
    $category = Category::query()->create(['name' => 'Selected', 'slug' => 'selected', 'parent_id' => $kind === 'child' ? $parent->id : null, 'is_active' => $kind !== 'inactive']);
    $this->post('/register', sharedRegistrationData(['policy_accepted' => true,
        'name' => 'Seller', 'email' => 'seller@example.com', 'role' => 'seller',
        'store_name' => 'Store', 'business_category_id' => $category->id,
        'password' => 'Register@2026', 'password_confirmation' => 'Register@2026',
    ]))->assertSessionHasErrors('business_category_id');
    $this->assertDatabaseMissing('users', ['email' => 'seller@example.com']);
})->with(['inactive', 'child']);

test('a mail delivery failure preserves the new account and allows verification to be retried', function () {
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('Synthetic delivery failure'));
    $this->post('/register', sharedRegistrationData([
        'role' => 'buyer', 'policy_accepted' => true, 'email' => 'delivery-failure@example.com',
        'password' => 'Register@2026', 'password_confirmation' => 'Register@2026',
    ]))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'))->assertSessionHas('status', 'verification-mail-unavailable');
    $user = User::query()->where('email', 'delivery-failure@example.com')->firstOrFail();
    $this->assertAuthenticatedAs($user);
    expect($user->status)->toBe('unverified');
    $this->assertDatabaseCount('email_verification_tokens', 0);
    $this->assertDatabaseCount('registration_email_codes', 0);
    Notification::fake();
    $this->post(route('verification.send'))->assertSessionHasNoErrors()->assertSessionHas('status', 'verification-link-sent');
    Notification::assertSentTo($user, VerifyAccountEmail::class);
});

test('signup requires agreement before creating the account', function () {
    Notification::fake();
    $data = sharedRegistrationData(['email' => 'no-consent@example.com']);
    unset($data['policy_accepted']);
    $this->post('/register', $data)->assertSessionHasErrors('policy_accepted');
    $this->assertDatabaseMissing('users', ['email' => 'no-consent@example.com']);
    Notification::assertNothingSent();
});
