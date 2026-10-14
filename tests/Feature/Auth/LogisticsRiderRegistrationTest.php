<?php

use App\Models\RegistrationApplication;
use App\Models\RegistrationDocument;
use App\Models\SortingCenter;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use App\Notifications\RiderActivation;
use App\Notifications\VerifyAccountEmail;
use App\Services\CreateCompanyRider;
use App\Services\RegisterAccount;
use App\Services\RiderInvitations;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;

function approvedRiderCompany(): User
{
    $company = User::factory()->create(['role' => 'sorting_center']);
    $center = SortingCenter::create(['code' => 'COMPANY-'.$company->id, 'name' => 'Bilis Hatid Express Inc.', 'address' => 'Synthetic address']);
    $center->forceFill(['company_user_id' => $company->id])->save();
    $company->sortingCenters()->attach($center->id, ['granted_by' => $company->id]);

    return $company;
}
function invitedRider(User $company): User
{
    test()->actingAs($company)->post(route('logistics.riders.store'), companyRiderData())->assertSessionHasNoErrors()->assertRedirect(route('logistics.riders.index'));

    return User::where('email', 'pedrojose.garcia@example.com')->firstOrFail();
}
function riderActivationToken(User $rider): string
{
    return basename(parse_url(Notification::sent($rider, RiderActivation::class)->last()->url, PHP_URL_PATH));
}
function activateInvitedRider(User $rider): void
{
    test()->post('/logout');
    test()->post(route('rider.activation.store', riderActivationToken($rider)), ['password' => 'Rider@2026', 'password_confirmation' => 'Rider@2026'])->assertSessionHasNoErrors()->assertRedirect(route('login'));
}
function pendingWorkbookLogistics(): User
{
    test()->post('/register', logisticsRegistrationData())->assertSessionHasNoErrors();
    $user = User::where('email', 'operations@bilishatid.example.com')->firstOrFail();
    test()->post(route('verification.code'), ['code' => Notification::sent($user, VerifyAccountEmail::class)->last()->code])->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));

    return $user;
}

dataset('logistics rider invalid inputs', [
    'TC-LOG-004 names' => ['log', ['first_name' => 'Carlos Antonio7', 'last_name' => 'Dela Cruz@#'], ['first_name', 'last_name']],
    'TC-LOG-006 one' => ['log', ['first_name' => 'C'], 'first_name'], 'TC-LOG-006 fifty one' => ['log', ['first_name' => 'Maria Cristina Angelica Bernadette Josefina Leonora'], 'first_name'],
    'TC-LOG-007 no at' => ['log', ['email' => 'operations.bilishatidexample.com'], 'email'], 'TC-LOG-007 no domain' => ['log', ['email' => 'operations.bilishatid@'], 'email'],
    'TC-LOG-007 no name' => ['log', ['email' => '@example.com'], 'email'], 'TC-LOG-007 single label' => ['log', ['email' => 'operations.bilishatid@example'], 'email'], 'TC-LOG-007 space' => ['log', ['email' => 'operations bilishatid@example.com'], 'email'],
    'TC-LOG-011 letters' => ['log', ['phone' => '0917ABC4567'], 'phone'], 'TC-LOG-011 symbols' => ['log', ['phone' => '0917-123-456'], 'phone'], 'TC-LOG-011 prefix' => ['log', ['phone' => '12345678901'], 'phone'], 'TC-LOG-011 landline' => ['log', ['phone' => '02-8123-4567'], 'phone'],
    'TC-LOG-012 ten' => ['log', ['phone' => '0917123456'], 'phone'], 'TC-LOG-012 twelve' => ['log', ['phone' => '091712345678'], 'phone'],
    'TC-LOG-015 seven' => ['log', ['password' => 'Hati@26', 'password_confirmation' => 'Hati@26'], 'password'],
    'TC-LOG-016 no upper' => ['log', ['password' => 'hatid@2026', 'password_confirmation' => 'hatid@2026'], 'password'], 'TC-LOG-016 no lower' => ['log', ['password' => 'HATID@2026', 'password_confirmation' => 'HATID@2026'], 'password'],
    'TC-LOG-016 no number' => ['log', ['password' => 'Hatid@abcd', 'password_confirmation' => 'Hatid@abcd'], 'password'], 'TC-LOG-016 no special' => ['log', ['password' => 'Hatid2026', 'password_confirmation' => 'Hatid2026'], 'password'],
    'TC-LOG-017 mismatch' => ['log', ['password_confirmation' => 'Hatid@2027'], 'password'], 'TC-LOG-019 terms' => ['log', ['policy_accepted' => false], 'policy_accepted'],
    'TC-LOG-022 eight digits' => ['log', ['sec_number' => 'CS20201234'], 'sec_number'], 'TC-LOG-022 reversed' => ['log', ['sec_number' => '202012345CS'], 'sec_number'], 'TC-LOG-022 symbol' => ['log', ['sec_number' => 'CS2020-12345'], 'sec_number'], 'TC-LOG-022 no letters' => ['log', ['sec_number' => '12345678901'], 'sec_number'],
    'TC-LOG-025 eleven' => ['log', ['tin' => '123-456-789-00'], 'tin'], 'TC-LOG-025 thirteen' => ['log', ['tin' => '123-456-789-0001'], 'tin'], 'TC-LOG-025 letter' => ['log', ['tin' => '123-456-78A-000'], 'tin'],
    'TC-LOG-027 forged region' => ['log', ['region_code' => '070000000'], 'barangay_code'], 'TC-LOG-028 three' => ['log', ['zip' => '160'], 'zip'], 'TC-LOG-028 five' => ['log', ['zip' => '16030'], 'zip'], 'TC-LOG-028 letter' => ['log', ['zip' => '16A3'], 'zip'],
    'TC-RID-004 names' => ['rid', ['first_name' => 'Pedro Jose99', 'last_name' => 'Dela Cruz@#'], ['first_name', 'last_name']],
    'TC-RID-005 one' => ['rid', ['first_name' => 'P'], 'first_name'], 'TC-RID-005 fifty one' => ['rid', ['first_name' => 'Maria Cristina Angelica Bernadette Josefina Leonora'], 'first_name'],
    'TC-RID-006 seventeen' => ['rid', ['birthday' => '2008-10-14'], 'birthday'],
    'TC-RID-007 no at' => ['rid', ['email' => 'pedrojose.garciaexample.com'], 'email'], 'TC-RID-007 no domain' => ['rid', ['email' => 'pedrojose.garcia@'], 'email'], 'TC-RID-007 no name' => ['rid', ['email' => '@example.com'], 'email'], 'TC-RID-007 single label' => ['rid', ['email' => 'pedrojose.garcia@example'], 'email'], 'TC-RID-007 space' => ['rid', ['email' => 'pedrojose garcia@example.com'], 'email'],
    'TC-RID-009 letters' => ['rid', ['phone' => '0917ABC4567'], 'phone'], 'TC-RID-009 symbols' => ['rid', ['phone' => '0917-123-456'], 'phone'], 'TC-RID-009 prefix' => ['rid', ['phone' => '12345678901'], 'phone'], 'TC-RID-009 landline' => ['rid', ['phone' => '02-8123-4567'], 'phone'],
    'TC-RID-010 ten' => ['rid', ['phone' => '0917123456'], 'phone'], 'TC-RID-010 twelve' => ['rid', ['phone' => '091712345678'], 'phone'],
    'TC-RID-012 short' => ['rid', ['license_number' => 'N01-23-45678'], 'license_number'], 'TC-RID-012 long' => ['rid', ['license_number' => 'N01-23-4567890'], 'license_number'], 'TC-RID-012 no letter' => ['rid', ['license_number' => '101-23-456789'], 'license_number'], 'TC-RID-012 ending letter' => ['rid', ['license_number' => 'N0123456789X'], 'license_number'],
    'TC-RID-014 yesterday' => ['rid', ['license_expires_at' => '2026-10-12'], 'license_expires_at'],
]);
test('case rejects invalid input without account documents or email', function (string $role, array $changes, string|array $field) {
    Notification::fake();
    Storage::fake('local');
    $this->travelTo(Carbon::parse('2026-10-13 12:00', 'Asia/Manila'));
    if ($role === 'log') {
        $data = logisticsRegistrationData($changes);
        $url = '/register';
        $count = 0;
    } else {
        $company = approvedRiderCompany();
        $this->actingAs($company);
        $data = companyRiderData($changes);
        $url = route('logistics.riders.store');
        $count = 1;
    }
    $this->post($url, $data)->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', $count);
    $this->assertDatabaseCount('registration_documents', 0);
    Notification::assertNothingSent();
})->with('logistics rider invalid inputs');

