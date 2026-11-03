<?php

use App\Models\Address;
use App\Models\AuditLog;
use App\Models\ChangeRequest;
use App\Models\PsgcLocation;
use App\Models\RegistrationSnapshot;
use App\Models\User;
use App\Services\AccountSettings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

function settingsCompany(): User
{
    $user = User::factory()->create(['role' => 'logistics']);
    $address = Address::query()->create(['user_id' => $user->id, 'label' => 'Registration', 'recipient_name' => $user->name, 'phone' => '09170000001', 'line1' => '5 Main Street', 'house_number' => '5', 'street' => 'Main Street', 'barangay' => 'Kapitolyo', 'city' => 'Pasig City', 'province' => 'Metro Manila', 'region' => '130000000', 'zip' => '1603']);
    DB::table('user_profiles')->insert(['user_id' => $user->id, 'first_name' => 'Carla', 'last_name' => 'Santos', 'middle_initial' => 'M', 'sex' => 'female', 'birthday' => '1990-01-01', 'province_code' => '130000000', 'city_code' => '137403000', 'barangay_code' => '137403016']);
    $application = $user->application()->create(['requested_role' => 'logistics', 'status' => 'approved', 'business_name' => 'Synthetic Logistics', 'sec_number' => 'CS202012345', 'tin' => '123-456-789-115', 'region_code' => '130000000', 'service_regions' => ['130000000', '040000000']]);
    $application->forceFill(['address_id' => $address->id])->save();
    app(AccountSettings::class)->capture($user);

    return $user;
}

function settingsLocation(): array
{
    return PsgcLocation::query()->create(['region_code' => '040000000', 'region_name' => 'Region IV-A (CALABARZON)', 'province_code' => '043400000', 'province_name' => 'Laguna', 'city_code' => '043404000', 'city_name' => 'Cabuyao', 'barangay_code' => '043404001', 'barangay_name' => 'Baclaran', 'postal_code' => '4025'])->only(['region_code', 'region_name', 'province_code', 'province_name', 'city_code', 'city_name', 'barangay_code', 'barangay_name', 'postal_code']) + ['house_number' => '10', 'street' => 'Lake Street'];
}

it('returns 403 for every locked profile field and unknown keys', function (string $field) {
    $user = settingsCompany();
    $this->actingAs($user)->patchJson('/api/account/profile', [$field => 'changed'])->assertForbidden();
    expect($user->application->fresh()->business_name)->toBe('Synthetic Logistics');
})->with(['first_name', 'last_name', 'middle_initial', 'sex', 'date_of_birth', 'company_name', 'sec_registration_number', 'tin', 'identity', 'sec_certificate', 'bir_2303', 'business_permit', 'service_areas', 'registered_address', 'status', 'business_name']);

it('returns snapshot values after approval with region names and a masked TIN', function () {
    $user = settingsCompany();
    $snapshot = RegistrationSnapshot::query()->where('account_id', $user->id)->firstOrFail();
    $this->actingAs($user)->getJson('/api/account/settings')->assertJsonPath('profile.first_name', $snapshot->payload['first_name'])
        ->assertJsonPath('profile.company_name', $snapshot->payload['company_name'])
        ->assertJsonPath('profile.registered_address', $snapshot->payload['registered_address'])
        ->assertJsonPath('profile.service_areas.0.code', '130000000')
        ->assertJsonPath('profile.service_areas.0.name', 'National Capital Region (NCR)')
        ->assertJsonPath('profile.tin', '***-***-***-115');
});

it('rejects removing the registered address region', function () {
    $user = settingsCompany();
    $this->actingAs($user)->postJson('/api/account/change-requests', ['field' => 'service_areas', 'new_value' => ['040000000']])->assertUnprocessable()->assertJsonValidationErrors('new_value');
    expect($user->application->fresh()->service_regions)->toBe(['130000000', '040000000']);
});

