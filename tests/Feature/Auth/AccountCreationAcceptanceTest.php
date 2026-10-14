<?php

use App\Models\Category;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use App\Notifications\VerifyAccountEmail;
use App\Services\RegisterAccount;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

function acceptanceSignup(string $role, array $changes = []): array
{
    $data = $role === 'seller'
        ? sellerRegistrationData(['first_name' => 'Maria Clara', 'last_name' => 'Santos', 'email' => 'mariaclara.santos@example.com', 'phone' => '09189876543', 'password' => 'Tindahan@2026', 'password_confirmation' => 'Tindahan@2026', 'line1' => 'Blk 12 Lot 8, Sampaguita St.'])
        : sharedRegistrationData(['first_name' => 'Juan Miguel', 'last_name' => 'Dela Cruz', 'email' => 'juanmiguel.delacruz@example.com', 'phone' => '09171234567', 'birthday' => '1998-05-14', 'password' => 'Mamimili@2026', 'password_confirmation' => 'Mamimili@2026']);

    return array_replace($data, $changes);
}

function acceptanceSecondSignup(string $role): array
{
    if ($role === 'buyer') {
        return acceptanceSignup('buyer', ['first_name' => 'Ana Marie', 'last_name' => 'Reyes', 'email' => 'anamarie.reyes@example.com', 'phone' => '09173456789', 'birthday' => '2001-11-02', 'password' => 'Suki#2026Ana', 'password_confirmation' => 'Suki#2026Ana']);
    }
    $data = acceptanceSignup('seller', ['first_name' => 'Roberto', 'last_name' => 'Villanueva', 'email' => 'roberto.villanueva@example.com', 'phone' => '09194567890', 'password' => 'Gadget#Hub26', 'password_confirmation' => 'Gadget#Hub26', 'business_name' => 'RV Gadget Hub', 'seller_type' => 'corporation', 'tin' => '456-789-012-000', 'region_code' => '070000000', 'province_code' => '072200000', 'city_code' => '072217000', 'barangay_code' => '072217001', 'line1' => '2F, 45 Gorordo Ave.', 'zip' => '6000', 'sec_certificate' => UploadedFile::fake()->create('sec_certificate.pdf', 1024, 'application/pdf')]);
    $data['business_category_id'] = Category::firstOrCreate(['slug' => 'mobiles-gadgets'], ['name' => 'Mobiles & Gadgets'])->id;
    unset($data['dti_certificate']);
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '070000000', 'name' => 'Central Visayas']]),
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '072200000', 'name' => 'Cebu', 'regionCode' => '070000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '072217000', 'name' => 'Cebu City', 'regionCode' => '070000000', 'provinceCode' => '072200000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/072217000/barangays/' => Http::response([['code' => '072217001', 'name' => 'Lahug']]),
    ]);

    return $data;
}

test('QA workbook Account 2 repeated signup persists only one account and email', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    $data = acceptanceSecondSignup($role);
    $service = app(RegisterAccount::class);
    $user = $service->create($data);
    $user->sendEmailVerificationNotification();
    for ($attempt = 0; $attempt < 2; $attempt++) {
        expect(fn () => $service->create($data))->toThrow(ValidationException::class);
    }
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_email_codes', 1);
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
})->with(['TC-BUY-022 exact Account 2' => 'buyer', 'TC-SEL-020 exact Account 2' => 'seller']);

test('TC-SEL-041 TC-SEL-042 QA workbook Account 2 rejection and replacement retain the company type', function () {
    Notification::fake();
    Storage::fake('local');
    $data = acceptanceSecondSignup('seller');
    $this->post('/register', $data)->assertSessionHasNoErrors();
    $seller = User::sole();
    $this->post(route('verification.code'), ['code' => Notification::sent($seller, VerifyAccountEmail::class)->last()->code])->assertSessionHasNoErrors();
    $this->post('/logout');
    $reason = 'DTI certificate is blurred and the business name cannot be read.';
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$seller->application->id, ['decision' => 'rejected', 'reason' => $reason])->assertSessionHasNoErrors();
    Notification::assertSentTo($seller, ApplicationReviewed::class, fn ($notification) => $notification->reason === $reason);
    $this->post('/logout');
    $this->post('/login', ['email' => $seller->email, 'password' => 'Gadget#Hub26'])->assertRedirect(route('application.edit'));
    $this->get('/application')->assertInertia(fn (Assert $page) => $page->where('application.rejection_reason', $reason));
    // Account 2 is a Corporation; the workbook permits replacing "the rejected document".
    unset($data['identity'], $data['bir_2303'], $data['business_permit']);
    $data['sec_certificate'] = UploadedFile::fake()->create('sec_certificate_clear.pdf', 1024, 'application/pdf');
    $this->post('/application', $data)->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($seller->fresh()->status)->toBe('pending');
    expect($seller->application->fresh()->seller_type)->toBe('corporation');
    expect($seller->application->fresh()->rejection_reason)->toBeNull();
    $this->assertDatabaseCount('users', 2);
    $this->assertDatabaseCount('registration_documents', 5);
});

test('QA exact workbook registered identifiers reject uppercase email and international phone', function (string $role, string $field) {
    Notification::fake();
    Storage::fake('local');
    $data = acceptanceSignup($role);
    $existing = User::factory()->create(['email' => $data['email'], 'phone' => $data['phone']]);
    $data[$field] = $field === 'email' ? strtoupper($data['email']) : '+63'.substr($data['phone'], 1);
    $this->post('/register', $data)->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_documents', 0);
    expect($existing->fresh()->email)->toBe(strtolower($data['email']));
    Notification::assertNothingSent();
})->with(['TC-BUY-011 exact duplicate' => ['buyer', 'email'], 'TC-BUY-016 exact duplicate' => ['buyer', 'phone'], 'TC-SEL-009 exact duplicate' => ['seller', 'email'], 'TC-SEL-014 exact duplicate' => ['seller', 'phone']]);

