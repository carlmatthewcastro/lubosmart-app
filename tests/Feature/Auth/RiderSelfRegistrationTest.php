<?php

use App\Models\SortingCenter;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

function selfRegistrationCompany(): User
{
    $company = User::factory()->create(['role' => 'sorting_center']);
    $center = SortingCenter::create(['code' => 'SELF-'.$company->id, 'name' => 'Company '.$company->id, 'address' => 'Synthetic address']);
    $center->forceFill(['company_user_id' => $company->id])->save();
    $company->sortingCenters()->attach($center->id, ['granted_by' => $company->id]);

    return $company;
}

function selfRegistrationRider(User $company): User
{
    $centerId = $company->sortingCenters()->sole()->id;
    $rider = User::factory()->create(['role' => 'courier', 'status' => 'pending', 'sorting_center_id' => $centerId, 'logistics_company_id' => $company->id]);
    $rider->application()->create(['requested_role' => 'courier', 'status' => 'submitted', 'sorting_center_id' => $centerId, 'registration_contract' => 'self-service-rider-2026-10', 'submitted_at' => now()]);

    return $rider;
}

function selfRegistrationRequirements(int $centerId): array
{
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);

    return [
        'first_name' => 'Test', 'last_name' => 'Rider', 'sex' => 'female', 'birthday' => '1995-01-01', 'phone' => '09170000001',
        'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => 'Synthetic Street', 'zip' => '4000',
        'vehicle_type' => 'motorcycle', 'plate_number' => 'SELF123', 'sorting_center_id' => $centerId, 'policy_accepted' => true,
        'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'),
        'license' => UploadedFile::fake()->create('license.pdf', 10, 'application/pdf'),
        'vehicle_registration' => UploadedFile::fake()->create('or-cr.pdf', 10, 'application/pdf'),
    ];
}

test('public rider signup verifies email submits requirements and waits for its own Logistics approval', function () {
    Notification::fake();
    Storage::fake('local');
    $company = selfRegistrationCompany();
    $other = selfRegistrationCompany();
    $centerId = $company->sortingCenters()->sole()->id;

    $this->post('/register', riderRegistrationData(['last_name' => 'Rider', 'status' => 'approved', 'logistics_company_id' => $other->id, 'sorting_center_id' => $centerId]))
        ->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $rider = User::where('email', 'shared@example.com')->sole();
    expect($rider->status)->toBe('unverified');
    expect($rider->logistics_company_id)->toBe($company->id);
    expect($rider->application->status)->toBe('submitted');
    Notification::assertSentTo($rider, VerifyAccountEmail::class);
    $code = Notification::sent($rider, VerifyAccountEmail::class)->sole()->code;
    $this->post(route('verification.code'), ['code' => $code])->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($rider->fresh()->canOperate())->toBeFalse();
    $this->actingAs($rider->fresh())->get('/dashboard/courier')->assertRedirect(route('application.waiting'));
    $this->get('/application')->assertRedirect(route('application.waiting'));
    $this->assertDatabaseHas('users', ['id' => $rider->id, 'role' => 'courier', 'status' => 'pending', 'logistics_company_id' => $company->id, 'sorting_center_id' => $centerId]);
    $this->assertDatabaseHas('registration_applications', ['user_id' => $rider->id, 'status' => 'submitted', 'registration_contract' => 'self-service-rider-2026-10']);
    $this->assertDatabaseCount('rider_activation_invitations', 0);
    $this->assertDatabaseCount('registration_documents', 3);
    foreach ($rider->fresh()->application->documents as $document) {
        Storage::disk('local')->assertExists($document->path);
    }
    $this->actingAs($rider->fresh())->get('/deliveries')->assertRedirect(route('application.waiting'));
    $applicationId = $rider->application->id;
    $this->post('/logout')->assertRedirect('/');
    $this->actingAs($company)->get('/reviews')->assertOk()->assertInertia(fn (Assert $page) => $page->has('applications.data', 1)->where('applications.data.0.id', $applicationId));
    $this->get('/logistics/riders')->assertOk()->assertInertia(fn (Assert $page) => $page->has('riders', 1)->where('riders.0.pendingActivation', false)->where('riders.0.applicationId', $applicationId)->where('riders.0.canReview', true)->where('riders.0.canManage', false));
    $this->actingAs($other)->get('/reviews')->assertOk()->assertInertia(fn (Assert $page) => $page->has('applications.data', 0));
    $this->get('/logistics/riders')->assertOk()->assertInertia(fn (Assert $page) => $page->has('riders', 0));
    $this->patch('/reviews/'.$applicationId, ['decision' => 'approved'])->assertForbidden();
    $this->actingAs($company)->patch('/reviews/'.$applicationId, ['decision' => 'approved'])->assertSessionHasNoErrors()->assertRedirect(route('reviews.index'));
    $this->assertDatabaseHas('registration_applications', ['id' => $applicationId, 'status' => 'approved', 'reviewer_id' => $company->id]);
    expect($rider->fresh()->canOperate())->toBeTrue();
    Notification::assertSentTo($rider, ApplicationReviewed::class);
    $this->get('/logistics/riders')->assertInertia(fn (Assert $page) => $page->where('riders.0.canReview', false)->where('riders.0.canManage', true));
    $this->post('/logout')->assertRedirect('/');
    $this->actingAs($rider->fresh())->get('/dashboard/courier')->assertOk();
});