it('leaves additions pending and applies removals immediately', function () {
    $user = settingsCompany();
    $this->actingAs($user)->postJson('/api/account/change-requests', ['field' => 'service_areas', 'new_value' => ['130000000', '070000000']])->assertCreated()->assertJsonPath('request.status', 'pending');
    expect($user->application->fresh()->service_regions)->toBe(['130000000']);
    $this->assertDatabaseMissing('account_service_areas', ['account_id' => $user->id, 'region_code' => '070000000']);
    $admin = User::factory()->create(['role' => 'admin']);
    $change = ChangeRequest::query()->where('account_id', $user->id)->firstOrFail();
    $this->actingAs($admin)->postJson('/api/admin/change-requests/'.$change->id.'/approve')->assertOk();
    expect($user->application->fresh()->service_regions)->toBe(['130000000', '070000000']);
    $this->assertDatabaseHas('audit_logs', ['account_id' => $user->id, 'actor_id' => $admin->id, 'action' => 'approved', 'field' => 'service_areas']);
});

it('validates hierarchy and postal code then keeps an address pending until approval', function () {
    $user = settingsCompany();
    $address = settingsLocation();
    $this->actingAs($user)->postJson('/api/account/change-requests', ['field' => 'registered_address', 'new_value' => [...$address, 'postal_code' => '9999']])->assertUnprocessable();
    $this->postJson('/api/account/change-requests', ['field' => 'registered_address', 'new_value' => $address])->assertCreated();
    expect($user->application->fresh()->region_code)->toBe('130000000');
    $admin = User::factory()->create(['role' => 'admin']);
    $change = ChangeRequest::query()->firstOrFail();
    $this->actingAs($admin)->postJson('/api/admin/change-requests/'.$change->id.'/approve')->assertOk();
    $this->assertDatabaseHas('addresses', ['id' => $user->application->address_id, 'street' => 'Lake Street', 'zip' => '4025']);
    expect($user->application->fresh()->region_code)->toBe('040000000');
    $this->assertDatabaseHas('account_service_areas', ['account_id' => $user->id, 'region_code' => '040000000']);
});

it('rolls approval back if the audit cannot be written', function () {
    $user = settingsCompany();
    $change = app(AccountSettings::class)->request($user, 'service_areas', ['130000000', '040000000', '070000000']);
    $admin = User::factory()->create(['role' => 'admin']);
    AuditLog::creating(fn () => throw new RuntimeException('Synthetic audit failure'));
    try {
        expect(fn () => app(AccountSettings::class)->review($change, $admin, true, null))->toThrow(RuntimeException::class, 'Synthetic audit failure');
    } finally {
        AuditLog::flushEventListeners();
    }
    expect($change->fresh()->status)->toBe('pending');
    expect($user->application->fresh()->service_regions)->toBe(['130000000', '040000000']);
});

it('requires admin authorization and a rejection reason', function () {
    $user = settingsCompany();
    $change = app(AccountSettings::class)->request($user, 'registered_address', settingsLocation());
    $this->actingAs($user)->getJson('/api/admin/change-requests')->assertForbidden();
    $this->postJson('/api/admin/change-requests/'.$change->id.'/approve')->assertForbidden();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->postJson('/api/admin/change-requests/'.$change->id.'/reject', [])->assertUnprocessable();
    $this->postJson('/api/admin/change-requests/'.$change->id.'/reject', ['reason' => 'Address proof does not match.'])->assertOk();
    expect($change->fresh()->reason)->toBe('Address proof does not match.');
    expect($user->application->fresh()->region_code)->toBe('130000000');
});

it('prevents another account from downloading private documents even with a signed URL', function () {
    Storage::fake('local');
    $owner = settingsCompany();
    Storage::disk('local')->put('registration/private.pdf', 'synthetic');
    $document = $owner->application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/private.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 9]);
    $url = URL::temporarySignedRoute('account.documents', now()->addMinutes(5), ['document' => $document->id]);
    $other = User::factory()->create(['role' => 'logistics']);
    $this->actingAs($other)->getJson($url)->assertNotFound();
    $this->actingAs($owner)->get($url)->assertDownload('identity.pdf');
    $this->get('/api/account/documents/'.$document->id)->assertForbidden();
});

it('requires OTP for contact changes and blocks the legacy profile mutation', function () {
    $user = settingsCompany();
    $this->actingAs($user)->patchJson('/api/account/profile', ['contact_number' => '09171112222'])->assertUnprocessable()->assertJsonValidationErrors('code');
    $this->actingAs($user, 'web')->patchJson('/settings/profile', ['name' => 'New Name', 'email' => $user->email])->assertForbidden();
    expect($user->fresh()->phone)->not->toBe('09171112222');
});

