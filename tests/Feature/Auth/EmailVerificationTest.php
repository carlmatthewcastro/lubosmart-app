<?php

use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function accountVerificationUrl(User $user): string
{
    return Notification::sent($user, VerifyAccountEmail::class)->last()->url;
}

test('email verification screen can be rendered', function () {
    $user = User::factory()->unverified()->create();

    $response = $this->actingAs($user)->get('/verify-email');

    $response->assertStatus(200)->assertInertia(fn (Assert $page) => $page->component('auth/verify-email')->where('email', $user->email)->where('cooldown', 0));
});

test('verification sends to the locked current email even when the caller has stale account data', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['email' => 'old-mailbox@example.com']);
    User::query()->whereKey($user->id)->update(['email' => 'current-mailbox@example.com']);
    $user->sendEmailVerificationNotification();
    Notification::assertSentTo($user, VerifyAccountEmail::class, fn ($notification, $channels, $recipient) => $recipient->email === 'current-mailbox@example.com');
    $this->assertDatabaseHas('email_verification_tokens', ['user_id' => $user->id, 'email' => 'current-mailbox@example.com']);
});

test('email can be verified', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    Event::fake([Verified::class]);
    $user->sendEmailVerificationNotification();
    Notification::assertSentTo($user, VerifyAccountEmail::class);
    $record = DB::table('email_verification_tokens')->where('user_id', $user->id)->first();
    $url = accountVerificationUrl($user);
    $token = basename(parse_url($url, PHP_URL_PATH));
    expect($record->token_hash)->toBe(hash('sha256', $token))->not->toBe($token);
    expect($record->expires_at)->toBe(now()->addDay()->format('Y-m-d H:i:s'));
    $response = $this->actingAs($user)->get($url);
    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    expect($user->fresh()->status)->toBe('incomplete');
    $response->assertRedirect(route('application.edit'));
    $this->get($url)->assertInertia(fn (Assert $page) => $page->component('auth/verification-result')->where('verified', false));
    Event::assertDispatchedTimes(Verified::class, 1);
});

test('email is not verified with invalid hash', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();
    $user->sendEmailVerificationNotification();
    $this->actingAs($user)->get(route('verification.verify', ['token' => str_repeat('x', 64)]))
        ->assertInertia(fn (Assert $page) => $page->where('verified', false));
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('verification links work on another device without creating an authenticated session', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $this->get(accountVerificationUrl($user))->assertInertia(fn (Assert $page) => $page->where('verified', true));
    $this->assertGuest();
    expect($user->fresh()->status)->toBe('incomplete');
    $this->actingAs($user->fresh())->get('/verify-email')->assertRedirect('/application');
});

test('verification never changes the current session to a different account', function () {
    Notification::fake();
    $owner = User::factory()->unverified()->create(['status' => 'unverified']);
    $other = User::factory()->create();
    $owner->sendEmailVerificationNotification();
    $this->actingAs($other)->get(accountVerificationUrl($owner))->assertInertia(fn (Assert $page) => $page->where('verified', true));
    $this->assertAuthenticatedAs($other);
    expect($owner->fresh()->hasVerifiedEmail())->toBeTrue();
});

test('verification links expire after 24 hours', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $url = accountVerificationUrl($user);
    $this->travel(24)->hours();
    $this->get($url)->assertInertia(fn (Assert $page) => $page->where('verified', false));
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('resending has a server enforced cooldown and replaces the earlier token', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $oldUrl = accountVerificationUrl($user);
    $this->actingAs($user)->post(route('verification.send'))->assertSessionHasErrors('email');
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
    $this->travel(60)->seconds();
    $this->post(route('verification.send'))->assertSessionHasNoErrors()->assertSessionHas('status', 'verification-link-sent');
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 2);
    $this->get($oldUrl)->assertInertia(fn (Assert $page) => $page->where('verified', false));
    $this->get(accountVerificationUrl($user))->assertRedirect('/application');
});

test('changing an unverified email requires the password and invalidates old links', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $oldUrl = accountVerificationUrl($user);
    $other = User::factory()->create();
    $this->actingAs($user)->patch(route('verification.email.update'), ['email' => 'corrected@example.com', 'current_password' => 'wrong'])->assertSessionHasErrors('code');
    $this->patch(route('verification.email.update'), ['email' => 'corrected@example.com', 'current_password' => 'password', 'user_id' => $other->id, 'status' => 'approved'])
        ->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    expect($user->fresh()->email)->toBe('corrected@example.com');
    expect($user->fresh()->status)->toBe('unverified');
    expect($other->fresh()->email)->toBe($other->email);
    $this->get($oldUrl)->assertInertia(fn (Assert $page) => $page->where('verified', false));
    $this->get(accountVerificationUrl($user->fresh()))->assertRedirect('/application');
});

test('all URLs redirect an authenticated unverified account to verification', function (string $url) {
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $this->actingAs($user)->get($url)->assertRedirect(route('verification.notice'));
})->with(['/', '/shop', '/settings/profile', '/application', '/application/waiting', '/orders', '/admin/audit-log']);