test('case accepts valid boundary values and preserves inputs', function (string $role, array $changes) {
    Notification::fake();
    Storage::fake('local');
    $this->travelTo(Carbon::parse('2026-10-13 12:00', 'Asia/Manila'));
    if ($role === 'log') {
        $data = logisticsRegistrationData($changes);
        $this->post('/register', $data)->assertSessionHasNoErrors();
        $user = User::where('email', trim(strtolower($data['email'])))->firstOrFail();
        Notification::assertSentTo($user, VerifyAccountEmail::class);
    } else {
        $this->actingAs(approvedRiderCompany())->post(route('logistics.riders.store'), $data = companyRiderData($changes))->assertSessionHasNoErrors();
        $user = User::where('email', $data['email'])->firstOrFail();
        Notification::assertSentTo($user, RiderActivation::class);
    }
    expect($user->name)->toBe($data['first_name'].' '.$data['last_name']);
    expect($user->status)->toBe('unverified');
})->with([
    'TC-LOG-005 Filipino' => ['log', ['first_name' => 'Iñigo Rafael', 'last_name' => "Muñoz-D'Angelo"]], 'TC-LOG-006 two' => ['log', ['first_name' => 'Co']], 'TC-LOG-006 fifty' => ['log', ['first_name' => 'Maria Cristina Angelica Bernadette Josefina Leonor']],
    'TC-LOG-010 trim' => ['log', ['email' => '  logistics.test01@example.com  ']], 'TC-LOG-012 eleven' => ['log', ['phone' => '09170000001']], 'TC-LOG-015 eight' => ['log', ['password' => 'Hatid@26', 'password_confirmation' => 'Hatid@26']],
    'TC-LOG-025 twelve' => ['log', ['tin' => '345-678-901-000']], 'TC-LOG-028 four' => ['log', ['zip' => '1603']],
    'TC-RID-005 two' => ['rid', ['first_name' => 'Po']], 'TC-RID-005 fifty' => ['rid', ['first_name' => 'Maria Cristina Angelica Bernadette Josefina Leonor']],
    'TC-RID-006 eighteen' => ['rid', ['birthday' => '2008-10-13']], 'TC-RID-006 eighteen plus day' => ['rid', ['birthday' => '2008-10-12']], 'TC-RID-010 eleven' => ['rid', ['phone' => '09170000001']],
    'TC-RID-014 today' => ['rid', ['license_expires_at' => '2026-10-13']], 'TC-RID-014 tomorrow' => ['rid', ['license_expires_at' => '2026-10-14']],
]);

test('case reports every mandatory field on an empty form', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    if ($role === 'log') {
        $this->post('/register', ['role' => 'sorting_center'])->assertSessionHasErrors(['first_name', 'last_name', 'email', 'phone', 'business_name', 'sec_number', 'tin', 'position', 'service_regions', 'region_code', 'province_code', 'city_code', 'barangay_code', 'line1', 'zip', 'identity', 'sec_certificate', 'bir_2303', 'business_permit', 'password', 'policy_accepted']);
    } else {
        $this->actingAs(approvedRiderCompany())->post(route('logistics.riders.store'), [])->assertSessionHasErrors(['first_name', 'last_name', 'birthday', 'email', 'phone', 'license_number', 'license_expires_at', 'vehicle_type', 'plate_number', 'license', 'vehicle_registration']);
    }
    Notification::assertNothingSent();
    $this->assertDatabaseCount('registration_documents', 0);
})->with(['TC-LOG-002' => 'log', 'TC-RID-002' => 'rid']);

