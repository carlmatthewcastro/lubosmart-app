<?php

use App\Models\RegistrationApplication;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use App\Services\RegisterAccount;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

test('shared signup accepts Filipino names and inclusive name boundaries', function (string $first, string $last) {
    Notification::fake();

    $this->post('/register', sharedRegistrationData(['first_name' => $first, 'last_name' => $last]))
        ->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));

    $this->assertDatabaseHas('user_profiles', ['first_name' => $first, 'last_name' => $last]);
    $user = User::where('email', 'shared@example.com')->firstOrFail();
    expect(Hash::check('Register@2026', $user->password))->toBeTrue();
    Notification::assertSentTo($user, VerifyAccountEmail::class);
})->with([
    ['Niño Angelo', "Peñaflor-O'Hara"], ['Jo', 'Li'],
    ['Maria Cristina Angelica Bernadette Josefina Leonor', 'Dela Cruz'], ['José A.', 'Muñoz'],
]);

test('shared signup rejects invalid names without creating or notifying', function (string $name) {
    Notification::fake();

    $this->post('/register', sharedRegistrationData(['first_name' => $name]))->assertSessionHasErrors('first_name');

    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(['J', str_repeat('a', 51), 'Juan123', 'Juan@#', '   ', ".'-"]);

test('shared signup rejects invalid email formats', function (string $email) {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['email' => $email]))->assertSessionHasErrors('email');
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(['no-at.example.com', 'name@', '@example.com', 'name@example', 'two words@example.com']);

test('shared signup trims and lowercases email and normalizes international mobile', function () {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['email' => '  JUAN@EXAMPLE.COM  ', 'phone' => '+639171234567']))->assertSessionHasNoErrors();
    $this->assertDatabaseHas('users', ['email' => 'juan@example.com', 'email_normalized' => 'juan@example.com', 'phone' => '09171234567', 'phone_normalized' => '09171234567']);
    Notification::assertSentTo(User::where('email', 'juan@example.com')->firstOrFail(), VerifyAccountEmail::class);
});

test('shared signup rejects email and mobile duplicates across roles', function (string $field, string $value) {
    Notification::fake();
    User::factory()->create(['role' => 'seller', 'email' => 'Existing@Example.com', 'phone' => '+639171234567']);
    $this->post('/register', sharedRegistrationData([$field => $value]))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 1);
    Notification::assertNothingSent();
})->with([['email', '  EXISTING@EXAMPLE.COM '], ['phone', '09171234567'], ['phone', '+639171234567']]);

test('shared signup rejects invalid Philippine mobile numbers', function (string $phone) {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['phone' => $phone]))->assertSessionHasErrors('phone');
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(['0917ABC4567', '0917-123-456', '12345678901', '02-8123-4567', '0917123456', '091712345678', '+63917123456', '+6391712345678']);

test('shared signup enforces password complexity', function (string $password) {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['password' => $password, 'password_confirmation' => $password]))->assertSessionHasErrors('password');
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(['Bili@26', 'mamimili@2026', 'MAMIMILI@2026', 'Mamimili@abcd', 'Mamimili2026', 'Mamimili2026 ']);

test('shared signup accepts a complex password at eight characters', function () {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['password' => 'Bili@202', 'password_confirmation' => 'Bili@202']))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('users', 1);
    Notification::assertSentTo(User::firstOrFail(), VerifyAccountEmail::class);
});

test('shared signup requires matching confirmation', function () {
    Notification::fake();
    $this->post('/register', sharedRegistrationData(['password_confirmation' => 'Different@2026']))->assertSessionHasErrors('password');
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
});

