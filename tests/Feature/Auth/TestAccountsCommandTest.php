<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

test('the test account command creates five verified active local accounts', function () {
    $this->artisan('lubosmart:test-accounts')->assertSuccessful();
    expect(User::query()->where('status', 'active')->whereNotNull('email_verified_at')->count())->toBe(5);
    $this->assertDatabaseHas('stores', ['status' => 'approved', 'name' => 'Test Store']);
    $this->assertDatabaseCount('sorting_center_user', 2);
});

test('the test account command refuses production environments', function () {
    app()->detectEnvironment(fn () => 'production');
    $this->artisan('lubosmart:test-accounts')->expectsOutput('Test accounts are only available in local and testing environments.')->assertFailed();
    $this->assertDatabaseCount('users', 0);
});

test('admin provisioning uses explicit interactive credentials', function () {
    $this->artisan('lubosmart:create-admin')->expectsQuestion('Full name', 'Test Admin')->expectsQuestion('Email address', 'admin@example.com')->expectsQuestion('Password (at least 12 characters)', 'TestPassword123')->expectsQuestion('Confirm password', 'TestPassword123')->assertSuccessful();
    $this->assertDatabaseHas('users', ['email' => 'admin@example.com', 'role' => 'admin', 'status' => 'active']);
    expect(User::query()->first()->email_verified_at)->not->toBeNull();
});

test('repeating test account creation preserves credentials and creates no duplicate records', function () {
    Artisan::call('lubosmart:test-accounts');
    $passwords = User::query()->orderBy('id')->pluck('password', 'email')->all();
    $buyer = User::query()->where('role', 'buyer')->firstOrFail();
    $buyer->forceFill(['status' => 'suspended', 'name' => 'Preserved Test Buyer'])->save();

    $this->artisan('lubosmart:test-accounts')->expectsOutput('All test accounts already exist. Existing credentials were preserved.')->assertSuccessful();

    expect(User::query()->orderBy('id')->pluck('password', 'email')->all())->toBe($passwords);
    $this->assertDatabaseHas('users', ['id' => $buyer->id, 'status' => 'suspended', 'name' => 'Preserved Test Buyer']);
    $this->assertDatabaseCount('users', 5);
    $this->assertDatabaseCount('stores', 1);
    $this->assertDatabaseCount('sorting_centers', 1);
    $this->assertDatabaseCount('sorting_center_user', 2);
});

test('partial test accounts are completed without changing an existing account', function () {
    $buyer = User::factory()->create(['email' => 'buyer@testing.lubosmart.invalid', 'password' => Hash::make('ExistingPassword123')]);

    $this->artisan('lubosmart:test-accounts')->assertSuccessful();

    expect(Hash::check('ExistingPassword123', $buyer->fresh()->password))->toBeTrue();
    $this->assertDatabaseCount('users', 5);
    $this->assertDatabaseCount('stores', 1);
    $this->assertDatabaseCount('sorting_center_user', 2);
});

test('explicit test password reset updates only reserved test accounts', function () {
    Artisan::call('lubosmart:test-accounts');
    $previous = User::query()->pluck('password', 'email');
    $other = User::factory()->create(['password' => Hash::make('UnrelatedPassword123')]);

    expect(Artisan::call('lubosmart:test-accounts', ['--reset-passwords' => true]))->toBe(0);

    preg_match('/Password for accounts marked Created or Password reset: (.+)/', Artisan::output(), $matches);
    expect($matches)->toHaveCount(2);
    foreach (User::query()->whereIn('email', $previous->keys())->get() as $user) {
        expect($user->password)->not->toBe($previous[$user->email]);
        expect(Hash::check(trim($matches[1]), $user->password))->toBeTrue();
    }
    expect(Hash::check('UnrelatedPassword123', $other->fresh()->password))->toBeTrue();
    $this->assertDatabaseCount('users', 6);
    $this->assertDatabaseCount('sorting_centers', 1);
});

test('reserved test emails with conflicting roles return a clear error and roll back changes', function () {
    $user = User::factory()->create(['email' => 'buyer@testing.lubosmart.invalid', 'role' => 'seller']);
    $password = $user->password;

    $this->artisan('lubosmart:test-accounts', ['--reset-passwords' => true])
        ->expectsOutput('The reserved test email lubosmart-buyer@testing.app belongs to a different role. No accounts were changed.')
        ->assertFailed();

    expect($user->fresh()->password)->toBe($password);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('stores', 0);
    $this->assertDatabaseCount('sorting_centers', 0);
});

test('test password reset is unavailable in production', function () {
    app()->detectEnvironment(fn () => 'production');

    $this->artisan('lubosmart:test-accounts', ['--reset-passwords' => true])
        ->expectsOutput('Test accounts are only available in local and testing environments.')
        ->assertFailed();

    $this->assertDatabaseCount('users', 0);
});

test('the private login guide retains the same known passwords across reruns', function () {
    Artisan::call('lubosmart:test-accounts');
    $passwords = Storage::disk('local')->get('test-account-passwords.json');
    $guide = Storage::disk('local')->get('local-test-accounts.md');
    expect($guide)->toContain('lubosmart-admin@testing.app', 'lubosmart-buyer@testing.app', 'lubosmart-seller@testing.app', 'lubosmart-rider@testing.app', 'lubosmart-logistics@testing.app');
    Artisan::call('lubosmart:test-accounts');
    expect(Storage::disk('local')->get('test-account-passwords.json'))->toBe($passwords);
    expect(Storage::disk('local')->get('local-test-accounts.md'))->toBe($guide);
    foreach (json_decode($passwords, true) as $email => $password) {
        expect(Hash::check($password, User::query()->where('email', $email)->firstOrFail()->password))->toBeTrue();
    }
});

test('demo setup is repeatable and preserves existing stock and address records', function () {
    $this->artisan('lubosmart:test-accounts', ['--demo' => true])->assertSuccessful();
    $product = Product::query()->firstOrFail();
    $product->update(['stock' => 7]);
    $this->artisan('lubosmart:test-accounts', ['--demo' => true])->assertSuccessful();
    $this->assertDatabaseCount('products', 3);
    $this->assertDatabaseCount('addresses', 1);
    expect($product->fresh()->stock)->toBe(7);
});
