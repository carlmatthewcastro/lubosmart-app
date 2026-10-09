<?php

use App\Models\Address;
use App\Models\Order;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Notifications\AccountStatusChanged;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

test('unapproved roles cannot open settings orders conversations or operational APIs', function (string $role, string $status) {
    $user = User::factory()->create(['role' => $role, 'status' => $status]);
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Test store', 'status' => 'approved']);
    $order = Order::query()->create(['buyer_id' => $user->id, 'shipping_recipient_name' => 'Test', 'shipping_phone' => '09171234567', 'shipping_line1' => 'Test address', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150]);
    $parcel = SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => 100, 'shipping_fee' => 50]);
    $this->actingAs($user)->get('/settings/profile')->assertRedirect($status === 'pending' ? '/application/waiting' : '/application');
    $this->get('/orders')->assertRedirect($status === 'pending' ? '/application/waiting' : '/application');
    $this->get('/support')->assertRedirect($status === 'pending' ? '/application/waiting' : '/application');
    $this->postJson('/orders/'.$parcel->id.'/messages', ['body' => 'Bypass attempt'])->assertRedirect($status === 'pending' ? '/application/waiting' : '/application');
    $this->postJson('/inventory', [])->assertRedirect($status === 'pending' ? '/application/waiting' : '/application');
    $this->get('/shop')->assertOk();
})->with(['buyer', 'seller', 'courier', 'sorting_center'])->with(['incomplete', 'pending', 'rejected']);

test('disabling a logistics owner immediately blocks its riders without changing their approval history', function (string $status) {
    Notification::fake();
    $rider = User::factory()->create(['role' => 'courier']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'sorting_center')->firstOrFail();
    RegistrationApplication::query()->create(['user_id' => $operator->id, 'requested_role' => 'sorting_center', 'status' => 'approved']);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($rider)->get('/deliveries')->assertOk();
    $this->actingAs($admin)->patch('/accounts/'.$operator->id, ['status' => $status, 'reason' => 'Compliance review'])->assertSessionHasNoErrors();
    Notification::assertSentTo($operator, AccountStatusChanged::class, fn ($notice) => $notice->status === $status);
    $this->actingAs($rider->fresh())->get('/deliveries')->assertForbidden();
    $this->get('/settings/profile')->assertForbidden();
    expect($rider->fresh()->status)->toBe('approved');
    $this->actingAs($admin)->patch('/accounts/'.$operator->id, ['status' => 'approved', 'reason' => 'Compliance resolved'])->assertSessionHasNoErrors();
    $this->actingAs($rider->fresh())->get('/deliveries')->assertOk();
    $this->assertDatabaseHas('audit_events', ['actor_id' => $admin->id, 'subject_id' => $operator->id, 'action' => 'reactivated']);
})->with(['suspended', 'deactivated']);

test('only the owning logistics operator and admin can open rider documents', function () {
    Storage::fake('local');
    $rider = User::factory()->create(['role' => 'courier', 'status' => 'pending']);
    $center = linkRiderToApprovedCenter($rider);
    $application = RegistrationApplication::query()->create(['user_id' => $rider->id, 'requested_role' => 'courier', 'sorting_center_id' => $center->id, 'status' => 'submitted']);
    Storage::disk('local')->put('registration/id.pdf', 'Synthetic ID');
    $document = $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/id.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 12]);
    $this->actingAs($center->users()->where('role', 'sorting_center')->firstOrFail())->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertOk()->assertHeader('Content-Type', 'application/pdf');
    $this->actingAs(User::factory()->create(['role' => 'sorting_center']))->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertForbidden();
    $this->get('/reviews/'.$application->id)->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertOk()->assertHeader('Content-Type', 'application/pdf');
    $this->actingAs($rider)->get(URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]))->assertForbidden();
});

test('sorting centers deactivate own couriers while Admin handles reactivation', function () {
    Notification::fake();
    $rider = User::factory()->create(['role' => 'courier']);
    $center = linkRiderToApprovedCenter($rider);
    RegistrationApplication::query()->create(['user_id' => $rider->id, 'requested_role' => 'courier', 'sorting_center_id' => $center->id, 'status' => 'approved']);
    $operator = $center->users()->where('role', 'sorting_center')->firstOrFail();
    $otherRider = User::factory()->create(['role' => 'courier']);
    linkRiderToApprovedCenter($otherRider);
    $this->actingAs($operator)->patch('/accounts/'.$rider->id, ['status' => 'deactivated', 'reason' => 'No longer delivering'])->assertSessionHasNoErrors();
    $this->patch('/accounts/'.$otherRider->id, ['status' => 'deactivated', 'reason' => 'Cross-center attempt'])->assertForbidden();
    $this->get('/accounts')->assertInertia(fn (Assert $page) => $page->has('accounts.data', 1)->where('accounts.data.0.id', $rider->id));
    $this->patch('/accounts/'.$rider->id, ['status' => 'approved', 'reason' => 'Back on duty'])->assertSessionHasErrors('status');
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/accounts/'.$rider->id, ['status' => 'approved', 'reason' => 'Back on duty'])->assertSessionHasNoErrors();
    expect($rider->fresh()->status)->toBe('approved');
    Notification::assertSentTo($rider, AccountStatusChanged::class, fn ($notice) => $notice->status === 'deactivated');
});