dataset('logistics rider required fields', array_merge(
    array_combine(array_map(fn ($f) => 'TC-LOG-003 '.$f, $fields = ['first_name', 'last_name', 'email', 'phone', 'business_name', 'sec_number', 'tin', 'position', 'service_regions', 'region_code', 'province_code', 'city_code', 'barangay_code', 'line1', 'zip', 'identity', 'sec_certificate', 'bir_2303', 'business_permit', 'password', 'password_confirmation']), array_map(fn ($f) => ['log', $f], $fields)),
    array_combine(array_map(fn ($f) => 'TC-RID-003 '.$f, $fields = ['first_name', 'last_name', 'birthday', 'email', 'phone', 'license_number', 'license_expires_at', 'vehicle_type', 'plate_number', 'license', 'vehicle_registration']), array_map(fn ($f) => ['rid', $f], $fields))
));
test('case rejects each individually omitted mandatory field', function (string $role, string $field) {
    Notification::fake();
    Storage::fake('local');
    if ($role === 'log') {
        $data = logisticsRegistrationData();
        $url = '/register';
        $count = 0;
    } else {
        $this->actingAs(approvedRiderCompany());
        $data = companyRiderData();
        $url = route('logistics.riders.store');
        $count = 1;
    }
    unset($data[$field]);
    $this->post($url, $data)->assertSessionHasErrors($field === 'password_confirmation' ? 'password' : $field);
    $this->assertDatabaseCount('users', $count);
    Notification::assertNothingSent();
})->with('logistics rider required fields');

test('case detects globally duplicated identifiers', function (string $role, string $field, bool $alternate = false) {
    Notification::fake();
    Storage::fake('local');
    if ($role === 'log') {
        $data = logisticsRegistrationData();
        $other = User::factory()->create(['role' => 'buyer', 'email' => $field === 'email' ? $data['email'] : 'other@example.com', 'phone' => $field === 'phone' ? $data['phone'] : null]);
        if (in_array($field, ['business_name', 'sec_number', 'tin'])) {
            RegistrationApplication::create(['user_id' => $other->id, 'requested_role' => 'sorting_center', ...($field === 'business_name' ? ['business_name' => $data[$field]] : [$field => $data[$field]])]);
        }
        if ($alternate) {
            $data[$field] = $field === 'email' ? strtoupper($data[$field]) : '+639285551234';
        }$this->post('/register', $data)->assertSessionHasErrors($field);
    } else {
        $company = approvedRiderCompany();
        $data = companyRiderData();
        $other = User::factory()->create(['role' => 'buyer', 'email' => $field === 'email' ? 'juanmiguel.delacruz@example.com' : 'other@example.com', 'phone' => $field === 'phone' ? '09171234567' : null]);
        if ($field === 'email') {
            $data[$field] = 'juanmiguel.delacruz@example.com';
        } if ($field === 'phone') {
            $data[$field] = '09171234567';
        }
        if (in_array($field, ['license_number', 'plate_number'])) {
            DB::table('rider_profiles')->insert(['user_id' => $other->id, 'vehicle_type' => 'motorcycle', $field => $data[$field]]);
        }
        $this->actingAs($company)->post(route('logistics.riders.store'), $data)->assertSessionHasErrors($field);
    }Notification::assertNothingSent();
    $this->assertDatabaseCount('registration_documents', 0);
})->with(['TC-LOG-008' => ['log', 'email'], 'TC-LOG-009' => ['log', 'email', true], 'TC-LOG-013' => ['log', 'phone'], 'TC-LOG-014' => ['log', 'phone', true], 'TC-LOG-021' => ['log', 'business_name'], 'TC-LOG-023' => ['log', 'sec_number'], 'TC-LOG-026' => ['log', 'tin'], 'TC-RID-008' => ['rid', 'email'], 'TC-RID-011' => ['rid', 'phone'], 'TC-RID-013' => ['rid', 'license_number'], 'TC-RID-015' => ['rid', 'plate_number']]);

