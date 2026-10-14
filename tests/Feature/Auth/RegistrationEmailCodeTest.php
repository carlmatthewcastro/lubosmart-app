<?php

use App\Models\User;
use App\Notifications\EmailSecurityCode;
use App\Notifications\VerifyAccountEmail;
use App\Services\EmailSecurityCodes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

function registrationCodeFor(User $user): string
{
    return Notification::sent($user, VerifyAccountEmail::class)->last()->code;
}

test('registration email contains a hashed six digit code expiring in five minutes', function () {
    Notification::fake();
    $this->freezeTime();
    $this->post('/register', sharedRegistrationData())->assertSessionHasNoErrors();
    $user = User::where('email', 'shared@example.com')->firstOrFail();
    $code = registrationCodeFor($user);
    $record = DB::table('registration_email_codes')->where('user_id', $user->id)->first();
    expect($code)->toMatch('/\A[0-9]{6}\z/');
    expect($record->code_hash)->not->toBe($code);
    expect(Hash::check($code, $record->code_hash))->toBeTrue();
    expect($record->expires_at)->toBe(now()->addMinutes(5)->format('Y-m-d H:i:s'));
    expect((string) Notification::sent($user, VerifyAccountEmail::class)->last()->toMail($user)->render())->toContain($code, 'Expires in 5 minutes')->not->toContain('/verify-email/link/', '24 hours');
});

test('registration OTP applies buyer activation and partner approval boundaries without accepting privileges', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', $role === 'seller' ? sellerRegistrationData() : ($role === 'sorting_center' ? logisticsRegistrationData(['email' => 'shared@example.com']) : sharedRegistrationData(['role' => $role])))->assertSessionHasNoErrors();
    $user = User::where('email', 'shared@example.com')->firstOrFail();
    $this->post(route('verification.code'), ['code' => registrationCodeFor($user), 'user_id' => 999, 'status' => 'approved', 'role' => 'admin'])
        ->assertSessionHasNoErrors()->assertRedirect('/application/waiting');
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    expect($user->fresh()->status)->toBe('pending');
    expect($user->fresh()->role)->toBe($role);
    $this->assertDatabaseCount('email_verification_tokens', 0);
    if ($role !== 'buyer') {
        $this->get('/dashboard/'.$role)->assertRedirect('/application/waiting');
    }
})->with(['buyer', 'seller', 'sorting_center']);

test('registration OTP rejects malformed codes without changing account state', function (string $code) {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $this->actingAs($user)->post(route('verification.code'), ['code' => $code])->assertSessionHasErrors('code');
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    expect(DB::table('registration_email_codes')->where('user_id', $user->id)->value('attempts'))->toBe(0);
})->with(['12345', '1234567', '12AB56', '', '１２３４５６']);

test('five wrong registration codes lock out the correct code', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $code = registrationCodeFor($user);
    $wrong = $code === '000000' ? '111111' : '000000';
    $this->actingAs($user);
    for ($i = 0; $i < 5; $i++) {
        $this->post(route('verification.code'), ['code' => $wrong])->assertSessionHasErrors('code');
    }
    $this->post(route('verification.code'), ['code' => $code])->assertSessionHasErrors('code');
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    expect(DB::table('registration_email_codes')->where('user_id', $user->id)->value('attempts'))->toBe(5);
});

test('registration OTP enforces its exact expiration boundary', function (int $seconds, bool $valid) {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $code = registrationCodeFor($user);
    $this->travel($seconds)->seconds();
    $response = $this->actingAs($user)->post(route('verification.code'), ['code' => $code]);
    if ($valid) {
        $response->assertSessionHasNoErrors();
    } else {
        $response->assertSessionHasErrors('code');
    }
    expect($user->fresh()->hasVerifiedEmail())->toBe($valid);
})->with([[299, true], [300, false], [301, false]]);

test('resending rotates OTP and link with cooldown and hourly limits', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $old = registrationCodeFor($user);
    $oldUrl = route('verification.verify', ['token' => str_repeat('a', 64)]);
    $this->actingAs($user)->post(route('verification.send'))->assertSessionHasErrors('email');
    $this->travel(60)->seconds();
    $this->post(route('verification.send'))->assertSessionHasNoErrors();
    $new = registrationCodeFor($user);
    expect(Hash::check($old, DB::table('registration_email_codes')->where('user_id', $user->id)->value('code_hash')))->toBeFalse();
    $this->post(route('verification.code'), ['code' => $old])->assertSessionHasErrors('code');
    $this->get($oldUrl)->assertStatus(410);
    $this->post(route('verification.code'), ['code' => $new])->assertSessionHasNoErrors();
    $this->post(route('verification.code'), ['code' => $new])->assertForbidden();
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 2);
});

test('registration resend limits reset after one hour', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $this->actingAs($user);
    for ($i = 0; $i < 3; $i++) {
        $this->post(route('verification.send'))->assertSessionHasNoErrors();
        $this->travel(61)->seconds();
    }
    $this->post(route('verification.send'))->assertSessionHasErrors('email');
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 3);
    $this->travel(1)->hours();
    $this->post(route('verification.send'))->assertSessionHasNoErrors();
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 4);
});

test('OTP cannot verify a different account or a changed email', function () {
    Notification::fake();
    $owner = User::factory()->unverified()->create(['status' => 'unverified']);
    $other = User::factory()->unverified()->create(['status' => 'unverified']);
    $owner->sendEmailVerificationNotification();
    $this->actingAs($other)->post(route('verification.code'), ['code' => registrationCodeFor($owner), 'user_id' => $owner->id])->assertSessionHasErrors('code');
    $owner->forceFill(['email' => 'changed@example.com'])->save();
    $this->actingAs($owner)->post(route('verification.code'), ['code' => registrationCodeFor($owner)])->assertSessionHasErrors('code');
    expect($owner->fresh()->hasVerifiedEmail())->toBeFalse();
    expect($other->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('guests and suspended accounts cannot use registration verification', function () {
    $this->post(route('verification.code'), ['code' => '123456'])->assertRedirect('/login');
    $user = User::factory()->unverified()->create(['status' => 'suspended']);
    $this->actingAs($user)->post(route('verification.code'), ['code' => '123456'])->assertForbidden();
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('password recovery codes cannot verify registration or be consumed by its endpoint', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    app(EmailSecurityCodes::class)->send($user->email, 'password');
    $code = Notification::sent($user, EmailSecurityCode::class)->last()->code;
    $this->actingAs($user)->post(route('verification.code'), ['code' => $code])->assertSessionHasErrors('code');
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
    $this->assertDatabaseHas('email_security_codes', ['user_id' => $user->id, 'purpose' => 'password', 'attempts' => 0]);
    $this->assertDatabaseCount('registration_email_codes', 0);
});

test('legacy verification link consumes the registration code too', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create(['status' => 'unverified']);
    $user->sendEmailVerificationNotification();
    $notification = Notification::sent($user, VerifyAccountEmail::class)->last();
    $this->actingAs($user)->post(route('verification.code'), ['code' => $notification->code])->assertRedirect('/application');
    expect(DB::table('registration_email_codes')->where('user_id', $user->id)->value('consumed_at'))->not->toBeNull();
    $this->post(route('verification.code'), ['code' => $notification->code])->assertForbidden();
});