test('logistics business changes block linked riders and reapproval reuses the same center', function () {
    Notification::fake();
    $rider = User::factory()->create(['role' => 'courier']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'sorting_center')->firstOrFail();
    $address = Address::query()->create(['user_id' => $operator->id, 'label' => 'Registration', 'recipient_name' => 'Operator', 'phone' => '09171234567', 'line1' => 'Test street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
    $application = RegistrationApplication::query()->create(['user_id' => $operator->id, 'requested_role' => 'sorting_center', 'status' => 'approved', 'business_name' => 'Old company']);
    $application->forceFill(['address_id' => $address->id])->save();
    $this->actingAs($operator)->patch('/settings/profile', ['name' => $operator->name, 'email' => $operator->email, 'business_name' => 'New company', 'bank_account' => 'Synthetic bank', 'current_password' => 'password'])->assertRedirect('/application/waiting')->assertSessionHasNoErrors();
    expect($operator->fresh()->status)->toBe('pending');
    expect($operator->fresh()->bank_account)->toBe('Synthetic bank');
    expect(DB::table('users')->where('id', $operator->id)->value('bank_account'))->not->toBe('Synthetic bank');
    $this->actingAs($rider)->get('/deliveries')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/reviews/'.$application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('sorting_centers', 1);
    expect($center->fresh()->name)->toBe('New company');
    $this->actingAs($rider)->get('/deliveries')->assertOk();
});

test('replacing an approved partner ID creates private documents and requests the correct re-review', function (string $role) {
    Storage::fake('local');
    $user = User::factory()->create(['role' => $role]);
    $center = $role === 'courier' ? linkRiderToApprovedCenter($user) : null;
    $application = RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => $role, 'status' => 'approved', 'sorting_center_id' => $center?->id]);
    $this->actingAs($user)->post('/settings/profile', ['_method' => 'patch', 'name' => $user->name, 'email' => $user->email, 'identity' => UploadedFile::fake()->create('replacement.pdf', 10, 'application/pdf')])->assertRedirect('/application/waiting')->assertSessionHasNoErrors();
    expect($user->fresh()->status)->toBe('pending');
    expect($application->fresh()->status)->toBe('submitted');
    Storage::disk('local')->assertExists($application->fresh()->documents->sole()->path);
    $this->assertDatabaseHas('audit_events', ['actor_id' => $user->id, 'action' => 'profile_review_requested']);
})->with(['buyer', 'seller', 'courier', 'sorting_center']);

test('the reviewer receives an age computed on the server from birthday', function () {
    $user = User::factory()->create(['status' => 'pending']);
    $application = RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => 'buyer', 'status' => 'submitted']);
    DB::table('user_profiles')->insert(['user_id' => $user->id, 'first_name' => 'Test', 'last_name' => 'Applicant', 'birthday' => now()->subYears(25)->format('Y-m-d')]);
    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/reviews/'.$application->id)->assertInertia(fn (Assert $page) => $page->where('profile.age', 25));
});

test('rider bank changes need confirmation and return to logistics review with encrypted storage', function () {
    $rider = User::factory()->create(['role' => 'courier']);
    $center = linkRiderToApprovedCenter($rider);
    RegistrationApplication::query()->create(['user_id' => $rider->id, 'requested_role' => 'courier', 'sorting_center_id' => $center->id, 'status' => 'approved']);
    $payload = ['name' => $rider->name, 'email' => $rider->email, 'bank_account' => 'Synthetic rider bank'];
    $this->actingAs($rider)->patch('/settings/profile', $payload)->assertSessionHasErrors('code');
    expect($rider->fresh()->status)->toBe('approved');
    $this->patch('/settings/profile', [...$payload, 'current_password' => 'password'])->assertRedirect('/application/waiting')->assertSessionHasNoErrors();
    expect($rider->fresh()->bank_account)->toBe('Synthetic rider bank');
    expect($rider->fresh()->status)->toBe('pending');
    expect($rider->fresh()->toArray())->not->toHaveKey('bank_account');
    expect(DB::table('users')->where('id', $rider->id)->value('bank_account'))->not->toBe('Synthetic rider bank');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $rider->id, 'sorting_center_id' => $center->id, 'status' => 'submitted']);
});

test('logistics assigns coverage only to its own rider using valid address dropdown values', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);
    $rider = User::factory()->create(['role' => 'courier']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'sorting_center')->firstOrFail();
    $payload = ['sorting_center_id' => $center->id, 'rider_id' => $rider->id, 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001'];
    $this->actingAs($operator)->post('/rider-service-areas', $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('service_areas', ['sorting_center_id' => $center->id, 'barangay_name' => 'Test Barangay']);
    $this->assertDatabaseHas('rider_service_area', ['rider_id' => $rider->id]);
    $this->post('/rider-service-areas', [...$payload, 'barangay_code' => '043404999'])->assertSessionHasErrors('barangay_code');
    $this->actingAs(User::factory()->create(['role' => 'sorting_center']))->post('/rider-service-areas', $payload)->assertForbidden();
    $this->assertDatabaseCount('service_areas', 1);
});