it('rejects unauthenticated settings requests', function () {
    $this->getJson('/api/account/settings')->assertUnauthorized();
});

it('returns 401 for an invalid bearer token', function () {
    $this->withHeader('Authorization', 'Bearer invalid-synthetic-token')->getJson('/api/account/settings')->assertUnauthorized();
});

it('rejects unknown service regions without changing the verified areas', function () {
    $user = settingsCompany();
    $this->actingAs($user)->postJson('/api/account/change-requests', ['field' => 'service_areas', 'new_value' => ['130000000', 'Free text region']])->assertUnprocessable();
    expect($user->application->fresh()->service_regions)->toBe(['130000000', '040000000']);
    $this->assertDatabaseCount('change_requests', 0);
});

it('persists notification preferences and rejects undeclared nested preferences', function () {
    $user = settingsCompany();
    $this->actingAs($user)->patchJson('/api/account/profile', ['notification_preferences' => ['email' => false, 'sms' => true]])->assertOk();
    expect($user->fresh()->notification_preferences)->toBe(['email' => false, 'sms' => true]);
    $this->patchJson('/api/account/profile', ['notification_preferences' => ['admin' => true]])->assertUnprocessable();
    expect($user->fresh()->notification_preferences)->toBe(['email' => false, 'sms' => true]);
});

it('changes passwords without changing registration details and retains the current session', function () {
    $user = settingsCompany();
    $this->actingAs($user)->patchJson('/api/account/profile', ['current_password' => 'password', 'password' => 'Synthetic@2026', 'password_confirmation' => 'Synthetic@2026'])->assertOk();
    expect(Hash::check('Synthetic@2026', $user->fresh()->password))->toBeTrue();
    $this->getJson('/api/account/settings')->assertJsonPath('profile.company_name', 'Synthetic Logistics');
});

it('protects snapshots against Eloquent updates and deletes', function () {
    $user = settingsCompany();
    $snapshot = RegistrationSnapshot::query()->where('account_id', $user->id)->firstOrFail();
    expect(fn () => $snapshot->update(['payload' => []]))->toThrow(LogicException::class);
    expect(fn () => $snapshot->delete())->toThrow(LogicException::class);
});

