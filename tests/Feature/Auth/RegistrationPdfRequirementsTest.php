<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

test('all registration roles require sex and birthday and keep middle initial optional', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $data = match ($role) {
        'seller' => sellerRegistrationData(), 'courier' => riderRegistrationData(),
        'sorting_center' => logisticsRegistrationData(), default => sharedRegistrationData(),
    };
    $this->post('/register', [...$data, 'sex' => null])->assertSessionHasErrors('sex');
    $this->post('/register', [...$data, 'birthday' => null])->assertSessionHasErrors('birthday');
    $this->assertDatabaseCount('registration_applications', 0);

    $this->post('/register', [...$data, 'middle_initial' => null, 'age' => 999])->assertSessionHasNoErrors();
    $user = User::where('email', $data['email'])->firstOrFail();
    $this->assertDatabaseHas('user_profiles', ['user_id' => $user->id, 'sex' => 'female', 'birthday' => $data['birthday'], 'middle_initial' => null]);
    expect($user->application->address_id)->not->toBeNull();
    expect(DB::table('addresses')->where('id', $user->application->address_id)->value('line1'))->toBe($data['line1']);
})->with(['buyer', 'seller', 'courier', 'sorting_center']);

test('seller requires a business permit and duplicate emails show a specific error', function () {
    Notification::fake();
    Storage::fake('local');
    $data = sellerRegistrationData();
    $this->post('/register', [...$data, 'business_permit' => null])->assertSessionHasErrors('business_permit');
    User::factory()->create(['email' => $data['email']]);
    $this->post('/register', [...$data, 'email' => strtoupper($data['email'])])
        ->assertSessionHasErrors(['email' => 'This email is already registered.']);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_documents', 0);
    Notification::assertNothingSent();
});
