<?php

use App\Models\Category;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('accounts can register without a name and retain the correct verification and review boundaries', function (string $role) {
    Notification::fake();
    $this->post('/register', ['policy_accepted' => true,
        'email' => $role.'@new-member.example', 'role' => $role,
        'password' => 'password', 'password_confirmation' => 'password',
    ])->assertSessionHasNoErrors()->assertRedirect(route('verification.notice', absolute: false));

    $user = User::query()->where('email', $role.'@new-member.example')->firstOrFail();
    $this->assertAuthenticatedAs($user);
    expect($user->name)->toBe('LubosMart member');
    expect($user->email_verified_at)->toBeNull();
    expect($user->role)->toBe($role);
    expect($user->status)->toBe('unverified');
    Notification::assertSentTo($user, VerifyAccountEmail::class);
    $this->assertDatabaseCount('user_profiles', 0);
    $this->assertDatabaseCount('stores', 0);
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'requested_role' => $role, 'status' => 'draft']);
    if ($role === 'buyer') {
        $this->get('/cart')->assertRedirect(route('verification.notice'));
    }
    $this->get('/application')->assertRedirect(route('verification.notice'));
    $user->markEmailAsVerified();
    $this->actingAs($user->fresh())->get('/application')->assertInertia(fn (Assert $page) => $page
        ->component('application')->where('profile', null));
})->with(['buyer', 'seller', 'courier', 'sorting_center']);

test('structured signup preserves multiword names and prefills the partner application', function () {
    Notification::fake();
    $this->post('/register', ['policy_accepted' => true,
        'first_name' => 'Carl Matthew',
        'last_name' => 'De la Cruz',
        'name' => 'Ignored legacy name',
        'email' => 'structured@example.com',
        'role' => 'seller',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertSessionHasNoErrors()->assertRedirect(route('verification.notice', absolute: false));

    $user = User::query()->where('email', 'structured@example.com')->firstOrFail();
    expect($user->name)->toBe('Carl Matthew De la Cruz');
    $this->assertDatabaseHas('user_profiles', [
        'user_id' => $user->id, 'first_name' => 'Carl Matthew', 'last_name' => 'De la Cruz',
        'middle_initial' => null, 'birthday' => null,
    ]);
    $user->markEmailAsVerified();
    $this->actingAs($user->fresh())->get('/application')->assertInertia(fn (Assert $page) => $page
        ->component('application')
        ->where('profile.first_name', 'Carl Matthew')
        ->where('profile.last_name', 'De la Cruz'));
});

test('structured signup requires both name parts without falling back to a supplied full name', function (array $names, string $field) {
    Notification::fake();
    $this->post('/register', array_merge(['role' => 'buyer', 'policy_accepted' => true,
        'name' => 'Legacy User', 'email' => 'invalid@example.com',
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
    $response = $this->post('/register', ['role' => 'buyer', 'policy_accepted' => true,
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'role' => 'buyer',
    ]);
    $response->assertRedirect(route('verification.notice', absolute: false));
});

test('sellers can register with a pending store', function () {
    Notification::fake();
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
    $response = $this->post('/register', ['policy_accepted' => true,
        'name' => 'Seller User',
        'email' => 'seller@example.com',
        'role' => 'seller',
        'store_name' => 'Seller Store',
        'business_category_id' => $category->id,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);
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

test('riders can self-register', function () {
    Notification::fake();
    $this->post('/register', ['policy_accepted' => true,
        'name' => 'Rider User',
        'email' => 'rider@example.com',
        'role' => 'courier',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('verification.notice', absolute: false));

    $this->assertDatabaseHas('users', [
        'email' => 'rider@example.com',
        'role' => 'courier',
    ]);
});

test('seller account creation defers store details to its pending application', function () {
    Notification::fake();
    $response = $this->from('/register')->post('/register', ['policy_accepted' => true,
        'name' => 'Seller User',
        'email' => 'seller@example.com',
        'role' => 'seller',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect(route('verification.notice', absolute: false));
    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('users', ['email' => 'seller@example.com', 'status' => 'unverified']);
    $this->assertDatabaseHas('registration_applications', ['user_id' => User::query()->where('email', 'seller@example.com')->value('id'), 'status' => 'draft']);
    $this->assertDatabaseCount('stores', 0);
});

test('ordinary buyers need identity approval before cart access and checkout', function () {
    Notification::fake();
    $this->post('/register', ['role' => 'buyer', 'policy_accepted' => true, 'name' => 'Buyer', 'email' => 'buyer@example.com', 'password' => 'password', 'password_confirmation' => 'password'])->assertSessionHasNoErrors();
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
    $response = $this->from('/register')->post('/register', ['policy_accepted' => true,
        'name' => 'Admin User',
        'email' => $role.'@example.com',
        'role' => $role,
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors('role');
    $this->assertDatabaseMissing('users', ['email' => $role.'@example.com']);
})->with(['admin', 'owner', 'rider', 'logistics']);

test('seller signup rejects inactive or child categories', function (string $kind) {
    Notification::fake();
    $parent = Category::query()->create(['name' => 'Parent', 'slug' => 'parent']);
    $category = Category::query()->create(['name' => 'Selected', 'slug' => 'selected', 'parent_id' => $kind === 'child' ? $parent->id : null, 'is_active' => $kind !== 'inactive']);
    $this->post('/register', ['policy_accepted' => true,
        'name' => 'Seller', 'email' => 'seller@example.com', 'role' => 'seller',
        'store_name' => 'Store', 'business_category_id' => $category->id,
        'password' => 'password', 'password_confirmation' => 'password',
    ])->assertSessionHasErrors('business_category_id');
    $this->assertDatabaseMissing('users', ['email' => 'seller@example.com']);
})->with(['inactive', 'child']);

test('a mail delivery failure preserves the new account and allows verification to be retried', function () {
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('Synthetic delivery failure'));
    $this->post('/register', [
        'role' => 'buyer', 'policy_accepted' => true, 'email' => 'delivery-failure@example.com',
        'password' => 'password', 'password_confirmation' => 'password',
    ])->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'))->assertSessionHas('status', 'verification-mail-unavailable');
    $user = User::query()->where('email', 'delivery-failure@example.com')->firstOrFail();
    $this->assertAuthenticatedAs($user);
    expect($user->status)->toBe('unverified');
    $this->assertDatabaseCount('email_verification_tokens', 0);
    Notification::fake();
    $this->post(route('verification.send'))->assertSessionHasNoErrors()->assertSessionHas('status', 'verification-link-sent');
    Notification::assertSentTo($user, VerifyAccountEmail::class);
});

test('signup works without the agreement checkbox and does not record consent', function () {
    Notification::fake();
    $this->post('/register', ['role' => 'buyer', 'email' => 'no-consent@example.com', 'password' => 'password', 'password_confirmation' => 'password'])->assertSessionHasNoErrors();
    $user = User::query()->where('email', 'no-consent@example.com')->firstOrFail();
    expect($user->application->policy_accepted_at)->toBeNull();
    expect($user->application->policy_version)->toBeNull();
});
