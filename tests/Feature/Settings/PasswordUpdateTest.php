<?php

use App\Models\User;
use App\Notifications\EmailSecurityCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('password can be updated', function () {
    Notification::fake();
    $user = User::factory()->create();
    $this->actingAs($user)->post('/settings/security-code', ['purpose' => 'password'])->assertSessionHasNoErrors();
    Notification::assertSentTo($user, EmailSecurityCode::class);
    $this->post('/settings/security-code/verify', ['purpose' => 'password', 'code' => Notification::sent($user, EmailSecurityCode::class)->first()->code])->assertSessionHasNoErrors();

    $response = $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/password');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('email confirmation is required even when a current password is supplied', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasErrors('code')
        ->assertRedirect('/settings/password');
});

test('starting a password change sends a code without saving the proposed password', function () {
    Notification::fake();
    $admin = User::factory()->create();
    $password = $admin->password;

    $this->actingAs($admin)->withSession(['password_confirmation' => 'previous-confirmation'])
        ->from('/settings/password')->post('/settings/password/confirm', [
            'password' => 'ProposedPassword123', 'password_confirmation' => 'ProposedPassword123',
        ])->assertSessionHasNoErrors()->assertRedirect('/settings/password')->assertSessionMissing('password_confirmation');

    Notification::assertSentTo($admin, EmailSecurityCode::class, fn ($notification) => $notification->purpose === 'password');
    expect($admin->fresh()->password)->toBe($password);
    $this->assertDatabaseHas('email_security_codes', ['user_id' => $admin->id, 'purpose' => 'password', 'token_hash' => null]);
});

test('invalid proposed passwords do not send confirmation codes', function (array $data) {
    Notification::fake();
    $user = User::factory()->create();
    $password = $user->password;

    $this->actingAs($user)->post('/settings/password/confirm', $data)->assertSessionHasErrors('password');

    Notification::assertNothingSent();
    expect($user->fresh()->password)->toBe($password);
    $this->assertDatabaseCount('email_security_codes', 0);
    $this->assertDatabaseCount('email_code_requests', 0);
})->with([
    'empty' => [[]],
    'too short' => [['password' => 'short', 'password_confirmation' => 'short']],
    'mismatch' => [['password' => 'NewPassword123', 'password_confirmation' => 'DifferentPassword123']],
]);

test('starting a password change requires authentication', function () {
    Notification::fake();

    $this->post('/settings/password/confirm', [
        'password' => 'ProposedPassword123', 'password_confirmation' => 'ProposedPassword123',
    ])->assertRedirect('/login');

    Notification::assertNothingSent();
    $this->assertDatabaseCount('email_security_codes', 0);
});

test('Google only accounts cannot start a local password change', function () {
    Notification::fake();
    $user = User::factory()->create(['google_id' => 'google-only', 'password' => null]);

    $this->actingAs($user)->post('/settings/password/confirm', [
        'password' => 'ProposedPassword123', 'password_confirmation' => 'ProposedPassword123',
    ])->assertSessionHasErrors(['code' => 'This account uses Google only. Sign in with Google.']);

    Notification::assertNothingSent();
    expect($user->fresh()->password)->toBeNull();
    $this->assertDatabaseCount('email_security_codes', 0);
});

test('password settings show confirmation only while its session token is valid', function (string $kind, bool $confirmed) {
    $this->freezeTime();
    $user = User::factory()->create();
    $token = 'password-confirmation-token';
    DB::table('email_security_codes')->insert([
        'user_id' => $user->id, 'purpose' => 'password', 'email' => $user->email,
        'token_hash' => hash('sha256', $token), 'token_expires_at' => now()->addMinutes(10),
    ]);
    if ($kind === 'expired') {
        $this->travel(10)->minutes();
    } elseif ($kind === 'consumed') {
        DB::table('email_security_codes')->where('user_id', $user->id)->delete();
    } elseif ($kind === 'mismatched') {
        $token = 'unrelated-confirmation-token';
    }

    $this->actingAs($user)->withSession(['password_confirmation' => $token])->get('/settings/password')
        ->assertInertia(fn (Assert $page) => $page->component('settings/password')->where('confirmed', $confirmed));
})->with([
    'valid' => ['valid', true],
    'expired' => ['expired', false],
    'consumed' => ['consumed', false],
    'mismatched' => ['mismatched', false],
]);

test('admin password changes require email confirmation before saving', function () {
    Notification::fake();
    $admin = User::factory()->create(['role' => 'admin']);
    $password = $admin->password;
    $proposed = ['current_password' => 'password', 'password' => 'ProposedPassword123', 'password_confirmation' => 'ProposedPassword123'];
    $this->actingAs($admin)->from('/settings/password')->put('/settings/password', $proposed)
        ->assertSessionHasErrors('code');
    expect($admin->fresh()->password)->toBe($password);
    $this->post('/settings/password/confirm', $proposed)->assertSessionHasNoErrors();
    Notification::assertSentTo($admin, EmailSecurityCode::class);
    expect($admin->fresh()->password)->toBe($password);
    $code = Notification::sent($admin, EmailSecurityCode::class)->first()->code;
    $this->post('/settings/security-code/verify', ['purpose' => 'password', 'code' => $code])->assertSessionHasNoErrors();
    $this->put('/settings/password', $proposed)->assertSessionHasNoErrors()->assertSessionMissing('password_confirmation');
    expect(Hash::check('ProposedPassword123', $admin->fresh()->password))->toBeTrue();
    $this->assertDatabaseCount('email_security_codes', 0);
});

test('admin must confirm current password before requesting a change code', function () {
    Notification::fake();
    $admin = User::factory()->create(['role' => 'admin']);
    $password = $admin->password;
    $this->actingAs($admin)->post('/settings/password/confirm', ['current_password' => 'incorrect', 'password' => 'ProposedPassword123', 'password_confirmation' => 'ProposedPassword123'])->assertSessionHasErrors('current_password');
    Notification::assertNothingSent();
    expect($admin->fresh()->password)->toBe($password);
});
