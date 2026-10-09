<?php

use App\Models\RegistrationApplication;
use App\Models\User;
use App\Notifications\AccountStatusChanged;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

test('signup requires a public role and validates optional consent', function (array $changes, string $field) {
    Notification::fake();
    $this->post('/register', array_replace([
        'email' => 'boundaries@example.com', 'role' => 'buyer', 'policy_accepted' => true,
        'password' => 'password', 'password_confirmation' => 'password',
    ], $changes))->assertSessionHasErrors($field);
    $this->assertGuest();
    $this->assertDatabaseCount('users', 0);
    Notification::assertNothingSent();
})->with([
    'missing role' => [['role' => null], 'role'],
    'invalid consent' => [['policy_accepted' => 'invalid'], 'policy_accepted'],
]);

test('password login routes from stored account state and ignores injected identity', function (string $status, string $destination) {
    $user = User::factory()->create(['status' => $status, 'email_verified_at' => $status === 'unverified' ? null : now()]);
    $this->post('/login', [
        'email' => $user->email, 'password' => 'password', 'role' => 'admin',
        'status' => 'approved', 'user_id' => 999,
    ])->assertSessionHasNoErrors()->assertRedirect($destination);
    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->role)->toBe('buyer');
    expect($user->fresh()->status)->toBe($status);
})->with([
    ['unverified', '/verify-email'], ['incomplete', '/application'],
    ['pending', '/application/waiting'], ['rejected', '/application'], ['approved', '/dashboard'],
]);

test('missing accounts receive the same credentials error while Google-only accounts get provider guidance', function () {
    $this->post('/login', ['email' => 'absent@example.com', 'password' => 'wrong'])
        ->assertSessionHasErrors(['email' => 'Incorrect email or password']);
    $google = User::factory()->create(['google_id' => 'google-only-boundary', 'password' => null]);
    $this->post('/login', ['email' => $google->email, 'password' => 'wrong'])
        ->assertSessionHasErrors(['email' => 'Use Continue with Google.']);
    $this->assertGuest();
});

test('five failed passwords lock out even the correct password until the short lockout expires', function () {
    Event::fake([Lockout::class]);
    $user = User::factory()->create();
    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->post('/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertSessionHasErrors(['email' => 'Incorrect email or password']);
    }
    $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
    Event::assertDispatched(Lockout::class);
    $this->assertGuest();
    $this->travel(61)->seconds();
    $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasNoErrors()->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
});

test('registration documents require both a current signature and reviewer authorization', function () {
    Storage::fake('local');
    $owner = User::factory()->create(['status' => 'pending']);
    $application = RegistrationApplication::query()->create(['user_id' => $owner->id, 'requested_role' => 'buyer', 'status' => 'submitted']);
    Storage::disk('local')->put('registration/test.pdf', 'Synthetic document');
    $document = $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/test.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 18]);
    $url = URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->get(route('registration-documents.show', $document))->assertForbidden();
    $this->get($url)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    $this->actingAs($owner)->get($url)->assertForbidden();
    $this->actingAs($admin);
    $this->travel(6)->minutes();
    $this->get($url)->assertForbidden();
});

test('admin courier override records the reason and the full status transition', function () {
    Notification::fake();
    $courier = User::factory()->create(['role' => 'courier', 'status' => 'pending']);
    $center = linkRiderToApprovedCenter($courier);
    $application = RegistrationApplication::query()->create(['user_id' => $courier->id, 'requested_role' => 'courier', 'sorting_center_id' => $center->id, 'status' => 'submitted']);
    $admin = User::factory()->create(['role' => 'admin']);
    $this->actingAs($admin)->patch('/reviews/'.$application->id, ['decision' => 'approved', 'reason' => 'Admin override after document review'])->assertSessionHasNoErrors();
    expect($courier->fresh()->status)->toBe('approved');
    $this->assertDatabaseHas('audit_events', [
        'actor_id' => $admin->id, 'subject_id' => $application->id, 'subject_type' => 'registration_application',
        'action' => 'approved', 'old_status' => 'pending', 'new_status' => 'approved', 'reason' => 'Admin override after document review',
    ]);
});

test('the audit page is admin-only and its account filter includes application and account decisions', function () {
    Notification::fake();
    $buyer = User::factory()->create();
    $application = RegistrationApplication::query()->create(['user_id' => $buyer->id, 'requested_role' => 'buyer', 'status' => 'approved']);
    $admin = User::factory()->create(['role' => 'admin']);
    DB::table('audit_events')->insert([
        'actor_id' => $admin->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id,
        'action' => 'approved', 'old_status' => 'pending', 'new_status' => 'approved', 'occurred_at' => now(),
    ]);
    $this->actingAs($buyer)->get('/admin/audit-log')->assertForbidden();
    $this->actingAs($admin)->patch('/accounts/'.$buyer->id, ['status' => 'suspended', 'reason' => 'Review needed'])->assertSessionHasNoErrors();
    Notification::assertSentTo($buyer, AccountStatusChanged::class);
    $this->get('/admin/audit-log?account_id='.$buyer->id)->assertInertia(fn (Assert $page) => $page
        ->component('admin/audit-log')->has('events.data', 2)
        ->where('events.data.0.old_status', 'approved')->where('events.data.0.new_status', 'suspended')
        ->where('events.data.0.reason', 'Review needed')->where('events.data.0.actor_name', $admin->name));
    $this->get('/admin/audit-log?account_id='.$buyer->id.'&action=approved')->assertInertia(fn (Assert $page) => $page->has('events.data', 1));
});
