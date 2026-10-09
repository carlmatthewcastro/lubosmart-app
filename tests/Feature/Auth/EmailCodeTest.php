<?php

use App\Models\User;
use App\Notifications\EmailSecurityCode;
use App\Services\EmailSecurityCodes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

function emailedCode(User $user, string $purpose = 'password'): string
{
    $code = '';
    Notification::assertSentTo($user, EmailSecurityCode::class, function ($notification) use (&$code, $purpose) {
        if ($notification->purpose !== $purpose) {
            return false;
        }
        $code = $notification->code;

        return true;
    });

    return $code;
}

test('forgot password sends a hashed six digit code with ten minute expiry', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->create();
    $this->post('/forgot-password', ['email' => $user->email])->assertRedirect('/password-code')
        ->assertSessionHas('status', EmailSecurityCodes::SENT_MESSAGE);
    $code = emailedCode($user);
    $record = DB::table('email_security_codes')->where('user_id', $user->id)->first();
    expect($code)->toMatch('/^\d{6}$/');
    expect(Hash::check($code, $record->code_hash))->toBeTrue();
    expect($record->code_hash)->not->toBe($code);
    expect($record->expires_at)->toBe(now()->addMinutes(10)->format('Y-m-d H:i:s'));
});

test('forgot password keeps the same response for missing and Google only accounts', function (string $kind) {
    Notification::fake();
    if ($kind === 'google') {
        User::factory()->create(['email' => 'private@example.com', 'google_id' => 'google-only', 'password' => null]);
    }
    $this->post('/forgot-password', ['email' => 'private@example.com'])->assertRedirect('/password-code')
        ->assertSessionHas('status', EmailSecurityCodes::SENT_MESSAGE);
    Notification::assertNothingSent();
    $this->assertDatabaseCount('email_security_codes', 0);
})->with(['missing', 'google']);

test('five wrong attempts lock a code even when the next code is correct', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->post('/forgot-password', ['email' => $user->email]);
    $code = emailedCode($user);
    $wrong = $code === '000000' ? '000001' : '000000';
    for ($i = 0; $i < 5; $i++) {
        $this->post('/password-code', ['email' => $user->email, 'code' => $wrong])->assertSessionHasErrors('code');
    }
    $this->post('/password-code', ['email' => $user->email, 'code' => $code])->assertSessionHasErrors('code');
    $this->assertDatabaseHas('email_security_codes', ['user_id' => $user->id, 'attempts' => 5, 'token_hash' => null]);
});

test('expired codes cannot produce reset tokens', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->post('/forgot-password', ['email' => $user->email]);
    $code = emailedCode($user);
    $this->travel(10)->minutes();
    $this->post('/password-code', ['email' => $user->email, 'code' => $code])->assertSessionHasErrors('code');
});

test('only three codes can be requested per email in an hour', function () {
    Notification::fake();
    $this->freezeTime();
    $user = User::factory()->create();
    for ($i = 0; $i < 4; $i++) {
        $this->post('/forgot-password', ['email' => $user->email])->assertRedirect('/password-code');
    }
    Notification::assertSentToTimes($user, EmailSecurityCode::class, 3);
    $this->assertDatabaseCount('email_code_requests', 3);
    $this->travel(61)->minutes();
    $this->post('/forgot-password', ['email' => $user->email])->assertRedirect('/password-code');
    Notification::assertSentToTimes($user, EmailSecurityCode::class, 4);
});

test('verified codes produce a one time hashed token and resetting revokes other devices', function () {
    Notification::fake();
    $user = User::factory()->create();
    DB::table('sessions')->insert(['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->timestamp]);
    $this->post('/forgot-password', ['email' => $user->email]);
    $code = emailedCode($user);
    $response = $this->post('/password-code', ['email' => $user->email, 'code' => $code])->assertSessionHasNoErrors();
    $url = $response->headers->get('Location');
    $token = basename(parse_url($url, PHP_URL_PATH));
    $record = DB::table('email_security_codes')->where('user_id', $user->id)->first();
    expect($record->token_hash)->toBe(hash('sha256', $token));
    expect($record->code_hash)->toBeNull();
    $this->post('/password-code', ['email' => $user->email, 'code' => $code])->assertSessionHasErrors('code');
    $this->post('/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'new-password', 'password_confirmation' => 'new-password'])->assertRedirect('/login');
    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
    $this->assertDatabaseCount('email_security_codes', 0);
    $this->assertDatabaseMissing('sessions', ['id' => 'other-device']);
    $this->post('/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'another-password', 'password_confirmation' => 'another-password'])->assertSessionHasErrors('code');
});

test('expired reset tokens and tokens for another user cannot reset a password', function (string $kind) {
    Notification::fake();
    $user = User::factory()->create();
    $this->post('/forgot-password', ['email' => $user->email]);
    $response = $this->post('/password-code', ['email' => $user->email, 'code' => emailedCode($user)]);
    $token = basename(parse_url($response->headers->get('Location'), PHP_URL_PATH));
    if ($kind === 'expired') {
        $this->travel(10)->minutes();
    } else {
        $user = User::factory()->create();
    }
    $this->post('/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'new-password', 'password_confirmation' => 'new-password'])->assertSessionHasErrors('code');
    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
})->with(['expired', 'other-user']);

test('profile confirmation codes cannot be used as password reset tokens', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->actingAs($user)->post('/settings/security-code', ['purpose' => 'profile']);
    $this->post('/settings/security-code/verify', ['purpose' => 'profile', 'code' => emailedCode($user, 'profile')])->assertSessionHasNoErrors();
    $this->put('/settings/password', ['password' => 'new-password', 'password_confirmation' => 'new-password'])->assertSessionHasErrors('code');
    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});
