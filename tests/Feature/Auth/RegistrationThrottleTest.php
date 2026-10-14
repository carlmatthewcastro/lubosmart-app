<?php

use Illuminate\Support\Facades\Notification;

test('address options do not consume the signup submission rate limit', function () {
    Notification::fake();
    $data = sharedRegistrationData();
    for ($attempt = 0; $attempt < 11; $attempt++) {
        $this->getJson(route('registration.options', ['regions' => 1]))->assertOk();
    }
    $this->post('/register', $data)->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $this->assertDatabaseCount('users', 1);
});

test('invalid registration submissions still reach the existing ten per minute limit', function () {
    Notification::fake();
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $this->post('/register', ['role' => 'buyer'])->assertSessionHasErrors('first_name');
    }
    $this->post('/register', ['role' => 'buyer'])->assertStatus(429);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
});
