<?php

use App\Models\SupportCase;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Notification::fake();
});

test('participant unread inbox clears after viewing and returns after a new reply', function () {
    $buyer = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    $case = SupportCase::create(['opened_by' => $admin->id, 'kind' => 'message', 'subject' => 'Account Assistance']);
    $case->participants()->attach([$buyer->id, $admin->id]);
    $first = $case->messages()->create(['user_id' => $admin->id, 'body' => 'Please check your profile.']);

    $this->actingAs($buyer)->getJson('/support?unread=1')->assertJsonCount(1, 'cases.data')->assertJsonPath('cases.data.0.unread_count', 1);
    $this->getJson('/support/'.$case->id)->assertOk();
    $this->assertDatabaseHas('support_case_reads', ['user_id' => $buyer->id, 'support_case_id' => $case->id, 'last_read_message_id' => $first->id]);
    $this->getJson('/support?unread=1')->assertJsonCount(0, 'cases.data');
    $this->actingAs($admin)->post('/support/'.$case->id.'/messages', ['body' => 'Another update.'])->assertRedirect();
    $this->actingAs($buyer)->getJson('/support?unread=1')->assertJsonPath('cases.data.0.unread_count', 1);
});

test('search and status filters remain scoped to conversation membership', function () {
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller', 'name' => 'Synthetic Merchant']);
    $visible = SupportCase::create(['opened_by' => $buyer->id, 'kind' => 'complaint', 'subject' => 'Delivery Dispute', 'status' => 'in_review']);
    $visible->participants()->attach([$buyer->id, $seller->id]);
    $private = SupportCase::create(['opened_by' => $seller->id, 'kind' => 'complaint', 'subject' => 'Delivery Dispute', 'status' => 'in_review']);
    $private->participants()->attach($seller->id);

    $this->actingAs($buyer)->getJson('/support?search=Synthetic&kind=complaint&status=in_review')->assertJsonCount(1, 'cases.data')->assertJsonPath('cases.data.0.id', $visible->id);
    $this->get('/support?search=Unmatched')->assertInertia(fn (Assert $page) => $page->has('cases.data', 0));
    $this->getJson('/support?unread=invalid')->assertUnprocessable()->assertJsonValidationErrors('unread');
    $this->getJson('/support?search='.str_repeat('a', 101))->assertUnprocessable()->assertJsonValidationErrors('search');
});

test('inbox sorts by message activity rather than case status changes and exposes previews', function () {
    $buyer = User::factory()->create();
    $older = SupportCase::create(['opened_by' => $buyer->id, 'kind' => 'message', 'subject' => 'Older activity']);
    $latest = SupportCase::create(['opened_by' => $buyer->id, 'kind' => 'message', 'subject' => 'Latest activity']);
    foreach ([$older, $latest] as $case) {
        $case->participants()->attach($buyer->id);
    }
    $older->messages()->create(['user_id' => $buyer->id, 'body' => 'Older message', 'created_at' => now()->subDay()]);
    $latest->messages()->create(['user_id' => $buyer->id, 'body' => 'Latest message']);
    $older->touch();

    $this->actingAs($buyer)->get('/support')->assertInertia(fn (Assert $page) => $page->where('cases.data.0.id', $latest->id)->where('cases.data.0.latest_message.body', 'Latest message')->where('cases.data.0.unread_count', 0));
});

test('reading an older page does not acknowledge newer messages and history stays paginated', function () {
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $case = SupportCase::create(['opened_by' => $buyer->id, 'kind' => 'message', 'subject' => 'History']);
    $case->participants()->attach([$buyer->id, $seller->id]);
    foreach (range(1, 31) as $index) {
        $case->messages()->create(['user_id' => $seller->id, 'body' => 'Update '.$index]);
    }

    $this->actingAs($buyer)->getJson('/support/'.$case->id.'?page=2')->assertJsonCount(1, 'messages.data');
    $this->assertDatabaseMissing('support_case_reads', ['support_case_id' => $case->id, 'user_id' => $buyer->id]);
    $this->getJson('/support/'.$case->id)->assertJsonCount(30, 'messages.data');
    $this->getJson('/support?unread=1')->assertJsonCount(0, 'cases.data');
});

test('admin cannot bypass recipient eligibility with a manually supplied email', function (array $attributes) {
    $admin = User::factory()->create(['role' => 'admin']);
    $recipient = User::factory()->create($attributes);

    $this->actingAs($admin)->post('/support', ['kind' => 'message', 'subject' => 'Account Assistance', 'body' => 'Hello', 'recipient_email' => $recipient->email])->assertSessionHasErrors('recipient_email');
    $this->assertDatabaseCount('support_cases', 0);
})->with(['pending' => [['status' => 'pending']], 'unverified' => [['email_verified_at' => null]]]);
