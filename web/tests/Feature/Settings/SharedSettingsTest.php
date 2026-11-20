<?php

use App\Models\User;
use App\Notifications\EmailSecurityCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

test('role settings provide expiring private document links only for the signed in owner', function (string $role) {
    $this->freezeTime();
    Storage::fake('local');
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'rider') {
        linkRiderToApprovedCenter($user);
    }
    $application = $user->application()->create(['requested_role' => $role, 'status' => 'approved']);
    Storage::disk('local')->put('settings/identity.pdf', '%PDF-1.4 synthetic identity');
    $document = $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'settings/identity.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 27]);
    $other = User::factory()->create();
    $other->application()->create(['requested_role' => 'buyer'])->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'other.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 10]);
    $url = URL::temporarySignedRoute('account.documents', now()->addMinutes(5), ['document' => $document->id]);

    $this->actingAs($user)->get('/settings/profile')->assertInertia(fn (Assert $page) => $page
        ->has('documents', 1)->where('documents.0.id', $document->id)->where('documents.0.url', $url)
        ->missing('documents.0.path')->missing('documents.0.disk'));
    $this->get($url)->assertDownload('identity.pdf');
    $this->get(str_replace('signature=', 'signature=invalid', $url))->assertForbidden();
    $this->travel(6)->minutes();
    $this->get($url)->assertForbidden();
    $freshUrl = URL::temporarySignedRoute('account.documents', now()->addMinutes(5), ['document' => $document->id]);
    $response = $this->actingAs($user, 'web')->get('/settings/profile');
    $response->assertInertia(fn (Assert $page) => $page->where('documents.0.url', $freshUrl));
    $this->get($freshUrl)->assertDownload('identity.pdf');
    app('auth')->forgetGuards();
    $this->actingAs($other, 'web')->get($freshUrl)->assertNotFound();
})->with(['buyer', 'seller', 'rider']);

test('contact settings only report confirmation while the email token is valid', function () {
    Notification::fake();
    $user = User::factory()->create(['role' => 'buyer']);
    DB::table('user_profiles')->insert(['user_id' => $user->id, 'first_name' => 'Johanna', 'last_name' => 'Sample', 'sex' => 'female', 'birthday' => '2003-02-07']);

    $this->actingAs($user)->withSession(['profile_confirmation' => 'stale-token'])->get('/settings/profile')
        ->assertInertia(fn (Assert $page) => $page->where('sensitiveConfirmed', false)->where('personalDetails.First name', 'Johanna'));
    $this->post('/settings/security-code', ['purpose' => 'profile'])->assertSessionHasNoErrors();
    $code = Notification::sent($user, EmailSecurityCode::class)->first()->code;
    $this->post('/settings/security-code/verify', ['purpose' => 'profile', 'code' => $code])->assertSessionHasNoErrors();
    $this->get('/settings/profile')->assertInertia(fn (Assert $page) => $page->where('sensitiveConfirmed', true));
    $this->travel(11)->minutes();
    $this->get('/settings/profile')->assertInertia(fn (Assert $page) => $page->where('sensitiveConfirmed', false));
});
