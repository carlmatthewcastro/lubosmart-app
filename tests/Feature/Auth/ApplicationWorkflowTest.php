<?php

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\SortingCenter;
use App\Models\Store;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

function applicationApplicant(string $role = 'buyer', string $status = 'draft'): User
{
    $user = User::factory()->create(['role' => $role, 'status' => match ($status) {
        'draft' => 'incomplete', 'submitted' => 'pending', default => $status
    }]);
    RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => $role, 'status' => $status]);

    return $user;
}

function fakeApplicationLocations(): void
{
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);
}

function applicationPayload(): array
{
    return ['first_name' => 'Test', 'last_name' => 'Applicant', 'sex' => 'female', 'birthday' => '1995-04-12', 'phone' => '09171234567', 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => 'Synthetic Street 1', 'zip' => '4000', 'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'), 'policy_accepted' => true];
}

test('review status filters preserve role and sorting center authorization', function () {
    $seller = applicationApplicant('seller', 'approved');
    applicationApplicant('seller', 'submitted');
    $center = SortingCenter::query()->create(['code' => 'CENTER-A', 'name' => 'Center A', 'address' => 'Test Street']);
    $otherCenter = SortingCenter::query()->create(['code' => 'CENTER-B', 'name' => 'Center B', 'address' => 'Other Street']);
    $rider = applicationApplicant('courier', 'approved');
    $rider->application->update(['sorting_center_id' => $center->id]);
    $rider->forceFill(['sorting_center_id' => $center->id])->save();
    $otherRider = applicationApplicant('courier', 'approved');
    $otherRider->application->update(['sorting_center_id' => $otherCenter->id]);
    $otherRider->forceFill(['sorting_center_id' => $otherCenter->id])->save();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->get('/reviews?status=approved')->assertInertia(fn (Assert $page) => $page->has('applications.data', 3)->where('applications.data.0.id', $seller->application->id)->where('filters.status', 'approved'));
    $logistics = User::factory()->create(['role' => 'sorting_center']);
    $logistics->sortingCenters()->attach($center->id, ['granted_by' => $admin->id]);
    $this->actingAs($logistics)->get('/reviews?status=approved')->assertInertia(fn (Assert $page) => $page->has('applications.data', 1)->where('applications.data.0.id', $rider->application->id));
    $this->actingAs($admin)->get('/reviews?status=draft')->assertSessionHasErrors('status');
});

test('buyer submits validated details and private ID for review', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant();
    $this->actingAs($user)->post(route('application.store'), [...applicationPayload(), 'status' => 'approved', 'role' => 'admin', 'age' => 999,
        'house_number' => '14', 'street' => 'Verified Street', 'line1' => 'Injected address', 'province' => 'Injected province',
    ])->assertSessionHasNoErrors()->assertRedirect(route('application.waiting'));
    $this->assertDatabaseHas('user_profiles', ['user_id' => $user->id, 'first_name' => 'Test', 'birthday' => '1995-04-12', 'province_code' => '043400000']);
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'submitted', 'requested_role' => 'buyer']);
    $this->assertDatabaseHas('addresses', ['user_id' => $user->id, 'province' => 'Laguna', 'city' => 'Test City', 'barangay' => 'Test Barangay',
        'line1' => '14 Verified Street', 'house_number' => '14', 'street' => 'Verified Street',
    ]);
    expect($user->fresh()->status)->toBe('pending');
    $document = $user->fresh()->application->documents->sole();
    Storage::disk('local')->assertExists($document->path);
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/reviews/'.$user->fresh()->application->id)
        ->assertInertia(fn (Assert $page) => $page->where('profile.age', Carbon::parse('1995-04-12')->age));
    Http::assertSent(fn ($request) => $request->url() === 'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/');
});

test('invalid address hierarchy does not save profiles or files', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant();
    $this->actingAs($user)->from('/application')->post('/application', [...applicationPayload(), 'city_code' => '043405000'])->assertRedirect('/application')->assertSessionHasErrors('barangay_code');
    $this->assertDatabaseCount('user_profiles', 0);
    $this->assertDatabaseCount('registration_documents', 0);
    Http::assertSentCount(2);
});

