<?php

use App\Models\RegistrationApplication;
use App\Models\Store;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use App\Notifications\VerifyAccountEmail;
use App\Services\RegisterAccount;
use Carbon\Carbon;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

function workbookSignup(string $role, array $changes = []): array
{
    return $role === 'seller' ? sellerRegistrationData($changes) : sharedRegistrationData($changes);
}

function workbookCreate(string $role): User
{
    test()->post('/register', workbookSignup($role))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));

    return User::where('email', 'shared@example.com')->firstOrFail();
}

function workbookVerify(User $user): void
{
    $code = Notification::sent($user, VerifyAccountEmail::class)->last()->code;
    test()->actingAs($user)->post(route('verification.code'), ['code' => $code])->assertSessionHasNoErrors();
}

it('saves the selected sex from initial registration', function (string $sex) {
    Notification::fake();
    Storage::fake('local');

    $this->post('/register', sharedRegistrationData(['sex' => $sex]))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('verification.notice'));

    $this->assertDatabaseHas('user_profiles', [
        'user_id' => User::where('email', 'shared@example.com')->firstOrFail()->id,
        'sex' => $sex,
    ]);
})->with(['female', 'male', 'prefer_not_to_say']);

it('rejects unsupported sex values during initial registration', function () {
    Notification::fake();
    Storage::fake('local');

    $this->post('/register', sharedRegistrationData(['sex' => 'invalid']))
        ->assertSessionHasErrors('sex');

    $this->assertDatabaseMissing('users', ['email' => 'shared@example.com']);
});

