<?php

use App\Models\RegistrationApplication;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('registered accounts stay pending and appear in admin alerts until admin approves', function (string $role) {
    Notification::fake();
    $data = match ($role) {
        'seller' => sellerRegistrationData(),
        'logistics' => logisticsRegistrationData(),
        default => sharedRegistrationData(),
    };
    $this->post('/register', $data)->assertRedirect('/verify-email')->assertSessionHasNoErrors();
    $user = User::query()->where('email', $data['email'])->firstOrFail();
    $code = Notification::sent($user, VerifyAccountEmail::class)->last()->code;
    $this->actingAs($user)->post('/verify-email/code', ['code' => $code, 'status' => 'approved', 'role' => 'admin'])
        ->assertRedirect('/application/waiting')->assertSessionHasNoErrors();
    expect($user->fresh()->status)->toBe('pending');
    expect($user->fresh()->role)->toBe($role);
    $this->get('/dashboard')->assertRedirect('/application/waiting');
    $this->get('/dashboard/'.$role)->assertRedirect('/application/waiting');
    $application = $user->application;
    $this->post('/logout');
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $this->getJson('/admin/notifications')->assertOk()->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('badges.registrations', 1)->assertJsonPath('registrationCounts.'.$role, 1)
        ->assertJsonCount(1, 'registrationAlerts')->assertJsonPath('registrationAlerts.0.id', $application->id)
        ->assertJsonPath('registrationAlerts.0.role', $role)->assertJsonPath('registrationAlerts.0.verificationPending', false);
    $this->get('/reviews')->assertInertia(fn (Assert $page) => $page->has('applications.data', 1)->where('applications.data.0.id', $application->id));
    $this->patch('/reviews/'.$application->id, ['decision' => 'approved'])->assertSessionHasNoErrors();
    expect($user->fresh()->status)->toBe('approved');
    Notification::assertSentTo($user, ApplicationReviewed::class);
    $this->getJson('/admin/notifications')->assertJsonPath('badges.registrations', 0)->assertJsonCount(0, 'registrationAlerts');
    $this->post('/logout');
    $this->actingAs($user->fresh())->get('/dashboard/'.$role)->assertOk();
})->with(['buyer', 'seller', 'logistics']);

test('admin alerts show each application role and exclude riders drafts and decided applications', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    foreach (['buyer', 'seller', 'logistics', 'rider'] as $role) {
        $user = User::factory()->create(['role' => $role, 'status' => 'pending']);
        RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => $role, 'status' => 'submitted', 'business_name' => $role.' notification business', 'submitted_at' => now()]);
    }
    foreach (['draft', 'approved', 'rejected'] as $status) {
        RegistrationApplication::query()->create(['user_id' => User::factory()->create()->id, 'requested_role' => 'buyer', 'status' => $status]);
    }
    $result = $this->actingAs($admin)->getJson('/admin/notifications')->assertOk()->assertJsonPath('badges.registrations', 3)
        ->assertJsonPath('registrationCounts', ['buyer' => 1, 'seller' => 1, 'logistics' => 1])->assertJsonCount(3, 'registrationAlerts');
    expect(collect($result->json('registrationAlerts'))->pluck('role')->sort()->values()->all())->toBe(['buyer', 'logistics', 'seller']);
    expect(collect($result->json('registrationAlerts'))->firstWhere('role', 'seller')['label'])->toBe('seller notification business');
});

test('unverified registrations are visible but cannot be approved and non admins cannot read admin alerts', function () {
    $user = User::factory()->unverified()->create(['role' => 'seller', 'status' => 'unverified']);
    $application = RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => 'seller', 'status' => 'submitted']);
    $this->getJson('/admin/notifications')->assertUnauthorized();
    $this->actingAs(User::factory()->create())->getJson('/admin/notifications')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'logistics']))->getJson('/admin/notifications')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/admin/notifications')->assertJsonPath('registrationAlerts.0.verificationPending', true);
    $this->getJson('/reviews/'.$application->id)->assertOk()->assertJsonPath('canReview', false);
    $this->patch('/reviews/'.$application->id, ['decision' => 'approved'])->assertSessionHasErrors('decision');
    expect($user->fresh()->status)->toBe('unverified');
});