test('TC-LOG-001 full company signup persists every business field and sends one OTP', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', logisticsRegistrationData())->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $user = User::where('role', 'sorting_center')->firstOrFail();
    expect($user->status)->toBe('unverified');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'sec_number' => 'CS202012345', 'tin' => '234-567-890-000', 'position' => 'Operations Manager', 'status' => 'submitted']);
    $this->assertDatabaseCount('registration_documents', 4);
    Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
});
test('TC-LOG-024 three selected service regions persist', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', logisticsRegistrationData(['service_regions' => ['130000000', '030000000', '040000000']]))->assertSessionHasNoErrors();
    expect(User::where('role', 'sorting_center')->firstOrFail()->application->service_regions)->toBe(['130000000', '030000000', '040000000']);
});
test('TC-LOG-027 province options are filtered to the chosen region', function () {
    logisticsRegistrationData();
    $this->getJson(route('registration.options', ['region' => '070000000']))->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Cebu');
    $this->getJson(route('registration.options', ['province' => '072200000']))->assertExactJson([]);
});
test('TC-LOG-032 correct OTP makes logistics pending without operational access', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    expect($company->fresh()->status)->toBe('pending');
    $this->get(route('logistics.riders.create'))->assertRedirect(route('application.waiting'));
    $this->get('/deliveries')->assertRedirect(route('application.waiting'));
});
test('case incorrect malformed or expired company OTP cannot verify', function (string $mode) {
    Notification::fake();
    Storage::fake('local');
    $this->freezeTime();
    $this->post('/register', logisticsRegistrationData())->assertSessionHasNoErrors();
    $user = User::where('role', 'sorting_center')->firstOrFail();
    $code = Notification::sent($user, VerifyAccountEmail::class)->last()->code;
    if ($mode === 'expired') {
        $this->travel(301)->seconds();
    }$codes = $mode === 'format' ? ['48291', '4829137', '48A91B', ''] : [$mode === 'wrong' ? ($code === '000000' ? '111111' : '000000') : $code];
    foreach ($codes as $value) {
        $this->post(route('verification.code'), ['code' => $value])->assertSessionHasErrors('code');
    }expect($user->fresh()->status)->toBe('unverified');
})->with(['TC-LOG-033' => 'wrong', 'TC-LOG-034' => 'format', 'TC-LOG-035' => 'expired']);
test('TC-LOG-036 resending rejects the first OTP and verifies the new one', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', logisticsRegistrationData())->assertSessionHasNoErrors();
    $company = User::where('role', 'sorting_center')->firstOrFail();
    $old = Notification::sent($company, VerifyAccountEmail::class)->last()->code;
    $this->travel(61)->seconds();
    $this->post(route('verification.send'))->assertSessionHasNoErrors();
    $this->post(route('verification.code'), ['code' => $old])->assertSessionHasErrors('code');
    $this->post(route('verification.code'), ['code' => Notification::sent($company, VerifyAccountEmail::class)->last()->code])->assertSessionHasNoErrors();
    Notification::assertSentToTimes($company, VerifyAccountEmail::class, 2);
});
test('TC-LOG-037 unverified company login remains restricted', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', logisticsRegistrationData());
    $this->post('/logout');
    $this->post('/login', ['email' => 'operations@bilishatid.example.com', 'password' => 'Hatid@2026'])->assertRedirect(route('verification.notice'));
    $this->get('/dashboard/sorting_center')->assertRedirect(route('verification.notice'));
});
test('TC-LOG-038 pending company login cannot add riders or operate deliveries', function () {
    Notification::fake();
    Storage::fake('local');
    pendingWorkbookLogistics();
    $this->post('/logout');
    $this->post('/login', ['email' => 'operations@bilishatid.example.com', 'password' => 'Hatid@2026'])->assertRedirect(route('application.waiting'));
    $this->post(route('logistics.riders.store'), companyRiderData())->assertRedirect(route('application.waiting'));
    $this->get('/deliveries')->assertRedirect(route('application.waiting'));
    $this->assertDatabaseCount('rider_activation_invitations', 0);
});
test('TC-LOG-039 admin sees all company details and can open private files', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/reviews')->assertOk();
    $json = $this->getJson('/reviews/'.$company->application->id)->assertOk()->assertJsonPath('application.position', 'Operations Manager')->assertJsonPath('application.sec_number', 'CS202012345')->assertJsonCount(2, 'application.service_regions')->assertJsonCount(4, 'documents');
    foreach ($json->json('documents') as $doc) {
        $this->get($doc['url'])->assertOk();
    }
});
test('TC-LOG-040 administrator approval creates a company-owned center and allows login', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$company->application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    expect($company->fresh()->status)->toBe('approved');
    $this->assertDatabaseHas('sorting_centers', ['company_user_id' => $company->id, 'name' => 'Bilis Hatid Express Inc.']);
    Notification::assertSentTo($company, ApplicationReviewed::class);
    $this->post('/logout');
    $this->post('/login', ['email' => $company->email, 'password' => 'Hatid@2026'])->assertRedirect('/dashboard');
    $this->get('/dashboard/sorting_center')->assertOk();
});
test('TC-LOG-041 rejection emails the reason and prevents logistics access', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$company->application->id, ['decision' => 'rejected'])->assertSessionHasErrors('reason');
    $this->patch('/reviews/'.$company->application->id, ['decision' => 'rejected', 'reason' => "Mayor's permit expired on 12/31/2025."])->assertSessionHasNoErrors();
    Notification::assertSentTo($company, ApplicationReviewed::class, fn ($n) => $n->reason === "Mayor's permit expired on 12/31/2025.");
    $this->post('/logout');
    $this->post('/login', ['email' => $company->email, 'password' => 'Hatid@2026'])->assertRedirect(route('application.edit'));
    $this->get('/application')->assertInertia(fn (Assert $p) => $p->where('application.rejection_reason', "Mayor's permit expired on 12/31/2025."));
});
test('TC-LOG-042 rejected company replaces permit and resubmits the same account', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$company->application->id, ['decision' => 'rejected', 'reason' => 'Replace permit'])->assertSessionHasNoErrors();
    $this->post('/logout');
    $data = logisticsRegistrationData(['business_permit' => UploadedFile::fake()->create('mayors_permit_2026.pdf', 1200, 'application/pdf')]);
    unset($data['identity'],$data['sec_certificate'],$data['bir_2303']);
    $this->actingAs($company->fresh())->post('/application', $data)->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($company->fresh()->status)->toBe('pending');
    $this->assertDatabaseCount('users', 2);
    $this->assertDatabaseCount('registration_documents', 5);
});
test('TC-LOG-043 non-admin cannot read approve or reject company applications', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    $this->post('/logout');
    $this->actingAs(User::factory()->create())->getJson('/reviews/'.$company->application->id)->assertForbidden();
    $this->patch('/reviews/'.$company->application->id, ['decision' => 'approved'])->assertForbidden();
});
test('case foreign role dashboards are denied', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'courier') {
        linkRiderToApprovedCenter($user);
    }foreach (array_diff(['buyer', 'seller', 'courier', 'sorting_center', 'admin'], [$role]) as $target) {
        $this->actingAs($user)->get('/dashboard/'.$target)->assertForbidden();
    }
})->with(['TC-LOG-044' => 'sorting_center', 'TC-RID-032' => 'courier']);