// Each ID is a separate dataset row; boundary variants remain independently executed.
dataset('workbook validation', [
    'TC-BUY-004 digits' => ['buyer', ['first_name' => 'Juan123'], 'first_name'],
    'TC-BUY-004 symbols' => ['buyer', ['last_name' => '@Cruz'], 'last_name'],
    'TC-BUY-006 one' => ['buyer', ['first_name' => 'A'], 'first_name'],
    'TC-BUY-006 fifty one' => ['buyer', ['last_name' => str_repeat('a', 51)], 'last_name'],
    'TC-BUY-007 under eighteen' => ['buyer', ['birthday' => '2008-10-14'], 'birthday'],
    'TC-BUY-008 future' => ['buyer', ['birthday' => '2026-10-14'], 'birthday'],
    'TC-BUY-009 no at' => ['buyer', ['email' => 'juanexample.com'], 'email'],
    'TC-BUY-009 no user' => ['buyer', ['email' => '@example.com'], 'email'],
    'TC-BUY-009 no domain' => ['buyer', ['email' => 'juan@'], 'email'],
    'TC-BUY-009 single label' => ['buyer', ['email' => 'juan@example'], 'email'],
    'TC-BUY-009 space' => ['buyer', ['email' => 'juan dela@example.com'], 'email'],
    'TC-BUY-013 letters' => ['buyer', ['phone' => '09abcdefgh1'], 'phone'],
    'TC-BUY-013 prefix' => ['buyer', ['phone' => '08171234567'], 'phone'],
    'TC-BUY-014 ten' => ['buyer', ['phone' => '0917123456'], 'phone'],
    'TC-BUY-014 twelve' => ['buyer', ['phone' => '091712345678'], 'phone'],
    'TC-BUY-017 seven' => ['buyer', ['password' => 'Abcd@12', 'password_confirmation' => 'Abcd@12'], 'password'],
    'TC-BUY-018 no upper' => ['buyer', ['password' => 'abcd@123', 'password_confirmation' => 'abcd@123'], 'password'],
    'TC-BUY-018 no lower' => ['buyer', ['password' => 'ABCD@123', 'password_confirmation' => 'ABCD@123'], 'password'],
    'TC-BUY-018 no number' => ['buyer', ['password' => 'Abcdef@x', 'password_confirmation' => 'Abcdef@x'], 'password'],
    'TC-BUY-018 no special' => ['buyer', ['password' => 'Abcdef12', 'password_confirmation' => 'Abcdef12'], 'password'],
    'TC-BUY-019 mismatch' => ['buyer', ['password_confirmation' => 'Wrong@2026'], 'password'],
    'TC-BUY-021 unchecked' => ['buyer', ['policy_accepted' => false], 'policy_accepted'],
    'TC-SEL-004 digits' => ['seller', ['first_name' => 'Maria123'], 'first_name'],
    'TC-SEL-004 symbols' => ['seller', ['last_name' => '@Santos'], 'last_name'],
    'TC-SEL-006 one' => ['seller', ['first_name' => 'A'], 'first_name'],
    'TC-SEL-006 fifty one' => ['seller', ['last_name' => str_repeat('a', 51)], 'last_name'],
    'TC-SEL-007 no at' => ['seller', ['email' => 'mariaexample.com'], 'email'],
    'TC-SEL-007 no user' => ['seller', ['email' => '@example.com'], 'email'],
    'TC-SEL-007 no domain' => ['seller', ['email' => 'maria@'], 'email'],
    'TC-SEL-007 single label' => ['seller', ['email' => 'maria@example'], 'email'],
    'TC-SEL-007 space' => ['seller', ['email' => 'maria clara@example.com'], 'email'],
    'TC-SEL-011 letters' => ['seller', ['phone' => '09abcdefgh1'], 'phone'],
    'TC-SEL-011 prefix' => ['seller', ['phone' => '08171234567'], 'phone'],
    'TC-SEL-012 ten' => ['seller', ['phone' => '0917123456'], 'phone'],
    'TC-SEL-012 twelve' => ['seller', ['phone' => '091712345678'], 'phone'],
    'TC-SEL-015 seven' => ['seller', ['password' => 'Abcd@12', 'password_confirmation' => 'Abcd@12'], 'password'],
    'TC-SEL-016 no upper' => ['seller', ['password' => 'abcd@123', 'password_confirmation' => 'abcd@123'], 'password'],
    'TC-SEL-016 no lower' => ['seller', ['password' => 'ABCD@123', 'password_confirmation' => 'ABCD@123'], 'password'],
    'TC-SEL-016 no number' => ['seller', ['password' => 'Abcdef@x', 'password_confirmation' => 'Abcdef@x'], 'password'],
    'TC-SEL-016 no special' => ['seller', ['password' => 'Abcdef12', 'password_confirmation' => 'Abcdef12'], 'password'],
    'TC-SEL-017 mismatch' => ['seller', ['password_confirmation' => 'Wrong@2026'], 'password'],
    'TC-SEL-019 unchecked' => ['seller', ['policy_accepted' => false], 'policy_accepted'],
    'TC-SEL-022 two' => ['seller', ['business_name' => 'AB'], 'business_name'],
    'TC-SEL-022 thirty one' => ['seller', ['business_name' => str_repeat('a', 31)], 'business_name'],
    'TC-SEL-024 missing SEC' => ['seller', ['seller_type' => 'corporation'], 'sec_certificate'],
    'TC-SEL-025 eleven digits' => ['seller', ['tin' => '123-456-789-00'], 'tin'],
    'TC-SEL-025 thirteen digits' => ['seller', ['tin' => '123-456-789-0000'], 'tin'],
    'TC-SEL-025 letters' => ['seller', ['tin' => '123-456-ABC-000'], 'tin'],
    'TC-SEL-025 unformatted' => ['seller', ['tin' => '123456789000'], 'tin'],
    'TC-SEL-027 forged region' => ['seller', ['region_code' => '070000000'], 'barangay_code'],
    'TC-SEL-028 three' => ['seller', ['zip' => '112'], 'zip'],
    'TC-SEL-028 five' => ['seller', ['zip' => '11211'], 'zip'],
    'TC-SEL-028 letters' => ['seller', ['zip' => 'ABCD'], 'zip'],
]);

