<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationReviewed extends Notification implements ShouldQueue
{
    use Queueable;

    public $tries = 3;

    public $backoff = [10, 60, 300];

    public function __construct(public string $decision, public ?string $reason)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('LubosMart application '.$this->decision)
            ->line($this->decision === 'approved' ? 'Your application was approved. You can now open your dashboard.' : 'Your application needs changes before approval.')
            ->line($this->reason ?? 'Welcome to LubosMart.')
            ->action('Open your account', route('dashboard'));
    }
}