test('TC-RID-001 company creates a pending activation rider with private documents and one email', function () {
    Notification::fake();
    Storage::fake('local');
    $company = approvedRiderCompany();
    $rider = invitedRider($company);
    expect($rider->password)->toBeNull();
    expect($rider->logistics_company_id)->toBe($company->id);
    $this->get(route('logistics.riders.index'))->assertInertia(fn (Assert $p) => $p->where('riders.0.pendingActivation', true)->where('riders.0.name', 'Pedro Jose Garcia'));
    Notification::assertSentToTimes($rider, RiderActivation::class, 1);
    $record = DB::table('rider_activation_invitations')->where('user_id', $rider->id)->first();
    expect($record->token_hash)->toBe(hash('sha256', riderActivationToken($rider)));
    $this->assertDatabaseCount('registration_documents', 2);
});
test('TC-RID-020 valid activation sets a hashed password and activates only its rider', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    activateInvitedRider($rider);
    expect($rider->fresh()->status)->toBe('approved');
    expect(Hash::check('Rider@2026', $rider->fresh()->password))->toBeTrue();
    $this->assertGuest();
});
test('TC-RID-021 invalid activation passwords leave the invitation usable', function (string $password) {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    $this->post('/logout');
    $this->post(route('rider.activation.store', riderActivationToken($rider)), ['password' => $password, 'password_confirmation' => $password])->assertSessionHasErrors('password');
    expect($rider->fresh()->password)->toBeNull();
    expect($rider->fresh()->status)->toBe('unverified');
})->with(['Ride@26', 'rider@2026', 'RIDER@2026', 'Rider@abcd', 'Rider2026']);
test('TC-RID-022 password mismatch does not activate', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    $this->post('/logout');
    $this->post(route('rider.activation.store', riderActivationToken($rider)), ['password' => 'Rider@2026', 'password_confirmation' => 'Rider@2027'])->assertSessionHasErrors('password');
    expect($rider->fresh()->status)->toBe('unverified');
});
test('TC-RID-023 expired activation does not expose password setup or activate', function () {
    Notification::fake();
    Storage::fake('local');
    $this->freezeTime();
    $rider = invitedRider(approvedRiderCompany());
    $this->post('/logout');
    $this->travel(1441)->minutes();
    $token = riderActivationToken($rider);
    $this->get(route('rider.activation.show', $token))->assertInertia(fn (Assert $p) => $p->where('valid', false));
    $this->post(route('rider.activation.store', $token), ['password' => 'Rider@2026', 'password_confirmation' => 'Rider@2026'])->assertSessionHasErrors('activation');
    expect($rider->fresh()->password)->toBeNull();
});
test('TC-RID-024 resend invalidates first link and displays second password setup', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    $old = riderActivationToken($rider);
    $this->post(route('logistics.riders.resend', $rider->id))->assertSessionHasNoErrors();
    $new = riderActivationToken($rider);
    $this->get(route('rider.activation.show', $old))->assertInertia(fn (Assert $p) => $p->where('valid', false));
    $this->get(route('rider.activation.show', $new))->assertInertia(fn (Assert $p) => $p->where('valid', true)->where('requiresLogout', true));
    Notification::assertSentToTimes($rider, RiderActivation::class, 2);
});
test('TC-RID-025 consumed activation cannot reset a password', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    $token = riderActivationToken($rider);
    activateInvitedRider($rider);
    $old = $rider->fresh()->password;
    $this->get(route('rider.activation.show', $token))->assertInertia(fn (Assert $p) => $p->where('valid', false));
    $this->post(route('rider.activation.store', $token), ['password' => 'NewPass@2026', 'password_confirmation' => 'NewPass@2026'])->assertSessionHasErrors('activation');
    expect($rider->fresh()->password)->toBe($old);
});
test('TC-RID-026 login before activation is denied even if a password was set elsewhere', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    $this->post('/logout');
    $rider->forceFill(['password' => Hash::make('Rider@2026')])->save();
    $this->post('/login', ['email' => $rider->email, 'password' => 'Rider@2026'])->assertSessionHasErrors('email');
    $this->assertGuest();
});
test('TC-RID-027 activated rider logs in and sees its own company', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    activateInvitedRider($rider);
    $this->post('/login', ['email' => $rider->email, 'password' => 'Rider@2026'])->assertSessionHasNoErrors()->assertRedirect('/dashboard');
    $this->get('/dashboard/courier')->assertInertia(fn (Assert $p) => $p->where('auth.user.name', 'Pedro Jose Garcia')->where('companyName', 'Bilis Hatid Express Inc.'));
});
test('TC-RID-028 another company cannot list view modify resend or activate a foreign rider', function () {
    Notification::fake();
    Storage::fake('local');
    $a = approvedRiderCompany();
    $rider = invitedRider($a);
    $b = approvedRiderCompany();
    $this->actingAs($b)->get(route('logistics.riders.index'))->assertInertia(fn (Assert $p) => $p->has('riders', 0));
    $this->get(route('rider.activation.show', riderActivationToken($rider)))->assertForbidden();
    $this->getJson('/accounts/'.$rider->id)->assertForbidden();
    $document = $rider->application->documents->first();
    $this->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertForbidden();
    $this->patch('/accounts/'.$rider->id, ['status' => 'approved', 'reason' => 'Forged'])->assertForbidden();
    $this->post(route('logistics.riders.resend', $rider->id))->assertNotFound();
    $this->post(route('rider.activation.store', riderActivationToken($rider)), ['password' => 'WrongCo@2026', 'password_confirmation' => 'WrongCo@2026'])->assertRedirect();
    expect($rider->fresh()->password)->toBeNull();
    Notification::assertSentToTimes($rider, RiderActivation::class, 1);
});
test('public rider signup requires verification and cannot bypass Logistics approval', function () {
    Notification::fake();
    Storage::fake('local');
    $this->get(route('logistics.riders.create'))->assertRedirect(route('login'));
    $this->post('/register', riderRegistrationData(['status' => 'approved']))->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $rider = User::where('email', 'shared@example.com')->sole();
    expect($rider->status)->toBe('unverified');
    expect($rider->application->status)->toBe('submitted');
    Notification::assertSentTo($rider, VerifyAccountEmail::class);
    $this->post('/logout');
    $user = User::factory()->create(['role' => null, 'status' => 'incomplete']);
    $this->actingAs($user)->post(route('role.store'), ['role' => 'courier'])->assertSessionHasNoErrors()->assertRedirect(route('application.edit'));
    expect($user->fresh()->role)->toBe('courier');
    expect($user->fresh()->status)->toBe('incomplete');
});
test('TC-RID-030 buyers and sellers cannot create riders', function (string $role) {
    Notification::fake();
    $this->actingAs(User::factory()->create(['role' => $role]))->get(route('logistics.riders.create'))->assertForbidden();
    $this->post(route('logistics.riders.store'), companyRiderData())->assertForbidden();
    $this->assertDatabaseCount('rider_activation_invitations', 0);
    Notification::assertNothingSent();
})->with(['buyer', 'seller']);
test('TC-RID-031 pending logistics cannot create or invite a rider', function () {
    Notification::fake();
    $this->actingAs(User::factory()->create(['role' => 'sorting_center', 'status' => 'pending']))->get(route('logistics.riders.create'))->assertRedirect(route('application.waiting'));
    $this->post(route('logistics.riders.store'), companyRiderData())->assertRedirect(route('application.waiting'));
    $this->assertDatabaseCount('rider_activation_invitations', 0);
    Notification::assertNothingSent();
});
test('case repeated creation results in one account and one email generation', function (string $role) {
    Notification::fake();
    Storage::fake('local');
    if ($role === 'log') {
        $data = logisticsSecondRegistrationData();
        $service = app(RegisterAccount::class);
        $service->create($data)->sendEmailVerificationNotification();
        $create = fn () => $service->create($data);
    } else {
        $company = approvedRiderCompany();
        $data = companyRiderData(['first_name' => 'Mark Anthony', 'last_name' => 'Bautista', 'birthday' => '1999-08-09', 'email' => 'markanthony.bautista@example.com', 'phone' => '09662345678', 'license_number' => 'D05-19-123456', 'license_expires_at' => '2031-08-09', 'vehicle_type' => 'van', 'plate_number' => 'NBC1234', 'license' => UploadedFile::fake()->create('drivers_license.png', 2048, 'image/png')]);
        $service = app(CreateCompanyRider::class);
        [$rider,$delivery] = $service->create($company, $data);
        app(RiderInvitations::class)->deliver($delivery);
        $create = fn () => $service->create($company, $data);
    }for ($i = 0; $i < 2; $i++) {
        expect($create)->toThrow(ValidationException::class);
    }$this->assertDatabaseCount($role === 'log' ? 'registration_email_codes' : 'rider_activation_invitations', 1);
    Notification::assertCount(1);
})->with(['TC-LOG-020' => 'log', 'TC-RID-019' => 'rid']);
test('TC-LOG-018 password masking requires real browser verification', function () {})->skip('NOT RUN: browser password visibility and toggle.');