test('workbook rejects invalid registration without accounts files or email', function (string $role, array $changes, string $field) {
    $this->travelTo(Carbon::parse('2026-10-13 12:00', 'Asia/Manila'));
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', workbookSignup($role, $changes))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('registration_documents', 0);
    expect(Storage::disk('local')->allFiles())->toBe([]);
    Notification::assertNothingSent();
})->with('workbook validation');

test('workbook accepts valid boundaries and normalizes registration', function (string $role, array $changes) {
    $this->travelTo(Carbon::parse('2026-10-13 12:00', 'Asia/Manila'));
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', workbookSignup($role, $changes))->assertSessionHasNoErrors();
    $user = User::firstOrFail();
    expect($user->status)->toBe('unverified');
    expect($user->email)->toBe('shared@example.com');
    expect($user->phone)->toBe('09170000001');
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
})->with([
    'TC-BUY-005 Filipino' => ['buyer', ['first_name' => 'José Niño', 'last_name' => "Dela-Cruz O'Ñeill Jr."]],
    'TC-BUY-006 two' => ['buyer', ['first_name' => 'Jo']], 'TC-BUY-006 fifty' => ['buyer', ['first_name' => str_repeat('ñ', 50)]],
    'TC-BUY-007 eighteen' => ['buyer', ['birthday' => '2008-10-13']], 'TC-BUY-007 eighteen plus day' => ['buyer', ['birthday' => '2008-10-12']],
    'TC-BUY-011 uppercase' => ['buyer', ['email' => 'SHARED@EXAMPLE.COM']], 'TC-BUY-012 spaces' => ['buyer', ['email' => ' shared@example.com ']],
    'TC-BUY-014 eleven' => ['buyer', []], 'TC-BUY-016 international' => ['buyer', ['phone' => '+639170000001']],
    'TC-BUY-017 eight' => ['buyer', ['password' => 'Abcd@123', 'password_confirmation' => 'Abcd@123']],
    'TC-SEL-005 Filipino' => ['seller', ['first_name' => 'José Niño', 'last_name' => "Dela-Cruz O'Ñeill Jr."]],
    'TC-SEL-006 two' => ['seller', ['first_name' => 'Jo']], 'TC-SEL-006 fifty' => ['seller', ['first_name' => str_repeat('ñ', 50)]],
    'TC-SEL-009 uppercase' => ['seller', ['email' => 'SHARED@EXAMPLE.COM']], 'TC-SEL-010 spaces' => ['seller', ['email' => ' shared@example.com ']],
    'TC-SEL-012 eleven' => ['seller', []], 'TC-SEL-014 international' => ['seller', ['phone' => '+639170000001']],
    'TC-SEL-015 eight' => ['seller', ['password' => 'Abcd@123', 'password_confirmation' => 'Abcd@123']],
    'TC-SEL-022 three' => ['seller', ['business_name' => 'ABC']], 'TC-SEL-022 thirty' => ['seller', ['business_name' => str_repeat('a', 30)]],
    'TC-SEL-025 twelve' => ['seller', []], 'TC-SEL-028 four' => ['seller', []],
]);

