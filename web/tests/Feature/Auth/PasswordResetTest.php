<?php

use App\Models\User;
use App\Notifications\EmailSecurityCode;
use Illuminate\Support\Facades\Notification;

test('reset password code request screen can be rendered', function () {
    $response = $this->get('/forgot-password');

    $response->assertStatus(200);
});

test('reset password code can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, EmailSecurityCode::class);
});

test('reset password screen can be rendered', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, EmailSecurityCode::class, function ($notification) use ($user) {
        $verified = $this->post('/password-code', ['email' => $user->email, 'code' => $notification->code])->assertSessionHasNoErrors();
        $response = $this->get($verified->headers->get('Location'));

        $response->assertStatus(200);

        return true;
    });
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, EmailSecurityCode::class, function ($notification) use ($user) {
        $verified = $this->post('/password-code', ['email' => $user->email, 'code' => $notification->code])->assertSessionHasNoErrors();
        $token = basename(parse_url($verified->headers->get('Location'), PHP_URL_PATH));
        $response = $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));

        return true;
    });
});