test('the current application form reports missing house and street fields rather than accepting a stale combined address', function () {
    Storage::fake('local');
    $user = applicationApplicant();
    $this->actingAs($user)->post('/application', [...applicationPayload(), 'house_number' => '', 'street' => ''])
        ->assertSessionHasErrors(['house_number', 'street']);
    $this->assertDatabaseCount('addresses', 0);
    $this->assertDatabaseCount('registration_documents', 0);
});

test('required identity and policy cannot be omitted', function () {
    $user = applicationApplicant();
    $data = applicationPayload();
    unset($data['identity'], $data['policy_accepted']);
    $this->actingAs($user)->from('/application')->post('/application', $data)->assertRedirect('/application')->assertSessionHasErrors(['identity', 'policy_accepted']);
    $this->assertDatabaseCount('user_profiles', 0);
});

test('seller requires a department and business permit', function () {
    $user = applicationApplicant('seller');
    $this->actingAs($user)->from('/application')->post('/application', applicationPayload())->assertRedirect('/application')->assertSessionHasErrors(['business_name', 'business_category_id', 'business_permit']);
});

test('rider requires vehicle registration and a reviewing center', function () {
    $user = applicationApplicant('courier');
    $this->actingAs($user)->from('/application')->post('/application', [...applicationPayload(), 'vehicle_type' => 'motorcycle'])->assertRedirect('/application')->assertSessionHasErrors(['plate_number', 'vehicle_registration', 'sorting_center_id']);
});

test('rider submission links the selected approved logistics center while leaving approval pending', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $rider = applicationApplicant('courier');
    $center = linkRiderToApprovedCenter($rider);
    $rider->forceFill(['sorting_center_id' => null])->save();
    $this->actingAs($rider)->post('/application', [...applicationPayload(),
        'vehicle_type' => 'motorcycle', 'plate_number' => 'TEST123', 'sorting_center_id' => $center->id,
        'license' => UploadedFile::fake()->create('license.pdf', 10, 'application/pdf'),
        'vehicle_registration' => UploadedFile::fake()->create('orcr.pdf', 10, 'application/pdf'),
    ])->assertRedirect('/application/waiting')->assertSessionHasNoErrors();
    expect($rider->fresh()->status)->toBe('pending');
    expect($rider->fresh()->sorting_center_id)->toBe($center->id);
    expect($rider->fresh()->application->sorting_center_id)->toBe($center->id);
    expect($rider->fresh()->application->documents)->toHaveCount(3);
});

test('a center with an unapproved operator cannot receive rider applications', function () {
    $rider = applicationApplicant('courier');
    $center = linkRiderToApprovedCenter($rider);
    $center->users()->where('role', 'sorting_center')->firstOrFail()->forceFill(['status' => 'pending'])->save();
    $rider->forceFill(['sorting_center_id' => null])->save();
    $this->actingAs($rider)->post('/application', [...applicationPayload(), 'sorting_center_id' => $center->id])->assertSessionHasErrors('sorting_center_id');
    $this->get('/application')->assertInertia(fn (Assert $page) => $page->has('centers', 0));
});

test('rider registration requires both a license and plate number for every vehicle choice', function (string $vehicle) {
    $user = applicationApplicant('courier');
    $this->actingAs($user)->post('/application', [...applicationPayload(), 'vehicle_type' => $vehicle])->assertSessionHasErrors(['license', 'plate_number']);
    expect($user->fresh()->status)->toBe('incomplete');
    $this->assertDatabaseCount('registration_documents', 0);
})->with(['motorcycle', 'bicycle']);

test('a submitted application cannot be changed or submitted twice', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant('buyer', 'submitted');
    $this->actingAs($user)->from('/application')->post('/application', applicationPayload())->assertRedirect('/application/waiting');
    $this->assertDatabaseCount('user_profiles', 0);
    Storage::disk('local')->assertDirectoryEmpty('registration');
    Http::assertNothingSent();
});