test('workbook empty forms report required fields', function (string $role) {
    Notification::fake();
    $response = $this->post('/register', ['role' => $role]);
    $response->assertSessionHasErrors(['first_name', 'last_name', 'email', 'phone', 'password', 'policy_accepted']);
    if ($role === 'seller') {
        $response->assertSessionHasErrors(['business_name', 'business_category_id', 'seller_type', 'tin', 'region_code', 'province_code', 'city_code', 'barangay_code', 'line1', 'zip', 'identity']);
    } else {
        $response->assertSessionHasErrors('birthday');
    }
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(['TC-BUY-002' => 'buyer', 'TC-SEL-002' => 'seller']);

test('workbook individual required fields cannot be omitted', function (string $role, string $field) {
    Notification::fake();
    Storage::fake('local');
    $data = workbookSignup($role);
    unset($data[$field]);
    $this->post('/register', $data)->assertSessionHasErrors($field === 'password_confirmation' ? 'password' : $field);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with(array_merge(
    array_combine(array_map(fn ($field) => 'TC-BUY-003 '.$field, ['first_name', 'last_name', 'email', 'phone', 'birthday', 'password', 'password_confirmation']), array_map(fn ($field) => ['buyer', $field], ['first_name', 'last_name', 'email', 'phone', 'birthday', 'password', 'password_confirmation'])),
    array_combine(array_map(fn ($field) => 'TC-SEL-003 '.$field, ['first_name', 'last_name', 'email', 'phone', 'password', 'password_confirmation', 'business_name', 'business_category_id', 'seller_type', 'tin', 'region_code', 'province_code', 'city_code', 'barangay_code', 'line1', 'zip', 'identity', 'dti_certificate', 'bir_2303']), array_map(fn ($field) => ['seller', $field], ['first_name', 'last_name', 'email', 'phone', 'password', 'password_confirmation', 'business_name', 'business_category_id', 'seller_type', 'tin', 'region_code', 'province_code', 'city_code', 'barangay_code', 'line1', 'zip', 'identity', 'dti_certificate', 'bir_2303']))
));

test('workbook detects existing identifiers across roles', function (string $role, string $field) {
    Notification::fake();
    Storage::fake('local');
    $data = workbookSignup($role);
    $other = User::factory()->create(['email' => $field === 'email' ? 'SHARED@example.com' : 'other@example.com', 'phone' => $field === 'phone' ? '+639170000001' : null]);
    if ($field === 'business_name') {
        Store::create(['user_id' => $other->id, 'name' => ' MARIA CLARA HANDICRAFTS ']);
    }
    if ($field === 'tin') {
        RegistrationApplication::create(['user_id' => $other->id, 'requested_role' => 'sorting_center', 'tin' => '123-456-789-000']);
    }
    $this->post('/register', $data)->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 1);
    Notification::assertNothingSent();
})->with(['TC-BUY-010' => ['buyer', 'email'], 'TC-BUY-015' => ['buyer', 'phone'], 'TC-SEL-008' => ['seller', 'email'], 'TC-SEL-013' => ['seller', 'phone'], 'TC-SEL-021' => ['seller', 'business_name'], 'TC-SEL-026' => ['seller', 'tin']]);

test('workbook successful signup saves an unverified account and sends one OTP', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $user = workbookCreate($role);
    expect($user->email_verified_at)->toBeNull();
    expect($user->status)->toBe('unverified');
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
    if ($role === 'seller') {
        expect($user->application->status)->toBe('submitted');
        expect($user->store->status)->toBe('pending');
        $this->assertDatabaseCount('registration_documents', 4);
    }
})->with(['TC-BUY-001' => 'buyer', 'TC-SEL-001' => 'seller']);

test('workbook correct OTP enters the appropriate operational state', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $user = workbookCreate($role);
    workbookVerify($user);
    expect($user->fresh()->status)->toBe('pending');
    if ($role === 'buyer') {
        $this->get('/cart')->assertRedirect(route('application.waiting'));
    } else {
        $this->get('/inventory')->assertRedirect(route('application.waiting'));
    }
})->with(['TC-BUY-023' => 'buyer', 'TC-SEL-032' => 'seller']);

test('workbook OTP rejects wrong malformed and expired codes', function (string $role, string $mode) {
    Notification::fake();
    Storage::fake('local');
    $this->freezeTime();
    $user = workbookCreate($role);
    $code = Notification::sent($user, VerifyAccountEmail::class)->last()->code;
    if ($mode === 'expired') {
        $this->travel(301)->seconds();
    }
    $inputs = match ($mode) {
        'wrong' => [$code === '000000' ? '111111' : '000000'], 'format' => ['', '12345', '1234567', 'ABCDEF'], default => [$code]
    };
    foreach ($inputs as $input) {
        $this->post(route('verification.code'), ['code' => $input])->assertSessionHasErrors('code');
    }
    expect($user->fresh()->status)->toBe('unverified');
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
})->with(['TC-BUY-024' => ['buyer', 'wrong'], 'TC-BUY-025' => ['buyer', 'format'], 'TC-BUY-026' => ['buyer', 'expired'], 'TC-SEL-033' => ['seller', 'wrong'], 'TC-SEL-034' => ['seller', 'format'], 'TC-SEL-035' => ['seller', 'expired']]);

test('workbook resend invalidates old OTP and accepts replacement', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $user = workbookCreate($role);
    $old = Notification::sent($user, VerifyAccountEmail::class)->last()->code;
    $this->travel(61)->seconds();
    $this->post(route('verification.send'))->assertSessionHasNoErrors();
    $this->post(route('verification.code'), ['code' => $old])->assertSessionHasErrors('code');
    workbookVerify($user);
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 2);
})->with(['TC-BUY-027' => 'buyer', 'TC-SEL-036' => 'seller']);

