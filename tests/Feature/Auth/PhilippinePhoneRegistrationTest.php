<?php

use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\Notification;

test('Philippine international mobile signup stores the existing normalized local identifier', function (string $phone) {
    Notification::fake();

    $this->post('/register', sharedRegistrationData(['phone' => $phone]))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));

    $user = User::where('email', 'shared@example.com')->sole();
    expect($user->phone)->toBe('09171234567');
    expect($user->phone_normalized)->toBe('09171234567');
    Notification::assertSentTo($user, VerifyAccountEmail::class);
})->with(['639171234567', '+639171234567', '09171234567']);

test('international signup cannot reuse the mobile number of a local-format account', function () {
    Notification::fake();
    User::factory()->create(['phone' => '09171234567']);

    $this->post('/register', sharedRegistrationData(['phone' => '639171234567']))->assertSessionHasErrors('phone');

    $this->assertDatabaseCount('users', 1);
    Notification::assertNothingSent();
});