test('admin approval activates buyer and queues decision mail', function () {
    Notification::fake();
    $user = applicationApplicant('buyer', 'submitted');
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertRedirect(route('reviews.index'));
    expect($user->fresh()->status)->toBe('approved');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'approved', 'reviewer_id' => $admin->id]);
    $this->assertDatabaseHas('audit_events', ['actor_id' => $admin->id, 'action' => 'approved']);
    Notification::assertSentTo($user, ApplicationReviewed::class, fn ($notification) => $notification->decision === 'approved');
});

test('rejection sets rejected status and supplies a resubmission reason', function () {
    Notification::fake();
    $user = applicationApplicant('buyer', 'submitted');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch(route('reviews.update', $user->application->id), ['decision' => 'rejected', 'reason' => 'Please upload a readable ID.'])->assertRedirect(route('reviews.index'));
    expect($user->fresh()->status)->toBe('rejected');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'rejected', 'rejection_reason' => 'Please upload a readable ID.']);
    Notification::assertSentTo($user, ApplicationReviewed::class);
});

test('rejecting an application requires a reason without changing its review state', function () {
    Notification::fake();
    $user = applicationApplicant('seller', 'submitted');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch(route('reviews.update', $user->application->id), ['decision' => 'rejected', 'reason' => ' '])->assertSessionHasErrors('reason');
    expect($user->fresh()->status)->toBe('pending');
    expect($user->fresh()->application->status)->toBe('submitted');
    Notification::assertNothingSent();
});

test('reviewing an already decided application does not produce another decision', function () {
    Notification::fake();
    $user = applicationApplicant('buyer', 'approved');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->from('/reviews')->patch(route('reviews.update', $user->application->id), ['decision' => 'rejected', 'reason' => 'Second decision'])->assertRedirect('/reviews')->assertSessionHasErrors('decision');
    $this->assertDatabaseHas('registration_applications', ['id' => $user->application->id, 'status' => 'approved']);
    Notification::assertNothingSent();
});

test('buyer and seller cannot review applications', function (string $role) {
    $user = applicationApplicant('buyer', 'submitted');
    $this->actingAs(User::factory()->create(['role' => $role]))->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertForbidden();
    expect($user->fresh()->status)->toBe('pending');
})->with(['buyer', 'seller', 'courier']);

test('admin courier override requires an audit reason', function () {
    Notification::fake();
    $user = applicationApplicant('courier', 'submitted');
    $center = SortingCenter::query()->create(['code' => 'ADMIN-REVIEW', 'name' => 'Review center', 'address' => 'Synthetic address']);
    $user->application->update(['sorting_center_id' => $center->id]);
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get(route('reviews.show', $user->application->id))->assertOk();
    $this->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertSessionHasErrors('reason');
    expect($user->fresh()->status)->toBe('pending');
    Notification::assertNothingSent();
});

test('logistics can approve only riders applying to its own center', function (bool $sameCenter) {
    Notification::fake();
    $admin = User::factory()->create(['role' => 'admin']);
    $logistics = User::factory()->create(['role' => 'sorting_center']);
    $center = SortingCenter::query()->create(['code' => 'CENTER-A', 'name' => 'Center A', 'address' => 'Synthetic address']);
    $other = SortingCenter::query()->create(['code' => 'CENTER-B', 'name' => 'Center B', 'address' => 'Synthetic address']);
    $logistics->sortingCenters()->attach($center->id, ['granted_by' => $admin->id]);
    $user = applicationApplicant('courier', 'submitted');
    $user->application->update(['sorting_center_id' => $sameCenter ? $center->id : $other->id]);
    $user->forceFill(['sorting_center_id' => $sameCenter ? $center->id : $other->id])->save();
    $response = $this->actingAs($logistics)->patch(route('reviews.update', $user->application->id), ['decision' => 'approved']);
    if ($sameCenter) {
        $response->assertRedirect(route('reviews.index'));
        expect($user->fresh()->status)->toBe('approved');
        expect($user->fresh()->sorting_center_id)->toBe($center->id);
        Notification::assertSentTo($user, ApplicationReviewed::class);
    } else {
        $response->assertForbidden();
        expect($user->fresh()->status)->toBe('pending');
        Notification::assertNothingSent();
    }
})->with([true, false]);