test('case upload MIME extension and actual byte boundaries are enforced before persistence', function (string $role, string $filename, string $mime, int $size, bool $valid) {
    Notification::fake();
    Storage::fake('local');
    $path = tempnam(sys_get_temp_dir(), 'lubosmart-role-upload-');
    $prefix = match ($mime) {
        'image/jpeg' => file_get_contents(public_path('images/marketplace/marketplace-hero-v2.jpg')),'image/png' => file_get_contents(public_path('images/brand/logo.png')),'application/pdf' => "%PDF-1.4\n",'image/gif' => base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='),default => 'Invalid upload'
    };
    file_put_contents($path, $prefix.str_repeat("\0", $size - strlen($prefix)));
    try {
        $file = new UploadedFile($path, $filename, $mime, null, true);
        $field = $role === 'log' ? (str_starts_with($filename, 'govt_id') ? 'identity' : 'business_permit') : 'license';
        if ($role === 'log') {
            $data = logisticsRegistrationData([$field => $file]);
            $url = '/register';
            $count = 0;
        } else {
            $this->actingAs(approvedRiderCompany());
            $data = companyRiderData([$field => $file]);
            $url = route('logistics.riders.store');
            $count = 1;
        }
        $response = $this->post($url, $data);
        if ($valid) {
            $response->assertSessionHasNoErrors();
            $document = RegistrationDocument::where('kind', $field)->sole();
            expect($document->size_bytes)->toBe($size);
            Storage::disk('local')->assertExists($document->path);
            Notification::assertCount(1);
        } else {
            $response->assertSessionHasErrors($field);
            $this->assertDatabaseCount('users', $count);
            $this->assertDatabaseCount('registration_documents', 0);
            Notification::assertNothingSent();
        }
    } finally {
        unlink($path);
    }
})->with([
    'TC-LOG-029 JPG' => ['log', 'govt_id_front.jpg', 'image/jpeg', 1258291, true], 'TC-LOG-029 PNG' => ['log', 'govt_id_front.png', 'image/png', 2516582, true], 'TC-LOG-029 PDF' => ['log', 'mayors_permit.pdf', 'application/pdf', 1363149, true],
    'TC-LOG-030 DOCX' => ['log', 'price_list.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 327680, false], 'TC-LOG-030 GIF' => ['log', 'store_banner.gif', 'image/gif', 491520, false], 'TC-LOG-030 EXE' => ['log', 'installer.exe', 'application/x-msdownload', 2202010, false],
    'TC-LOG-031 below' => ['log', 'size_4.9MB.jpg', 'image/jpeg', 5138022, true], 'TC-LOG-031 exact' => ['log', 'size_5.0MB.jpg', 'image/jpeg', 5242880, true], 'TC-LOG-031 above' => ['log', 'size_5.1MB.jpg', 'image/jpeg', 5347738, false],
    'TC-RID-016 JPG' => ['rid', 'drivers_license.jpg', 'image/jpeg', 1572864, true], 'TC-RID-016 PNG' => ['rid', 'drivers_license.png', 'image/png', 2097152, true], 'TC-RID-016 PDF' => ['rid', 'drivers_license.pdf', 'application/pdf', 716800, true],
    'TC-RID-017 DOCX' => ['rid', 'price_list.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 327680, false], 'TC-RID-017 GIF' => ['rid', 'store_banner.gif', 'image/gif', 491520, false], 'TC-RID-017 EXE' => ['rid', 'installer.exe', 'application/x-msdownload', 2202010, false],
    'TC-RID-018 below' => ['rid', 'size_4.9MB.jpg', 'image/jpeg', 5138022, true], 'TC-RID-018 exact' => ['rid', 'size_5.0MB.jpg', 'image/jpeg', 5242880, true], 'TC-RID-018 above' => ['rid', 'size_5.1MB.jpg', 'image/jpeg', 5347738, false],
    'TC-RID-018 one byte above' => ['rid', 'id.jpg', 'image/jpeg', 5242881, false], 'TC-LOG-031 one byte above' => ['log', 'id.jpg', 'image/jpeg', 5242881, false],
]);

test('forged company role status and center fields cannot redirect rider ownership', function () {
    Notification::fake();
    Storage::fake('local');
    $a = approvedRiderCompany();
    $b = approvedRiderCompany();
    $this->actingAs($a)->post(route('logistics.riders.store'), companyRiderData(['logistics_company_id' => $b->id, 'sorting_center_id' => $b->sortingCenters()->first()->id, 'role' => 'admin', 'status' => 'approved', 'email_verified_at' => now()]))->assertSessionHasNoErrors();
    $rider = User::where('email', 'pedrojose.garcia@example.com')->firstOrFail();
    expect($rider->logistics_company_id)->toBe($a->id);
    expect($rider->role)->toBe('courier');
    expect($rider->status)->toBe('unverified');
});
test('shared legacy center membership cannot override a created riders company ownership', function () {
    Notification::fake();
    Storage::fake('local');
    $a = approvedRiderCompany();
    $rider = invitedRider($a);
    $b = approvedRiderCompany();
    $center = $a->sortingCenters()->first();
    $center->forceFill(['company_user_id' => null])->save();
    $b->sortingCenters()->attach($center->id, ['granted_by' => $b->id]);
    $this->actingAs($b)->getJson('/accounts/'.$rider->id)->assertForbidden();
    $this->getJson('/reviews/'.$rider->application->id)->assertForbidden();
    $this->post(route('logistics.riders.resend', $rider->id))->assertNotFound();
});
test('company suspension prevents activation and resending outstanding invitations', function () {
    Notification::fake();
    Storage::fake('local');
    $company = approvedRiderCompany();
    $rider = invitedRider($company);
    $company->forceFill(['status' => 'suspended'])->save();
    $this->post('/logout');
    $this->post(route('rider.activation.store', riderActivationToken($rider)), ['password' => 'Rider@2026', 'password_confirmation' => 'Rider@2026'])->assertSessionHasErrors('activation');
    expect($rider->fresh()->password)->toBeNull();
});
test('activation token is bound to the current email and cannot promote another account', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    $token = riderActivationToken($rider);
    $this->post('/logout');
    $rider->forceFill(['email' => 'changed@example.com'])->save();
    $this->post(route('rider.activation.store', $token), ['password' => 'Rider@2026', 'password_confirmation' => 'Rider@2026', 'user_id' => 1, 'role' => 'admin'])->assertSessionHasErrors('activation');
    expect($rider->fresh()->password)->toBeNull();
});
test('a rider whose license expires before activation cannot become operational', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    DB::table('rider_profiles')->where('user_id', $rider->id)->update(['license_expires_at' => now('Asia/Manila')->subDay()->format('Y-m-d')]);
    $this->post('/logout');
    $this->post(route('rider.activation.store', riderActivationToken($rider)), ['password' => 'Rider@2026', 'password_confirmation' => 'Rider@2026'])->assertSessionHasErrors('activation');
    expect($rider->fresh()->status)->toBe('unverified');
});
test('company identifier database constraints reject stale validated competing submissions', function (string $field) {
    Notification::fake();
    Storage::fake('local');
    $data = logisticsRegistrationData();
    app(RegisterAccount::class)->create($data);
    $second = logisticsRegistrationData(['email' => 'logistics.test02@example.com', 'phone' => '09170000002', 'business_name' => 'Agila Cargo Movers Corp.', 'sec_number' => 'CS201998765', 'tin' => '567-890-123-000']);
    $second[$field] = $data[$field];
    expect(fn () => app(RegisterAccount::class)->create($second))->toThrow(ValidationException::class);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_documents', 4);
    Notification::assertNothingSent();
})->with(['business_name', 'sec_number', 'tin']);
test('rider identifier constraints reject stale validated creation after another insert', function (string $field) {
    Notification::fake();
    Storage::fake('local');
    $company = approvedRiderCompany();
    $data = companyRiderData();
    app(CreateCompanyRider::class)->create($company, $data);
    $second = companyRiderData(['email' => 'markanthony.bautista@example.com', 'phone' => '09662345678', 'license_number' => 'D05-19-123456', 'plate_number' => 'NBC1234']);
    $second[$field] = $data[$field];
    expect(fn () => app(CreateCompanyRider::class)->create($company, $second))->toThrow(ValidationException::class);
    $this->assertDatabaseCount('users', 2);
    $this->assertDatabaseCount('registration_documents', 2);
    $this->assertDatabaseCount('rider_activation_invitations', 1);
    Notification::assertNothingSent();
})->with(['license_number', 'plate_number', 'email', 'phone']);

