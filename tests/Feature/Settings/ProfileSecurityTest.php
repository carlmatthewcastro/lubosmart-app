<?php

use App\Models\RegistrationApplication;
use App\Models\Store;
use App\Models\User;
use App\Notifications\EmailSecurityCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

test('sensitive contact changes require confirmation and cannot target another identity', function () {
    $user = User::factory()->create(['phone' => '09171234567']);
    $other = User::factory()->create();
    $this->actingAs($user)->patch('/settings/profile', ['user_id' => $other->id, 'name' => 'Changed', 'email' => 'changed@example.com', 'phone' => '09171234568'])->assertSessionHasErrors('code');
    expect($user->fresh()->email)->toBe($user->email);
    expect($other->fresh()->name)->toBe($other->name);
    $this->patch('/settings/profile', ['user_id' => $other->id, 'name' => 'Changed', 'email' => $user->email, 'phone' => '09171234568', 'current_password' => 'password'])->assertSessionHasNoErrors();
    expect($user->fresh()->phone)->toBe('09171234568');
    expect($other->fresh()->phone)->toBeNull();
});

test('Google only users can confirm contact changes with a one time code', function () {
    Notification::fake();
    $user = User::factory()->create(['google_id' => 'google-only', 'password' => null, 'phone' => '09171234567']);
    $this->actingAs($user)->post('/settings/security-code', ['purpose' => 'profile'])->assertSessionHasNoErrors();
    Notification::assertSentTo($user, EmailSecurityCode::class);
    $code = Notification::sent($user, EmailSecurityCode::class)->first()->code;
    $this->post('/settings/security-code/verify', ['purpose' => 'profile', 'code' => $code])->assertSessionHasNoErrors();
    $this->patch('/settings/profile', ['name' => $user->name, 'email' => $user->email, 'phone' => '09171234568'])->assertSessionHasNoErrors();
    expect($user->fresh()->phone)->toBe('09171234568');
    $this->patch('/settings/profile', ['name' => $user->name, 'email' => $user->email, 'phone' => '09171234569'])->assertSessionHasErrors('code');
});

test('approved seller business changes return to pending and hide listings until reviewed', function () {
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Old business', 'status' => 'approved']);
    RegistrationApplication::query()->create(['user_id' => $seller->id, 'requested_role' => 'seller', 'status' => 'approved']);
    $this->actingAs($seller)->patch('/settings/profile', ['name' => $seller->name, 'email' => $seller->email, 'business_name' => 'New business'])->assertSessionHasNoErrors();
    expect($seller->fresh()->status)->toBe('pending');
    expect($store->fresh()->status)->toBe('pending');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $seller->id, 'status' => 'submitted', 'business_name' => 'New business', 'reviewer_id' => null]);
    $this->assertDatabaseHas('audit_events', ['actor_id' => $seller->id, 'action' => 'profile_review_requested']);
    $this->actingAs($seller->fresh())->post('/inventory', [])->assertRedirect('/application/waiting');
});

test('seller bank changes require confirmation and store encrypted details for review', function () {
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Business', 'status' => 'approved']);
    RegistrationApplication::query()->create(['user_id' => $seller->id, 'requested_role' => 'seller', 'status' => 'approved']);
    $data = ['name' => $seller->name, 'email' => $seller->email, 'bank_account' => 'Test Bank 123456789'];
    $this->actingAs($seller)->patch('/settings/profile', $data)->assertSessionHasErrors('code');
    expect($seller->fresh()->status)->toBe('approved');
    $this->patch('/settings/profile', [...$data, 'current_password' => 'password'])->assertSessionHasNoErrors();
    expect($store->fresh()->bank_account)->toBe('Test Bank 123456789');
    expect(DB::table('stores')->where('id', $store->id)->value('bank_account'))->not->toBe('Test Bank 123456789');
    expect($store->fresh()->toArray())->not->toHaveKey('bank_account');
    expect($seller->fresh()->status)->toBe('pending');
});

test('approved rider plate changes return the account to pending', function () {
    $rider = User::factory()->create(['role' => 'courier']);
    linkRiderToApprovedCenter($rider);
    RegistrationApplication::query()->create(['user_id' => $rider->id, 'requested_role' => 'courier', 'status' => 'approved']);
    DB::table('rider_profiles')->insert(['user_id' => $rider->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'OLD123']);
    $this->actingAs($rider)->patch('/settings/profile', ['name' => $rider->name, 'email' => $rider->email, 'plate_number' => 'NEW123'])->assertSessionHasNoErrors();
    expect($rider->fresh()->status)->toBe('pending');
    $this->assertDatabaseHas('rider_profiles', ['user_id' => $rider->id, 'plate_number' => 'NEW123']);
    $this->assertDatabaseHas('registration_applications', ['user_id' => $rider->id, 'status' => 'submitted']);
    $this->actingAs($rider->fresh())->get('/deliveries')->assertRedirect('/application/waiting');
});

test('profile editing and codes require authentication', function () {
    $this->patch('/settings/profile', [])->assertRedirect('/login');
    $this->post('/settings/security-code', ['purpose' => 'profile'])->assertRedirect('/login');
});