test('QA exact workbook valid names email and password boundaries persist', function (string $role, array $changes) {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', $data = acceptanceSignup($role, $changes))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $user = User::sole();
    expect($user->name)->toBe($data['first_name'].' '.$data['last_name']);
    expect($user->email)->toBe(strtolower(trim($data['email'])));
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
})->with([
    'TC-BUY-005 exact Filipino' => ['buyer', ['first_name' => 'Niño Angelo', 'last_name' => "Peñaflor-O'Hara"]],
    'TC-SEL-005 exact Filipino' => ['seller', ['first_name' => 'Niña Corazon', 'last_name' => "Peñaranda-D'Souza"]],
    'TC-BUY-006 exact fifty' => ['buyer', ['first_name' => 'Maria Cristina Angelica Bernadette Josefina Leonor']],
    'TC-SEL-006 exact fifty' => ['seller', ['first_name' => 'Maria Cristina Angelica Bernadette Josefina Leonor']],
    'TC-BUY-012 exact trim' => ['buyer', ['email' => '  buyer.test01@example.com  ']],
    'TC-SEL-010 exact trim' => ['seller', ['email' => '  seller.test01@example.com  ']],
    'TC-BUY-017 exact eight' => ['buyer', ['password' => 'Bili@202', 'password_confirmation' => 'Bili@202']],
    'TC-SEL-015 exact eight' => ['seller', ['password' => 'Tinda@26', 'password_confirmation' => 'Tinda@26']],
]);

test('QA exact workbook phone samples and invalid name pairs return useful errors', function (string $role, array $changes, array $fields) {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', acceptanceSignup($role, $changes))->assertSessionHasErrors($fields);
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with([
    'TC-BUY-004 exact pair' => ['buyer', ['first_name' => 'Juan Miguel123', 'last_name' => 'Dela Cruz@#'], ['first_name', 'last_name']],
    'TC-SEL-004 exact pair' => ['seller', ['first_name' => 'Maria Clara99', 'last_name' => 'Dela Cruz@#'], ['first_name', 'last_name']],
    ...collect(['0917ABC4567', '0917-123-456', '12345678901', '02-8123-4567'])->flatMap(fn ($phone, $i) => ['TC-BUY-013 exact '.$i => ['buyer', ['phone' => $phone], ['phone']], 'TC-SEL-011 exact '.$i => ['seller', ['phone' => $phone], ['phone']]])->all(),
]);

test('TC-BUY-029 QA workbook buyer login returns the correct displayed name', function () {
    Notification::fake();
    $this->post('/register', acceptanceSignup('buyer'))->assertSessionHasNoErrors();
    $user = User::sole();
    $this->post(route('verification.code'), ['code' => Notification::sent($user, VerifyAccountEmail::class)->last()->code])->assertSessionHasNoErrors();
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$user->application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    $this->post('/logout');
    $this->post('/login', ['email' => $user->email, 'password' => 'Mamimili@2026'])->assertSessionHasNoErrors();
    $this->get('/dashboard/buyer')->assertInertia(fn (Assert $page) => $page->where('auth.user.name', 'Juan Miguel Dela Cruz'));
});

test('TC-SEL-039 QA pending list uses the workbook shop name and opens every private document', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', acceptanceSignup('seller'))->assertSessionHasNoErrors();
    $seller = User::sole();
    $this->post(route('verification.code'), ['code' => Notification::sent($seller, VerifyAccountEmail::class)->last()->code])->assertSessionHasNoErrors();
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/reviews')->assertInertia(fn (Assert $page) => $page->where('applications.data.0.name', 'Maria Clara Handicrafts')->where('applications.data.0.status', 'submitted'));
    $response = $this->getJson('/reviews/'.$seller->application->id)->assertOk()->assertJsonPath('store.name', 'Maria Clara Handicrafts')->assertJsonPath('applicant.name', 'Maria Clara Santos');
    foreach ($response->json('documents') as $document) {
        $this->get($document['url'])->assertOk();
    }
});

test('TC-LOG-043 QA non-admin cannot access list or reject a company', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', logisticsRegistrationData())->assertSessionHasNoErrors();
    $company = User::sole();
    $this->post('/logout');
    $this->actingAs(User::factory()->create())->get('/reviews')->assertForbidden();
    $this->patch('/reviews/'.$company->application->id, ['decision' => 'rejected', 'reason' => 'Forged'])->assertForbidden();
    expect($company->fresh()->status)->toBe('unverified');
    Notification::assertNotSentTo($company, ApplicationReviewed::class);
});

test('TC-SEL-022 QA exact workbook shop name boundary', function (string $name, bool $valid) {
    Notification::fake();
    Storage::fake('local');
    $response = $this->post('/register', acceptanceSignup('seller', ['business_name' => $name]));
    if ($valid) {
        $response->assertSessionHasNoErrors();
        expect(User::sole()->store->name)->toBe($name);
    } else {
        $response->assertSessionHasErrors('business_name');
        $this->assertDatabaseCount('users', 0);
        Notification::assertNothingSent();
    }
})->with([['MC', false], ['MCH', true], ['Maria Clara Handicrafts Manila', true], ['Maria Clara Handicrafts, Manila', false]]);