test('workbook unverified login remains restricted', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $user = workbookCreate($role);
    $this->post('/logout');
    $this->post('/login', ['email' => $user->email, 'password' => 'Register@2026'])->assertRedirect(route('verification.notice'));
    $this->get('/dashboard/'.$role)->assertRedirect(route('verification.notice'));
})->with(['TC-BUY-028' => 'buyer', 'TC-SEL-037' => 'seller']);

test('TC-BUY-029 verified active buyer logs in and retains the correct name', function () {
    Notification::fake();
    $user = workbookCreate('buyer');
    workbookVerify($user);
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$user->application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    $this->post('/logout');
    $this->post('/login', ['email' => $user->email, 'password' => 'Register@2026'])->assertRedirect(route('dashboard', absolute: false));
    $this->get('/dashboard/buyer')->assertOk();
    expect($user->fresh()->name)->toBe('Test User');
});

test('workbook role dashboards deny foreign roles', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    foreach (array_diff(['buyer', 'seller', 'courier', 'sorting_center', 'admin'], [$role]) as $target) {
        $this->actingAs($user)->get('/dashboard/'.$target)->assertForbidden();
    }
})->with(['TC-BUY-030' => 'buyer', 'TC-SEL-044' => 'seller']);

test('TC-SEL-023 seller types require exactly their relevant documents', function (string $type, array $kinds) {
    Notification::fake();
    Storage::fake('local');
    $data = sellerRegistrationData(['seller_type' => $type]);
    unset($data['dti_certificate'], $data['bir_2303']);
    foreach (array_diff($kinds, ['identity']) as $kind) {
        $data[$kind] = UploadedFile::fake()->create($kind.'.pdf', 10, 'application/pdf');
    }
    $this->post('/register', $data)->assertSessionHasNoErrors();
    expect(User::firstOrFail()->application->documents->pluck('kind')->sort()->values()->all())->toBe(collect($kinds)->sort()->values()->all());
})->with([['individual', ['identity', 'business_permit']], ['sole_proprietorship', ['identity', 'business_permit', 'dti_certificate', 'bir_2303']], ['corporation', ['identity', 'business_permit', 'sec_certificate', 'bir_2303']]]);

test('TC-SEL-038 pending seller cannot operate inventory or orders', function () {
    Notification::fake();
    Storage::fake('local');
    $user = workbookCreate('seller');
    workbookVerify($user);
    foreach (['/inventory', '/orders', '/dashboard/seller'] as $url) {
        $this->get($url)->assertRedirect(route('application.waiting'));
    }
    $this->post('/inventory', ['name' => 'Forbidden product'])->assertRedirect(route('application.waiting'));
    $this->assertDatabaseCount('products', 0);
});

test('TC-SEL-039 admin review exposes saved details and private document links', function () {
    Notification::fake();
    Storage::fake('local');
    $seller = workbookCreate('seller');
    workbookVerify($seller);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->post('/logout');
    $this->actingAs($admin)->getJson('/reviews/'.$seller->application->id)->assertOk()->assertJsonPath('application.tin', '123-456-789-000')->assertJsonPath('application.seller_type', 'sole_proprietorship')->assertJsonCount(4, 'documents');
    $this->get('/reviews')->assertOk();
});

