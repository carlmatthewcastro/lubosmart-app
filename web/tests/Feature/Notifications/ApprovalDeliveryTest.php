<?php

use App\Models\RegistrationApplication;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

function pendingMailBuyer(): User
{
    Storage::fake('local');
    $buyer = User::factory()->create(['role' => 'buyer', 'status' => 'pending']);
    $application = RegistrationApplication::create(['user_id' => $buyer->id, 'requested_role' => 'buyer', 'status' => 'submitted']);
    Storage::disk('local')->put('registration/id.pdf', 'test ID');
    $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'registration/id.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 7]);

    return $buyer;
}

test('approval submits decision email immediately without a queue worker', function () {
    config(['mail.default' => 'array']);
    Mail::purge('array');
    Queue::fake();
    $buyer = pendingMailBuyer();

    $this->actingAs(User::factory()->create(['role' => 'admin']))
        ->patch('/reviews/'.$buyer->application->id, ['decision' => 'approved'])
        ->assertSessionHasNoErrors()->assertSessionHas('status', 'Application approved. Email notification sent.');

    $email = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();
    expect($buyer->fresh()->status)->toBe('approved');
    expect($email->getTo()[0]->getAddress())->toBe($buyer->email);
    expect($email->getHtmlBody())->toContain('Application approved', '/dashboard/buyer')->not->toContain('<img', '&#9993;');
    Queue::assertNothingPushed();
});

test('failed decision email reports failure and preserves the approved decision', function () {
    $buyer = pendingMailBuyer();
    Notification::shouldReceive('sendNow')->once()->andThrow(new RuntimeException('Synthetic SMTP failure'));

    $this->actingAs(User::factory()->create(['role' => 'admin']))
        ->patch('/reviews/'.$buyer->application->id, ['decision' => 'approved'])
        ->assertSessionHasNoErrors()->assertSessionHas('status', fn ($status) => str_contains($status, 'Email delivery failed.'));

    expect($buyer->fresh()->status)->toBe('approved');
    expect($buyer->fresh()->application->status)->toBe('approved');
});
