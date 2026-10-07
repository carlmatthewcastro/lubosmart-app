<?php

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\SortingCenter;
use App\Models\Store;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function applicationApplicant(string $role = 'buyer', string $status = 'draft'): User
{
    $user = User::factory()->create(['role' => $role, 'status' => 'pending']);
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
    $rider = applicationApplicant('rider', 'approved');
    $rider->application->update(['sorting_center_id' => $center->id]);
    $otherRider = applicationApplicant('rider', 'approved');
    $otherRider->application->update(['sorting_center_id' => $otherCenter->id]);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->get('/reviews?status=approved')->assertInertia(fn (Assert $page) => $page->has('applications.data', 3)->where('applications.data.0.id', $seller->application->id)->where('filters.status', 'approved'));
    $logistics = User::factory()->create(['role' => 'logistics']);
    $logistics->sortingCenters()->attach($center->id, ['granted_by' => $admin->id]);
    $this->actingAs($logistics)->get('/reviews?status=approved')->assertInertia(fn (Assert $page) => $page->has('applications.data', 1)->where('applications.data.0.id', $rider->application->id));
    $this->get('/reviews?status=draft')->assertSessionHasErrors('status');
});

test('buyer submits validated details and private ID for review', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant();
    $this->actingAs($user)->post(route('application.store'), [...applicationPayload(), 'status' => 'approved', 'role' => 'admin'])->assertRedirect(route('application.edit'));
    $this->assertDatabaseHas('user_profiles', ['user_id' => $user->id, 'first_name' => 'Test', 'birthday' => '1995-04-12', 'province_code' => '043400000']);
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'submitted', 'requested_role' => 'buyer']);
    $this->assertDatabaseHas('addresses', ['user_id' => $user->id, 'province' => 'Laguna', 'city' => 'Test City', 'barangay' => 'Test Barangay']);
    expect($user->fresh()->status)->toBe('pending');
    $document = $user->fresh()->application->documents->sole();
    Storage::disk('local')->assertExists($document->path);
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
    $user = applicationApplicant('rider');
    $this->actingAs($user)->from('/application')->post('/application', [...applicationPayload(), 'vehicle_type' => 'motorcycle'])->assertRedirect('/application')->assertSessionHasErrors(['plate_number', 'vehicle_registration', 'sorting_center_id']);
});

test('a submitted application cannot be changed or submitted twice', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant('buyer', 'submitted');
    $this->actingAs($user)->from('/application')->post('/application', applicationPayload())->assertRedirect('/application')->assertSessionHasErrors('application');
    $this->assertDatabaseCount('user_profiles', 0);
    Storage::disk('local')->assertDirectoryEmpty('registration');
    Http::assertSentCount(3);
});

test('admin approval activates buyer and queues decision mail', function () {
    Notification::fake();
    $user = applicationApplicant('buyer', 'submitted');
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertRedirect(route('reviews.index'));
    expect($user->fresh()->status)->toBe('active');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'approved', 'reviewer_id' => $admin->id]);
    $this->assertDatabaseHas('audit_events', ['actor_id' => $admin->id, 'action' => 'approved']);
    Notification::assertSentTo($user, ApplicationReviewed::class, fn ($notification) => $notification->decision === 'approved');
});

test('rejection remains pending and supplies a resubmission reason', function () {
    Notification::fake();
    $user = applicationApplicant('buyer', 'submitted');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch(route('reviews.update', $user->application->id), ['decision' => 'rejected', 'reason' => 'Please upload a readable ID.'])->assertRedirect(route('reviews.index'));
    expect($user->fresh()->status)->toBe('pending');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'rejected', 'rejection_reason' => 'Please upload a readable ID.']);
    Notification::assertSentTo($user, ApplicationReviewed::class);
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
})->with(['buyer', 'seller', 'rider']);

test('admin can approve a courier assigned to a sorting center', function () {
    Notification::fake();
    $user = applicationApplicant('rider', 'submitted');
    $center = SortingCenter::query()->create(['code' => 'ADMIN-REVIEW', 'name' => 'Review center', 'address' => 'Synthetic address']);
    $user->application->update(['sorting_center_id' => $center->id]);
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertRedirect();
    expect($user->fresh()->status)->toBe('active');
    expect($user->sortingCenters()->where('sorting_centers.id', $center->id)->exists())->toBeTrue();
    Notification::assertSentTo($user, ApplicationReviewed::class);
});