test('activation enforces the exact twenty-four hour boundary', function (int $seconds, bool $valid) {
    Notification::fake();
    Storage::fake('local');
    $this->freezeTime();
    $rider = invitedRider(approvedRiderCompany());
    $this->post('/logout');
    $token = riderActivationToken($rider);
    $this->travel($seconds)->seconds();
    $this->get(route('rider.activation.show', $token))->assertInertia(fn (Assert $page) => $page->where('valid', $valid));
})->with([[86399, true], [86400, false], [86460, false]]);
test('ambiguous shared legacy centers require ownership reconciliation before new rider creation', function () {
    Notification::fake();
    Storage::fake('local');
    $a = approvedRiderCompany();
    $b = approvedRiderCompany();
    $aCenter = $a->sortingCenters()->first();
    $aCenter->forceFill(['company_user_id' => null])->save();
    $b->sortingCenters()->attach($aCenter->id, ['granted_by' => $b->id]);
    $this->actingAs($a)->post(route('logistics.riders.store'), companyRiderData())->assertForbidden();
    $this->assertDatabaseCount('rider_activation_invitations', 0);
    Notification::assertNothingSent();
});
test('new Google logistics applications cannot bypass full company validation', function () {
    Socialite::fake('google', Laravel\Socialite\Two\User::fake(['id' => 'new-company-google', 'email' => 'google-company@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'role' => 'sorting_center', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertRedirect(route('register'));
    $this->assertGuest();
    $this->post('/register', sharedRegistrationData(['role' => 'sorting_center', 'email' => 'google-company@example.com']))->assertSessionHasErrors(['sec_number', 'tin', 'service_regions', 'sec_certificate', 'bir_2303']);
    $this->assertDatabaseCount('users', 0);
});
test('Google verification of a complete unverified company applies the shared pending transition', function () {
    Notification::fake();
    Storage::fake('local');
    $this->post('/register', logisticsRegistrationData())->assertSessionHasNoErrors();
    $company = User::where('email', 'operations@bilishatid.example.com')->firstOrFail();
    $this->post('/logout');
    Socialite::fake('google', Laravel\Socialite\Two\User::fake(['id' => 'verify-company-google', 'email' => $company->email, 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]]);
    $this->get(route('auth.google.callback'))->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($company->fresh()->status)->toBe('pending');
    $this->get(route('logistics.riders.create'))->assertRedirect(route('application.waiting'));
});
test('a missing current company file requires replacement even when an older version exists', function () {
    Notification::fake();
    Storage::fake('local');
    $company = pendingWorkbookLogistics();
    $application = $company->application;
    $previous = $application->documents->firstWhere('kind', 'business_permit');
    $application->documents()->create(['kind' => 'business_permit', 'disk' => 'local', 'path' => 'missing-current.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 100]);
    $company->forceFill(['status' => 'rejected'])->save();
    $application->update(['status' => 'rejected', 'rejection_reason' => 'Replace current permit']);
    $data = logisticsRegistrationData();
    unset($data['business_permit']);
    $this->actingAs($company->fresh())->post('/application', $data)->assertSessionHasErrors('business_permit');
    Storage::disk('local')->assertExists($previous->path);
    expect($company->fresh()->status)->toBe('rejected');
});

test('failed invitation delivery preserves the rider and allows a safe resend', function () {
    Storage::fake('local');
    $company = approvedRiderCompany();
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('Synthetic SMTP failure'));
    $this->actingAs($company)->post(route('logistics.riders.store'), companyRiderData())->assertSessionHasNoErrors()->assertSessionHas('status', 'Rider created. Email could not be delivered; resend from the rider list.');
    $rider = User::where('email', 'pedrojose.garcia@example.com')->firstOrFail();
    expect($rider->password)->toBeNull();
    expect($rider->status)->toBe('unverified');
    expect(DB::table('rider_activation_invitations')->where('user_id', $rider->id)->value('expires_at'))->toBeLessThanOrEqual(now()->format('Y-m-d H:i:s'));
    Notification::fake();
    $this->post(route('logistics.riders.resend', $rider->id))->assertSessionHasNoErrors();
    Notification::assertSentTo($rider, RiderActivation::class);
    $this->assertDatabaseCount('rider_activation_invitations', 1);
});

test('another approved center member cannot keep a suspended companys riders operational', function () {
    Notification::fake();
    Storage::fake('local');
    $company = approvedRiderCompany();
    $rider = invitedRider($company);
    activateInvitedRider($rider);
    $other = approvedRiderCompany();
    $other->sortingCenters()->attach($rider->sorting_center_id, ['granted_by' => $other->id]);
    $company->forceFill(['status' => 'suspended'])->save();
    expect($rider->fresh()->canOperate())->toBeFalse();
    $this->actingAs($rider->fresh())->get('/dashboard/courier')->assertForbidden();
});

test('a company-created rider cannot transfer itself through legacy application resubmission', function () {
    Notification::fake();
    Storage::fake('local');
    $a = approvedRiderCompany();
    $rider = invitedRider($a);
    activateInvitedRider($rider);
    $rider->forceFill(['status' => 'rejected'])->save();
    $rider->application->update(['status' => 'rejected']);
    $b = approvedRiderCompany();
    $this->actingAs($rider->fresh())->post('/application', ['first_name' => 'Pedro Jose', 'last_name' => 'Garcia', 'sex' => 'male', 'birthday' => '1995-03-22', 'phone' => $rider->phone, 'province_code' => '130000000', 'city_code' => '137403000', 'barangay_code' => '137403016', 'line1' => 'Synthetic street', 'zip' => '1603', 'vehicle_type' => 'motorcycle', 'plate_number' => '123ABC', 'sorting_center_id' => $b->sortingCenters()->first()->id, 'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'), 'policy_accepted' => true])->assertSessionHasErrors('sorting_center_id');
    expect($rider->fresh()->sorting_center_id)->toBe($rider->sorting_center_id);
    expect($rider->fresh()->logistics_company_id)->toBe($a->id);
});

test('an activated rider can reverify a changed email while preserving required profile review', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = invitedRider(approvedRiderCompany());
    activateInvitedRider($rider);
    $this->actingAs($rider->fresh())->patch('/settings/profile', ['name' => $rider->name, 'email' => 'rider.changed@example.com', 'plate_number' => 'NEW1234', 'current_password' => 'Rider@2026'])->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $fresh = $rider->fresh();
    $this->actingAs($fresh)->post(route('verification.code'), ['code' => Notification::sent($fresh, VerifyAccountEmail::class)->last()->code])->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($rider->fresh()->hasVerifiedEmail())->toBeTrue();
    expect($rider->fresh()->status)->toBe('pending');
    expect($rider->fresh()->canOperate())->toBeFalse();
});