it('captures the registration snapshot through the actual admin approval endpoint', function () {
    Notification::fake();
    Storage::fake('local');
    $company = settingsCompany();
    // Arrange a newly submitted registration without an existing approval baseline.
    $new = User::factory()->create(['role' => 'logistics', 'status' => 'pending']);
    $address = Address::query()->findOrFail($company->application->address_id)->replicate();
    $address->user_id = $new->id;
    $address->save();
    $application = $new->application()->create(['requested_role' => 'logistics', 'status' => 'submitted', 'business_name' => 'New Synthetic Logistics', 'region_code' => '130000000', 'service_regions' => ['040000000']]);
    $application->forceFill(['address_id' => $address->id])->save();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch('/reviews/'.$application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    $snapshot = RegistrationSnapshot::query()->where('account_id', $new->id)->firstOrFail();
    expect($snapshot->payload['company_name'])->toBe('New Synthetic Logistics');
    expect($snapshot->payload['service_areas'])->toBe(['040000000', '130000000']);
    $this->actingAs($new->fresh(), 'web')->getJson('/api/account/settings')->assertJsonPath('profile.company_name', $snapshot->payload['company_name']);
});

it('keeps approved company details active during re-verification and applies approved documents', function () {
    Storage::fake('local');
    $user = settingsCompany();
    $data = ['company_name' => 'Renamed Synthetic Logistics', 'sec_registration_number' => 'CS202099999', 'tin' => '987-654-321-115'];
    foreach (['identity', 'sec_certificate', 'bir_2303', 'business_permit'] as $kind) {
        $data[$kind] = UploadedFile::fake()->create($kind.'.pdf', 10, 'application/pdf');
    }
    $this->actingAs($user)->postJson('/api/account/reverification', $data)->assertCreated()->assertJsonPath('request.new_value.tin', '***-***-***-115');
    expect($user->fresh()->status)->toBe('pending_reverification');
    expect($user->application->fresh()->business_name)->toBe('Synthetic Logistics');
    $change = ChangeRequest::query()->where('field', 'reverification')->firstOrFail();
    $this->getJson('/api/account/settings')->assertJsonPath('profile.company_name', 'Synthetic Logistics');
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->getJson('/api/admin/change-requests')->assertJsonCount(4, 'data.0.document_urls');
    $this->postJson('/api/admin/change-requests/'.$change->id.'/approve')->assertOk();
    expect($user->fresh()->status)->toBe('approved');
    expect($user->application->fresh()->business_name)->toBe('Renamed Synthetic Logistics');
    expect($user->application->documents()->count())->toBe(4);
    expect(RegistrationSnapshot::query()->where('account_id', $user->id)->count())->toBe(2);
    $this->assertDatabaseHas('audit_logs', ['field' => 'reverification', 'action' => 'approved', 'actor_id' => $admin->id]);
});

it('requires all new re-verification documents', function () {
    Storage::fake('local');
    $user = settingsCompany();
    $this->actingAs($user)->postJson('/api/account/reverification', ['company_name' => 'New Synthetic Logistics', 'sec_registration_number' => 'CS202099999', 'tin' => '987-654-321-115'])->assertUnprocessable()->assertJsonValidationErrors(['identity', 'sec_certificate', 'bir_2303', 'business_permit']);
    expect($user->fresh()->status)->toBe('approved');
    $this->assertDatabaseCount('change_requests', 0);
});

it('allows immediate removals during a pending region addition without resurrecting them on approval', function () {
    $user = settingsCompany();
    $this->actingAs($user)->postJson('/api/account/change-requests', ['field' => 'service_areas', 'new_value' => ['130000000', '040000000', '070000000']])->assertCreated();
    $this->postJson('/api/account/change-requests', ['field' => 'service_areas', 'new_value' => ['130000000', '070000000']])->assertCreated();
    expect($user->application->fresh()->service_regions)->toBe(['130000000']);
    $this->assertDatabaseCount('change_requests', 1);
    $change = ChangeRequest::query()->firstOrFail();
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->postJson('/api/admin/change-requests/'.$change->id.'/approve')->assertOk();
    expect($user->application->fresh()->service_regions)->toBe(['130000000', '070000000']);
});

it('consumes a verified contact OTP only once and leaves the registration snapshot untouched', function () {
    $user = settingsCompany();
    $snapshot = RegistrationSnapshot::query()->where('account_id', $user->id)->firstOrFail()->payload;
    DB::table('email_security_codes')->insert(['user_id' => $user->id, 'purpose' => 'profile', 'email' => $user->email, 'code_hash' => null, 'expires_at' => now()->addMinutes(10), 'attempts' => 0, 'token_hash' => hash('sha256', 'synthetic-token'), 'token_expires_at' => now()->addMinutes(10)]);
    $this->actingAs($user)->patchJson('/api/account/profile', ['contact_number' => '09171112222', 'otp_token' => 'synthetic-token'])->assertOk();
    expect($user->fresh()->phone)->toBe('09171112222');
    $this->patchJson('/api/account/profile', ['contact_number' => '09171112223', 'otp_token' => 'synthetic-token'])->assertUnprocessable();
    expect($user->fresh()->phone)->toBe('09171112222');
    expect(RegistrationSnapshot::query()->where('account_id', $user->id)->firstOrFail()->payload)->toBe($snapshot);
});

it('rejects logistics registration address mutations through the legacy endpoint', function () {
    $user = settingsCompany();
    $id = $user->application->address_id;
    $this->actingAs($user)->putJson('/settings/addresses/'.$id, ['line1' => 'Injected Street'])->assertForbidden();
    $this->assertDatabaseHas('addresses', ['id' => $id, 'line1' => '5 Main Street']);
});

it('does not apply an outdated service proposal after an address approval changes the mandatory region', function () {
    $user = settingsCompany();
    $service = app(AccountSettings::class)->request($user, 'service_areas', ['130000000', '070000000']);
    $address = app(AccountSettings::class)->request($user, 'registered_address', settingsLocation());
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->postJson('/api/admin/change-requests/'.$address->id.'/approve')->assertOk();
    $this->postJson('/api/admin/change-requests/'.$service->id.'/approve')->assertUnprocessable();
    expect($service->fresh()->status)->toBe('pending');
    expect($user->application->fresh()->service_regions)->toContain('040000000');
});
