<?php

use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function accountVerificationCode(User $user): string
{
    return Notification::sent($user, VerifyAccountEmail::class)->last()->code;
}

test('email verification screen can be rendered', function () {
    $user = User::factory()->unverified()->create();
    $this->actingAs($user)->get('/verify-email')->assertOk()->assertInertia(fn (Assert $page) => $page->component('auth/verify-email')->where('email', $user->email)->where('cooldown', 0));
});

test('verification sends to the locked current email even when the caller has stale account data', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['email' => 'old-mailbox@example.com']);
    User::whereKey($user->id)->update(['email' => 'current-mailbox@example.com']);
    $user->sendEmailVerificationNotification();
    Notification::assertSentTo($user, VerifyAccountEmail::class, fn ($notification, $channels, $recipient) => $recipient->email === 'current-mailbox@example.com');
    $this->assertDatabaseHas('registration_email_codes', ['user_id' => $user->id, 'email' => 'current-mailbox@example.com']);
    $this->assertDatabaseCount('email_verification_tokens', 0);
});

test('email can be verified once with a six digit code', function () {
    Notification::fake();
    Event::fake([Verified::class]);
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $code = accountVerificationCode($user);
    expect($code)->toMatch('/\A[0-9]{6}\z/');
    $this->actingAs($user)->post(route('verification.code'), ['code' => $code])->assertRedirect('/application');
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    expect($user->fresh()->status)->toBe('incomplete');
    $this->post(route('verification.code'), ['code' => $code])->assertForbidden();
    Event::assertDispatchedTimes(Verified::class, 1);
});

test('verification links are disabled even when legacy tokens exist', function () {
    $user = User::factory()->unverified()->create();
    $token = str_repeat('a', 64);
    DB::table('email_verification_tokens')->insert(['user_id' => $user->id, 'email' => $user->email, 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addDay(), 'last_sent_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    $this->actingAs($user)->get(route('verification.verify', ['token' => $token]))->assertStatus(410);
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('verification requires an authenticated account on another device', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();
    $user->sendEmailVerificationNotification();
    $this->post(route('verification.code'), ['code' => accountVerificationCode($user)])->assertRedirect('/login');
    $this->assertGuest();
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('verification never changes the current session to a different account', function () {
    Notification::fake();
    $owner = User::factory()->unverified()->create();
    $other = User::factory()->unverified()->create();
    $owner->sendEmailVerificationNotification();
    $this->actingAs($other)->post(route('verification.code'), ['code' => accountVerificationCode($owner)])->assertSessionHasErrors('code');
    $this->assertAuthenticatedAs($other);
    expect($owner->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('verification codes expire after five minutes', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create();
    $user->sendEmailVerificationNotification();
    $code = accountVerificationCode($user);
    $this->travel(5)->minutes();
    $this->actingAs($user)->post(route('verification.code'), ['code' => $code])->assertSessionHasErrors('code');
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('resending enforces cooldown and replaces the earlier code', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $old = accountVerificationCode($user);
    $this->actingAs($user)->post(route('verification.send'))->assertSessionHasErrors('email');
    $this->travel(60)->seconds();
    $this->post(route('verification.send'))->assertSessionHasNoErrors();
    $this->post(route('verification.code'), ['code' => $old])->assertSessionHasErrors('code');
    $this->post(route('verification.code'), ['code' => accountVerificationCode($user)])->assertRedirect('/application');
});

test('changing an unverified email requires credentials and invalidates old codes', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $old = accountVerificationCode($user);
    $this->actingAs($user)->patch(route('verification.email.update'), ['email' => 'corrected@example.com', 'current_password' => 'wrong'])->assertSessionHasErrors('code');
    $this->patch(route('verification.email.update'), ['email' => 'corrected@example.com', 'current_password' => 'password'])->assertSessionHasNoErrors();
    expect($user->fresh()->email)->toBe('corrected@example.com');
    $this->post(route('verification.code'), ['code' => $old])->assertSessionHasErrors('code');
    $this->post(route('verification.code'), ['code' => accountVerificationCode($user)])->assertRedirect('/application');
});