test('other applicants cannot download private documents', function () {
    Storage::fake('local');
    $owner = applicationApplicant();
    Storage::disk('local')->put('registration/private.pdf', 'synthetic document');
    $document = $owner->application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/private.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 18]);
    $this->actingAs(User::factory()->create())->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertForbidden();
});

test('document downloads are limited to approvers and admin even for the applicant', function () {
    Storage::fake('local');
    $owner = applicationApplicant();
    Storage::disk('local')->put('registration/private.pdf', 'synthetic document');
    $document = $owner->application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/private.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 18]);
    $this->actingAs($owner)->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertOk()->assertHeader('Content-Type', 'application/pdf');
});

test('administrators cannot activate incomplete accounts through status management', function () {
    $user = applicationApplicant();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->from('/accounts')->patch(route('accounts.update', $user->id), ['status' => 'approved', 'reason' => 'Trying to bypass review'])->assertRedirect('/accounts')->assertSessionHasErrors('status');
    expect($user->fresh()->status)->toBe('incomplete');
});

test('administrators can suspend approved accounts with an audit reason', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->from('/accounts')->patch(route('accounts.update', $user->id), ['status' => 'suspended', 'reason' => 'Test suspension'])->assertRedirect('/accounts');
    expect($user->fresh()->status)->toBe('suspended');
    $this->assertDatabaseHas('audit_events', ['subject_id' => $user->id, 'actor_id' => $admin->id, 'action' => 'suspended']);
});

test('rejected applicants can resubmit and clear the old review decision', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant('buyer', 'rejected');
    $user->application->update(['rejection_reason' => 'Unreadable ID', 'reviewer_id' => User::factory()->create(['role' => 'admin'])->id, 'reviewed_at' => now()]);
    $this->actingAs($user)->post('/application', applicationPayload())->assertRedirect(route('application.waiting'));
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'submitted', 'rejection_reason' => null, 'reviewer_id' => null, 'reviewed_at' => null]);
    Http::assertSentCount(3);
});

test('approved logistics applicants receive a center and membership', function () {
    Notification::fake();
    $user = applicationApplicant('sorting_center', 'submitted');
    $address = Address::query()->create(['user_id' => $user->id, 'label' => 'Registration', 'recipient_name' => 'Logistics Test', 'phone' => '09171234567', 'line1' => 'Synthetic address', 'barangay' => 'Test Barangay', 'city' => 'Test City', 'province' => 'Test Province', 'region' => 'Test Region', 'zip' => '4000']);
    $user->application->forceFill(['address_id' => $address->id, 'business_name' => 'Test Center'])->save();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertRedirect(route('reviews.index'));
    $center = SortingCenter::query()->where('code', 'APP-'.$user->application->id)->firstOrFail();
    $this->assertDatabaseHas('sorting_center_user', ['user_id' => $user->id, 'sorting_center_id' => $center->id, 'granted_by' => $admin->id]);
    expect($user->fresh()->status)->toBe('approved');
    Notification::assertSentTo($user, ApplicationReviewed::class);
});

test('approving a seller approves only that seller store', function () {
    Notification::fake();
    $user = applicationApplicant('seller', 'submitted');
    Store::query()->create(['user_id' => $user->id, 'name' => 'Reviewed store']);
    $other = User::factory()->create(['role' => 'seller']);
    Store::query()->create(['user_id' => $other->id, 'name' => 'Other store']);
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertRedirect(route('reviews.index'));
    $this->assertDatabaseHas('stores', ['user_id' => $user->id, 'status' => 'approved']);
    $this->assertDatabaseHas('stores', ['user_id' => $other->id, 'status' => 'pending']);
    Notification::assertSentTo($user, ApplicationReviewed::class);
});

test('location service failure leaves the application unchanged', function () {
    Http::preventStrayRequests();
    Http::fake(['https://psgc.gitlab.io/api/provinces/' => Http::response([], 503)]);
    $user = applicationApplicant();
    $this->actingAs($user)->from('/application')->post('/application', applicationPayload())->assertRedirect('/application')->assertSessionHasErrors('province_code');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'draft']);
    $this->assertDatabaseCount('registration_documents', 0);
    Http::assertSentCount(1);
});