test('shared signup requires each mandatory field', function (string $field) {
    Notification::fake();
    $data = sharedRegistrationData();
    unset($data[$field]);
    $this->post('/register', $data)->assertSessionHasErrors($field === 'password_confirmation' ? 'password' : $field);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(['first_name', 'last_name', 'email', 'phone', 'birthday', 'role', 'password', 'password_confirmation', 'policy_accepted']);

test('shared signup rejects false consent and privileged roles', function (array $change, string $field) {
    Notification::fake();
    $this->post('/register', sharedRegistrationData($change))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with([[['policy_accepted' => false], 'policy_accepted'], [['role' => 'admin'], 'role'], [['role' => 'owner'], 'role']]);

test('shared signup rejects malformed field types without a server error', function (array $change, string $field) {
    Notification::fake();
    $this->post('/register', sharedRegistrationData($change))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with([
    [['role' => ['buyer']], 'role'], [['email' => ['shared@example.com']], 'email'],
    [['phone' => ['09170000001']], 'phone'], [['first_name' => ['Juan']], 'first_name'],
    [['birthday' => ['1995-01-01']], 'birthday'], [['password' => ['Register@2026']], 'password'],
]);

test('application submission applies shared name age and duplicate mobile validation', function (array $change, string $field) {
    Notification::fake();
    $other = User::factory()->create(['phone' => '+639171234567']);
    $user = User::factory()->create(['status' => 'incomplete']);
    RegistrationApplication::create(['user_id' => $user->id, 'requested_role' => 'buyer']);
    $data = ['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'sex' => 'male', 'birthday' => '1995-01-01', 'phone' => '09170000002',
        'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => 'Test street', 'zip' => '4000',
        'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'), 'policy_accepted' => true];
    $this->actingAs($user)->post('/application', array_replace($data, $change))->assertSessionHasErrors($field);
    expect($user->fresh()->status)->toBe('incomplete');
    expect($other->fresh()->phone)->toBe('+639171234567');
    $this->assertDatabaseCount('registration_documents', 0);
    Notification::assertNothingSent();
})->with([
    [['first_name' => 'Juan123'], 'first_name'], [['last_name' => str_repeat('a', 51)], 'last_name'],
    [['birthday' => '2020-01-01'], 'birthday'], [['phone' => '09171234567'], 'phone'],
]);

test('profile mobile edits enforce global uniqueness while allowing the owners canonical number', function () {
    $user = User::factory()->create(['phone' => '09170000001']);
    User::factory()->create(['phone' => '09170000002']);
    $data = ['name' => $user->name, 'email' => $user->email, 'current_password' => 'password'];
    $this->actingAs($user)->patch('/settings/profile', [...$data, 'phone' => '+639170000002'])->assertSessionHasErrors('phone');
    $this->patch('/settings/profile', [...$data, 'phone' => '+639170000001'])->assertSessionHasNoErrors();
    expect($user->fresh()->phone)->toBe('09170000001');
});

test('shared signup enforces adulthood at the Manila date boundary', function (string $role, string $birthday, bool $accepted) {
    Notification::fake();
    $this->travelTo(Carbon\Carbon::parse('2026-10-13 00:01:00', 'Asia/Manila'));
    Storage::fake('local');
    $response = $this->post('/register', $role === 'seller' ? sellerRegistrationData(['birthday' => $birthday]) : sharedRegistrationData(['role' => $role, 'birthday' => $birthday]));
    if ($accepted) {
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('user_profiles', ['birthday' => $birthday]);
        Notification::assertSentTo(User::firstOrFail(), VerifyAccountEmail::class);
    } else {
        $response->assertSessionHasErrors('birthday');
        $this->assertDatabaseCount('users', 0);
        Notification::assertNothingSent();
    }
})->with([
    ['buyer', '2008-10-14', false], ['buyer', '2008-10-13', true], ['buyer', '2008-10-12', true],
    ['buyer', '2026-10-14', false],
    ['buyer', '2026-02-30', false], ['seller', '2010-01-01', true],
]);

test('database identifier constraints prevent duplicate inserts after validation races', function (string $field, string $value) {
    Notification::fake();
    $data = sharedRegistrationData();
    $first = app(RegisterAccount::class)->create($data);
    $second = array_replace($data, ['email' => 'second@example.com', 'phone' => '09170000002'], [$field => $value]);
    try {
        app(RegisterAccount::class)->create($second);
        test()->fail('A racing duplicate insert must not create an account.');
    } catch (ValidationException $exception) {
        expect($exception->errors())->toHaveKey($field);
    }
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('user_profiles', 1);
    $this->assertDatabaseCount('registration_applications', 1);
    expect($first->fresh()->status)->toBe('unverified');
    Notification::assertNothingSent();
})->with([['email', 'shared@example.com'], ['phone', '09170000001']]);

test('direct model saves cannot evade normalized database uniqueness', function () {
    User::factory()->create(['email' => 'First@Example.com']);
    expect(fn () => User::factory()->create(['email' => 'first@example.com']))->toThrow(UniqueConstraintViolationException::class);
    $this->assertDatabaseCount('users', 1);
});

test('existing password accounts still log in without the new signup password policy', function () {
    $user = User::factory()->create();
    $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasNoErrors()->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
});

test('shared application uploads validate MIME and inclusive byte boundaries', function (string $filename, int $size, string $mime, bool $accepted) {
    Storage::fake('local');
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);
    $user = User::factory()->create(['status' => 'incomplete']);
    $application = RegistrationApplication::create(['user_id' => $user->id, 'requested_role' => 'buyer']);
    $temporary = tempnam(sys_get_temp_dir(), 'lubosmart-upload-');
    $prefix = match ($mime) {
        'image/jpeg' => file_get_contents(public_path('images/marketplace/marketplace-hero-v2.jpg')),
        'image/png' => file_get_contents(public_path('images/brand/logo.png')),
        'application/pdf' => "%PDF-1.4\n",
        'image/gif' => base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),
        default => 'Synthetic invalid file',
    };
    file_put_contents($temporary, $prefix.str_repeat("\0", $size - strlen($prefix)));
    $file = new UploadedFile($temporary, $filename, $mime, null, true);
    $data = ['first_name' => 'Niño', 'last_name' => 'Dela Cruz', 'sex' => 'male', 'birthday' => '1995-01-01', 'phone' => '+639171234567',
        'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => 'Test street', 'zip' => '4000', 'identity' => $file, 'policy_accepted' => true];
    try {
        $response = $this->actingAs($user)->post('/application', $data);
    } finally {
        unlink($temporary);
    }
    if ($accepted) {
        $response->assertSessionHasNoErrors()->assertRedirect('/application/waiting');
        Storage::disk('local')->assertExists($application->fresh()->documents->sole()->path);
        expect($user->fresh()->phone)->toBe('09171234567');
        Http::assertSentCount(3);
    } else {
        $response->assertSessionHasErrors('identity');
        $this->assertDatabaseCount('registration_documents', 0);
        expect($user->fresh()->status)->toBe('incomplete');
        Http::assertNothingSent();
    }
})->with([
    ['id.jpg', 5138022, 'image/jpeg', true], ['id.png', 5242880, 'image/png', true], ['id.pdf', 716800, 'application/pdf', true],
    ['id.jpg', 5347738, 'image/jpeg', false], ['id.jpg', 5242881, 'image/jpeg', false], ['file.docx', 320, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false],
    ['file.gif', 480, 'image/gif', false], ['installer.exe', 100, 'application/x-msdownload', false],
]);