test('TC-SEL-040 admin approval enables seller operations and sends decision email', function () {
    Notification::fake();
    Storage::fake('local');
    $seller = workbookCreate('seller');
    workbookVerify($seller);
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$seller->application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    expect($seller->fresh()->status)->toBe('approved');
    expect($seller->store->fresh()->status)->toBe('approved');
    $this->post('/logout');
    $this->actingAs($seller->fresh())->get('/inventory')->assertOk();
    Notification::assertSentTo($seller, ApplicationReviewed::class);
});

test('TC-SEL-041 rejection requires reason emails it and blocks operations', function () {
    Notification::fake();
    Storage::fake('local');
    $seller = workbookCreate('seller');
    workbookVerify($seller);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->post('/logout');
    $this->actingAs($admin)->patch('/reviews/'.$seller->application->id, ['decision' => 'rejected'])->assertSessionHasErrors('reason');
    $this->patch('/reviews/'.$seller->application->id, ['decision' => 'rejected', 'reason' => 'Please replace the unreadable DTI certificate.'])->assertSessionHasNoErrors();
    expect($seller->fresh()->status)->toBe('rejected');
    expect($seller->application->fresh()->rejection_reason)->toContain('DTI');
    $this->post('/logout');
    Notification::assertSentTo($seller, ApplicationReviewed::class);
    $this->actingAs($seller->fresh())->get('/inventory')->assertRedirect(route('application.edit'));
});

test('TC-SEL-042 rejected seller replaces document and resubmits without another account', function () {
    Notification::fake();
    Storage::fake('local');
    $seller = workbookCreate('seller');
    workbookVerify($seller);
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$seller->application->id, ['decision' => 'rejected', 'reason' => 'Replace DTI'])->assertSessionHasNoErrors();
    $old = $seller->application->documents->firstWhere('kind', 'dti_certificate');
    $data = sellerRegistrationData();
    unset($data['identity'], $data['bir_2303'], $data['business_permit']);
    $this->post('/logout');
    $this->actingAs($seller->fresh())->post('/application', $data)->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($seller->fresh()->status)->toBe('pending');
    expect($seller->application->fresh()->rejection_reason)->toBeNull();
    $this->assertDatabaseCount('users', 2);
    $this->assertDatabaseCount('registration_documents', 5);
    Storage::disk('local')->assertExists($old->path);
    $this->actingAs($seller->fresh())->get('/application')->assertRedirect(route('application.waiting'));
});

test('TC-SEL-043 buyer cannot review approve or reject a seller', function () {
    Notification::fake();
    Storage::fake('local');
    $seller = workbookCreate('seller');
    workbookVerify($seller);
    $buyer = User::factory()->create();
    $this->post('/logout');
    $this->actingAs($buyer)->get('/reviews')->assertForbidden();
    $this->getJson('/reviews/'.$seller->application->id)->assertForbidden();
    foreach (['approved', 'rejected'] as $decision) {
        $this->patch('/reviews/'.$seller->application->id, ['decision' => $decision, 'reason' => 'Forged'])->assertForbidden();
    }
    expect($seller->fresh()->status)->toBe('pending');
    Notification::assertNotSentTo($seller, ApplicationReviewed::class);
});

test('workbook repeated registration persists one account and one OTP', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $data = workbookSignup($role);
    app(RegisterAccount::class)->create($data)->sendEmailVerificationNotification();
    for ($i = 0; $i < 2; $i++) {
        try {
            app(RegisterAccount::class)->create($data);
            test()->fail('Duplicate must be rejected.');
        } catch (ValidationException $exception) {
            expect($exception->errors())->toHaveKey('email');
        }
    }
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_email_codes', 1);
    Notification::assertSentToTimes(User::firstOrFail(), VerifyAccountEmail::class, 1);
})->with(['TC-BUY-022' => 'buyer', 'TC-SEL-020' => 'seller']);