test('only assigned Logistics can review a self-registered rider at the policy boundary', function (string $role) {
    $company = selfRegistrationCompany();
    $rider = selfRegistrationRider($company);
    $actor = User::factory()->create(['role' => $role]);

    expect(Gate::forUser($actor)->allows('review', $rider->application))->toBeFalse();
    expect(Gate::forUser($company)->allows('review', $rider->application))->toBeTrue();
    expect(Gate::forUser($rider)->allows('review', $rider->application))->toBeFalse();
})->with(['buyer', 'seller', 'courier', 'sorting_center', 'admin']);

test('incomplete Rider registration reports requirements on the same signup without creating an account', function () {
    Notification::fake();
    Storage::fake('local');

    $this->from('/register?role=courier')->post('/register', sharedRegistrationData(['role' => 'courier', 'sex' => null]))
        ->assertRedirect('/register?role=courier')->assertSessionHasErrors(['sex', 'sorting_center_id', 'vehicle_type', 'plate_number', 'province_code', 'identity', 'license', 'vehicle_registration']);

    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('registration_documents', 0);
    Notification::assertNothingSent();
});

test('bad Rider uploads and unavailable centers reject the complete signup without partial files', function (string $invalid) {
    Notification::fake();
    Storage::fake('local');
    $data = riderRegistrationData();
    if ($invalid === 'sorting_center_id') {
        SortingCenter::findOrFail($data['sorting_center_id'])->update(['is_active' => false]);
    } else {
        $data[$invalid] = UploadedFile::fake()->create('unsupported.exe', 10, 'application/octet-stream');
    }

    $this->post('/register', $data)->assertSessionHasErrors($invalid);

    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('registration_applications', 0);
    $this->assertDatabaseCount('registration_documents', 0);
    Storage::disk('local')->assertDirectoryEmpty('registration');
    Notification::assertNothingSent();
})->with(['identity', 'license', 'vehicle_registration', 'sorting_center_id']);

test('Admin excludes self-registered riders from its approval queue and cannot approve them', function () {
    Notification::fake();
    $rider = selfRegistrationRider(selfRegistrationCompany());
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->get('/dashboard/admin')->assertInertia(fn (Assert $page) => $page->where('stats.Pending review', 0)->has('adminOverview.applications', 0)->where('adminWorkspace.badges.registrations', 0));
    $this->get('/reviews')->assertInertia(fn (Assert $page) => $page->has('applications.data', 0));
    $this->getJson('/reviews/'.$rider->application->id)->assertForbidden();
    $this->patch('/reviews/'.$rider->application->id, ['decision' => 'approved', 'reason' => 'Attempted bypass'])->assertForbidden();
    expect($rider->fresh()->status)->toBe('pending');
    Notification::assertNothingSent();
});

test('Rider requirements reject unavailable centers and missing documents without submitting', function () {
    Notification::fake();
    Storage::fake('local');
    $company = selfRegistrationCompany();
    $center = $company->sortingCenters()->sole();
    $center->update(['is_active' => false]);
    $rider = User::factory()->create(['role' => 'courier', 'status' => 'incomplete']);
    $rider->application()->create(['requested_role' => 'courier', 'registration_contract' => 'self-service-rider-2026-10']);
    $data = selfRegistrationRequirements($center->id);
    unset($data['license'], $data['vehicle_registration']);

    $this->actingAs($rider)->post('/application', $data)->assertSessionHasErrors(['sorting_center_id', 'license', 'vehicle_registration']);
    expect($rider->fresh()->status)->toBe('incomplete');
    $this->assertDatabaseCount('registration_documents', 0);
    Notification::assertNothingSent();
});

test('Logistics rejection gives a reason and rider can resubmit without gaining operational access', function () {
    Notification::fake();
    Storage::fake('local');
    $company = selfRegistrationCompany();
    $rider = selfRegistrationRider($company);
    $rider->forceFill(['phone' => '09170000001'])->save();

    $this->actingAs($company)->patch('/reviews/'.$rider->application->id, ['decision' => 'rejected'])->assertSessionHasErrors('reason');
    $this->patch('/reviews/'.$rider->application->id, ['decision' => 'rejected', 'reason' => 'Replace unreadable license'])->assertSessionHasNoErrors();
    expect($rider->fresh()->status)->toBe('rejected');
    Notification::assertSentTo($rider, ApplicationReviewed::class);
    $this->actingAs($rider->fresh())->get('/dashboard/courier')->assertRedirect(route('application.edit'));
    $this->post('/application', selfRegistrationRequirements($rider->sorting_center_id))->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    expect($rider->fresh()->status)->toBe('pending');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $rider->id, 'status' => 'submitted', 'reviewer_id' => null, 'rejection_reason' => null]);
});

test('Google cannot create an incomplete rider that bypasses the combined registration', function () {
    Socialite::fake('google', GoogleUser::fake(['id' => 'self-rider-google', 'email' => 'google.rider@example.com', 'verified_email' => true]));
    session(['google_registration' => ['intent' => 'register', 'role' => 'courier', 'started_at' => now()->timestamp]]);

    $this->get(route('auth.google.callback'))->assertSessionHasErrors('google');
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('rider_activation_invitations', 0);
});