test('logistics approves only riders in its assigned center', function (bool $sameCenter) {
    Notification::fake();
    $admin = User::factory()->create(['role' => 'admin']);
    $logistics = User::factory()->create(['role' => 'logistics']);
    $center = SortingCenter::query()->create(['code' => 'CENTER-A', 'name' => 'Center A', 'address' => 'Synthetic address']);
    $other = SortingCenter::query()->create(['code' => 'CENTER-B', 'name' => 'Center B', 'address' => 'Synthetic address']);
    $logistics->sortingCenters()->attach($center->id, ['granted_by' => $admin->id]);
    $user = applicationApplicant('rider', 'submitted');
    $user->application->update(['sorting_center_id' => $sameCenter ? $center->id : $other->id]);
    $response = $this->actingAs($logistics)->patch(route('reviews.update', $user->application->id), ['decision' => 'approved']);
    if ($sameCenter) {
        $response->assertRedirect(route('reviews.index'));
        expect($user->fresh()->status)->toBe('active');
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
    $this->actingAs(User::factory()->create())->get(route('registration-documents.show', $document->id))->assertForbidden();
});

test('document owners can download their private documents', function () {
    Storage::fake('local');
    $owner = applicationApplicant();
    Storage::disk('local')->put('registration/private.pdf', 'synthetic document');
    $document = $owner->application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/private.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 18]);
    $this->actingAs($owner)->get(route('registration-documents.show', $document->id))->assertDownload('identity.pdf');
});

test('administrators cannot activate pending accounts through status management', function () {
    $user = applicationApplicant();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->from('/accounts')->patch(route('accounts.update', $user->id), ['status' => 'active', 'reason' => 'Trying to bypass review'])->assertRedirect('/accounts')->assertSessionHasErrors('status');
    expect($user->fresh()->status)->toBe('pending');
});

test('administrators can suspend approved accounts with an audit reason', function () {
    $user = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->from('/accounts')->patch(route('accounts.update', $user->id), ['status' => 'suspended', 'reason' => 'Test suspension'])->assertRedirect('/accounts');
    expect($user->fresh()->status)->toBe('suspended');
    $this->assertDatabaseHas('audit_events', ['subject_id' => $user->id, 'actor_id' => $admin->id, 'action' => 'status_changed']);
});

test('rejected applicants can resubmit and clear the old review decision', function () {
    Storage::fake('local');
    fakeApplicationLocations();
    $user = applicationApplicant('buyer', 'rejected');
    $user->application->update(['rejection_reason' => 'Unreadable ID', 'reviewer_id' => User::factory()->create(['role' => 'admin'])->id, 'reviewed_at' => now()]);
    $this->actingAs($user)->post('/application', applicationPayload())->assertRedirect(route('application.edit'));
    $this->assertDatabaseHas('registration_applications', ['user_id' => $user->id, 'status' => 'submitted', 'rejection_reason' => null, 'reviewer_id' => null, 'reviewed_at' => null]);
    Http::assertSentCount(3);
});

test('approved logistics applicants receive a center and membership', function () {
    Notification::fake();
    $user = applicationApplicant('logistics', 'submitted');
    $address = Address::query()->create(['user_id' => $user->id, 'label' => 'Registration', 'recipient_name' => 'Logistics Test', 'phone' => '09171234567', 'line1' => 'Synthetic address', 'barangay' => 'Test Barangay', 'city' => 'Test City', 'province' => 'Test Province', 'region' => 'Test Region', 'zip' => '4000']);
    $user->application->forceFill(['address_id' => $address->id, 'business_name' => 'Test Center'])->save();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch(route('reviews.update', $user->application->id), ['decision' => 'approved'])->assertRedirect(route('reviews.index'));
    $center = SortingCenter::query()->where('code', 'APP-'.$user->application->id)->firstOrFail();
    $this->assertDatabaseHas('sorting_center_user', ['user_id' => $user->id, 'sorting_center_id' => $center->id, 'granted_by' => $admin->id]);
    expect($user->fresh()->status)->toBe('active');
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
