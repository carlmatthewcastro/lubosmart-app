<?php

use App\Models\Category;
use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function draftApplicant(string $role = 'seller', string $status = 'draft'): User
{
    $user = User::factory()->create(['role' => $role, 'status' => match ($status) {
        'draft' => 'incomplete', 'submitted' => 'pending', default => $status
    }]);
    RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => $role, 'status' => $status]);

    return $user;
}

test('a partial application draft saves and resumes without changing privileges', function () {
    $user = draftApplicant();
    $this->actingAs($user)->post('/application/draft', ['first_name' => 'Jane', 'current_step' => 'role', 'business_name' => 'Jane Store', 'role' => 'admin', 'status' => 'approved', 'reviewer_id' => 999])->assertRedirect('/application')->assertSessionHasNoErrors();
    $application = $user->fresh()->application;
    expect($application->status)->toBe('draft');
    expect($application->draft_data)->toBe(['first_name' => 'Jane', 'business_name' => 'Jane Store', 'current_step' => 'role']);
    expect($application->draft_saved_at)->not->toBeNull();
    expect($application->reviewer_id)->toBeNull();
    expect($user->fresh()->status)->toBe('incomplete');
    $this->assertDatabaseCount('stores', 0);
    $this->assertDatabaseCount('user_profiles', 0);
    $this->assertDatabaseCount('addresses', 0);
    $this->get('/inventory')->assertRedirect('/application');
    $this->get('/application')->assertInertia(fn (Assert $page) => $page->where('application.draft_data.first_name', 'Jane')->where('application.draft_data.current_step', 'role'));
});

test('saving drafts retains earlier values and rejects invalid category or date values', function () {
    $user = draftApplicant();
    $category = Category::query()->create(['name' => 'Inactive', 'slug' => 'inactive', 'is_active' => false]);
    $this->actingAs($user)->post('/application/draft', ['first_name' => 'Jane'])->assertSessionHasNoErrors();
    $this->post('/application/draft', ['business_name' => 'Store'])->assertSessionHasNoErrors();
    expect($user->fresh()->application->draft_data)->toBe(['first_name' => 'Jane', 'business_name' => 'Store']);
    $this->post('/application/draft', ['birthday' => '2999-01-01', 'business_category_id' => $category->id])->assertSessionHasErrors(['birthday', 'business_category_id']);
    expect($user->fresh()->application->draft_data)->toBe(['first_name' => 'Jane', 'business_name' => 'Store']);
});

test('draft documents stay private and only authorized users can download them', function () {
    Storage::fake('local');
    $user = draftApplicant();
    $this->actingAs($user)->post('/application/draft', ['identity' => UploadedFile::fake()->create('identity.pdf', 10, 'application/pdf')])->assertSessionHasNoErrors();
    $document = $user->fresh()->application->documents->sole();
    Storage::disk('local')->assertExists($document->path);
    $this->get(route('registration-documents.show', $document))->assertForbidden();
    $this->actingAs(User::factory()->create())->get(route('registration-documents.show', $document))->assertForbidden();
});

test('submitted applications cannot be changed by saving a draft', function () {
    $user = draftApplicant('seller', 'submitted');
    $this->actingAs($user)->post('/application/draft', ['first_name' => 'Changed'])->assertRedirect('/application/waiting');
    expect($user->fresh()->application->draft_data)->toBeNull();
});

test('rejected applications can save corrections without erasing the reviewer decision', function () {
    $user = draftApplicant('seller', 'rejected');
    $user->application->update(['rejection_reason' => 'Upload a clearer ID']);
    $this->actingAs($user)->post('/application/draft', ['first_name' => 'Corrected'])->assertSessionHasNoErrors();
    expect($user->fresh()->application->status)->toBe('rejected');
    expect($user->fresh()->application->rejection_reason)->toBe('Upload a clearer ID');
});

test('guests unverified users and active buyers cannot save role application drafts', function () {
    $this->post('/application/draft', [])->assertRedirect('/login');
    $user = draftApplicant();
    $user->forceFill(['email_verified_at' => null])->save();
    $this->actingAs($user)->post('/application/draft', [])->assertRedirect(route('verification.notice'));
    $this->actingAs(User::factory()->create())->post('/application/draft', [])->assertForbidden();
});

test('a seller submits saved private documents and creates the store only at final submission', function () {
    Storage::fake('local');
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);
    $user = draftApplicant();
    $category = Category::query()->create(['name' => 'Home', 'slug' => 'home']);
    $data = ['first_name' => 'Jane', 'last_name' => 'Seller', 'sex' => 'female', 'birthday' => '1995-04-12', 'phone' => '09171234567', 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => '10 Test Street', 'zip' => '4000', 'business_name' => 'Jane Store', 'business_category_id' => $category->id];
    $this->actingAs($user)->post('/application/draft', [...$data, 'current_step' => 'review', 'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'), 'business_permit' => UploadedFile::fake()->create('permit.pdf', 10, 'application/pdf')])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('stores', 0);
    $this->post('/application', [...$data, 'policy_accepted' => true])->assertSessionHasNoErrors()->assertRedirect('/application/waiting');
    $this->assertDatabaseHas('stores', ['user_id' => $user->id, 'name' => 'Jane Store', 'business_category_id' => $category->id, 'status' => 'pending']);
    expect($user->fresh()->application->status)->toBe('submitted');
    expect($user->fresh()->application->draft_data)->toBeNull();
    expect($user->fresh()->status)->toBe('pending');
    $this->assertDatabaseCount('registration_documents', 2);
    Http::assertSentCount(3);
});

test('partial address drafts validate selected values and parent relationships without losing saved data', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);
    $user = draftApplicant('buyer');
    $this->actingAs($user)->post('/application/draft', ['province_code' => '043400000'])->assertSessionHasNoErrors();
    $this->post('/application/draft', ['city_code' => '999999999'])->assertSessionHasErrors('city_code');
    expect($user->fresh()->application->draft_data)->toBe(['province_code' => '043400000']);
    $this->post('/application/draft', ['city_code' => '043404000'])->assertSessionHasNoErrors();
    $this->post('/application/draft', ['barangay_code' => '999999999'])->assertSessionHasErrors('barangay_code');
    $this->post('/application/draft', ['barangay_code' => '043404001'])->assertSessionHasNoErrors();
    expect($user->fresh()->application->draft_data)->toBe(['province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001']);
    $this->post('/application/draft', ['province_code' => '999999999'])->assertSessionHasErrors('province_code');
    $this->assertDatabaseCount('registration_application_drafts', 1);
    $this->assertDatabaseCount('addresses', 0);
});