test('workbook password visibility requires manual browser verification', function () {})->with(['TC-BUY-020', 'TC-SEL-018'])->skip('NOT RUN: password masking and toggle require a real browser.');

test('workbook seller upload validates content and exact size before creating an account', function (string $filename, string $mime, int $size, bool $valid) {
    Notification::fake();
    Storage::fake('local');
    $path = tempnam(sys_get_temp_dir(), 'lubosmart-seller-upload-');
    $prefix = match ($mime) {
        'image/jpeg' => file_get_contents(public_path('images/marketplace/marketplace-hero-v2.jpg')),
        'image/png' => file_get_contents(public_path('images/brand/logo.png')),
        'application/pdf' => "%PDF-1.4\n",
        'image/gif' => base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),
        default => 'Invalid upload',
    };
    file_put_contents($path, $prefix.str_repeat("\0", $size - strlen($prefix)));
    try {
        $data = sellerRegistrationData(['identity' => new UploadedFile($path, $filename, $mime, null, true)]);
        $response = $this->post('/register', $data);
        if ($valid) {
            $response->assertSessionHasNoErrors();
            $user = User::firstOrFail();
            $document = $user->application->documents->firstWhere('kind', 'identity');
            expect($document->size_bytes)->toBe($size);
            Storage::disk('local')->assertExists($document->path);
            Notification::assertSentTo($user, VerifyAccountEmail::class);
        } else {
            $response->assertSessionHasErrors('identity');
            $this->assertDatabaseCount('users', 0);
            expect(Storage::disk('local')->allFiles())->toBe([]);
            Notification::assertNothingSent();
        }
    } finally {
        unlink($path);
    }
})->with([
    'TC-SEL-029 JPG' => ['id.jpg', 'image/jpeg', 5138022, true], 'TC-SEL-029 PNG' => ['id.png', 'image/png', 5242880, true], 'TC-SEL-029 PDF' => ['id.pdf', 'application/pdf', 716800, true],
    'TC-SEL-030 DOCX' => ['file.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 100, false],
    'TC-SEL-030 GIF' => ['file.gif', 'image/gif', 480, false], 'TC-SEL-030 EXE' => ['file.exe', 'application/x-msdownload', 100, false],
    'TC-SEL-031 below' => ['id.jpg', 'image/jpeg', 5138022, true], 'TC-SEL-031 exact' => ['id.jpg', 'image/jpeg', 5242880, true],
    'TC-SEL-031 one byte above' => ['id.jpg', 'image/jpeg', 5242881, false], 'TC-SEL-031 above' => ['id.jpg', 'image/jpeg', 5347738, false],
]);

test('seller shop and TIN database constraints reject post validation races', function (string $field) {
    Notification::fake();
    Storage::fake('local');
    $data = sellerRegistrationData();
    app(RegisterAccount::class)->create($data);
    $second = sellerRegistrationData(['email' => 'second@example.com', 'phone' => '09170000002', 'business_name' => 'Another shop', 'tin' => '456-789-012-000']);
    $second[$field] = $data[$field];
    try {
        app(RegisterAccount::class)->create($second);
        test()->fail('Unique business identifiers must prevent racing account creation.');
    } catch (ValidationException $exception) {
        expect($exception->errors())->toHaveKey($field);
    }
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_documents', 4);
    $this->assertDatabaseCount('stores', 1);
    Notification::assertNothingSent();
})->with(['TC-SEL-021 database race' => 'business_name', 'TC-SEL-026 database race' => 'tin']);

test('admin cannot approve an unverified seller or a seller with missing private documents', function () {
    Notification::fake();
    Storage::fake('local');
    $seller = workbookCreate('seller');
    $this->post('/logout');
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch('/reviews/'.$seller->application->id, ['decision' => 'approved'])->assertSessionHasErrors('decision');
    $this->post('/logout');
    workbookVerify($seller);
    $this->post('/logout');
    Storage::disk('local')->delete($seller->application->documents->firstWhere('kind', 'dti_certificate')->path);
    $this->actingAs($admin)->patch('/reviews/'.$seller->application->id, ['decision' => 'approved'])->assertSessionHasErrors('decision');
    expect($seller->fresh()->status)->toBe('pending');
    Notification::assertNotSentTo($seller, ApplicationReviewed::class);
});

test('TC-SEL-027 region options filter provinces and reject a forged dependent selection', function () {
    sellerRegistrationData();
    $this->getJson(route('registration.options', ['region' => '130000000']))->assertOk()->assertJsonCount(1)->assertJsonPath('0.code', '130000000');
    $this->getJson(route('registration.options', ['region' => '070000000']))->assertOk()->assertJsonCount(1)->assertJsonPath('0.code', '072200000');
    $this->getJson(route('registration.options', ['province' => '072200000']))->assertOk()->assertExactJson([]);
});

test('seller registration address service failure creates neither account nor documents', function () {
    Notification::fake();
    Storage::fake('local');
    $data = sellerRegistrationData();
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake(['https://psgc.gitlab.io/api/provinces/' => Http::response([], 503)]);
    $this->post('/register', $data)->assertSessionHasErrors('province_code');
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('registration_documents', 0);
    Notification::assertNothingSent();
});

test('historical buyer verification preserves review and does not autoactivate pending or rejected accounts', function (string $status) {
    Notification::fake();
    $buyer = User::factory()->unverified()->create(['role' => 'buyer', 'status' => $status]);
    RegistrationApplication::create(['user_id' => $buyer->id, 'requested_role' => 'buyer']);
    $buyer->sendEmailVerificationNotification();
    workbookVerify($buyer);
    expect($buyer->fresh()->status)->toBe($status === 'unverified' ? 'incomplete' : $status);
})->with(['unverified', 'pending', 'rejected']);

test('verified buyers remain pending until admin reviews the submitted ID and emails a decision', function () {
    Notification::fake();
    Storage::fake('local');
    $buyer = workbookCreate('buyer');
    workbookVerify($buyer);
    expect($buyer->fresh()->status)->toBe('pending');
    expect($buyer->application->fresh()->reviewer_id)->toBeNull();
    $this->get('/cart')->assertRedirect(route('application.waiting'));
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/reviews/'.$buyer->application->id)->assertOk()->assertJsonCount(1, 'documents');
    $this->patch('/reviews/'.$buyer->application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    expect($buyer->fresh()->status)->toBe('approved');
    Notification::assertSentTo($buyer, ApplicationReviewed::class, fn ($notification) => $notification->decision === 'approved');
    $this->post('/logout');
    $this->actingAs($buyer->fresh())->get('/cart')->assertOk();
});

test('buyer approval requires an existing private identity document', function (string $missing) {
    Notification::fake();
    Storage::fake('local');
    $buyer = workbookCreate('buyer');
    workbookVerify($buyer);
    $document = $buyer->application->documents()->firstOrFail();
    $this->post('/logout');
    if ($missing === 'file') {
        Storage::disk($document->disk)->delete($document->path);
    } else {
        $document->delete();
    }
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$buyer->application->id, ['decision' => 'approved'])->assertSessionHasErrors('decision');
    expect($buyer->fresh()->status)->toBe('pending');
    expect($buyer->application->fresh()->status)->toBe('submitted');
    Notification::assertNotSentTo($buyer, ApplicationReviewed::class);
    $this->patch('/reviews/'.$buyer->application->id, ['decision' => 'rejected', 'reason' => 'Please upload a readable valid ID.'])->assertSessionHasNoErrors();
    expect($buyer->fresh()->status)->toBe('rejected');
    Notification::assertSentTo($buyer, ApplicationReviewed::class, fn ($notification) => $notification->decision === 'rejected');
})->with(['file', 'record']);
