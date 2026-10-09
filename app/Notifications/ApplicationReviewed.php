<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
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
        $message = (new LubosMartMailMessage($notifiable))
            ->subject('Your LubosMart application was '.$this->decision);

        if ($this->decision === 'approved') {
            return $message->line('Your application was approved. Welcome to LubosMart!')
                ->line('Sign in to your dashboard to get started.')
                ->action('Open your dashboard', route('dashboard.role', ['role' => $notifiable->role]));
        }

        return $message->line('Your application was rejected and needs changes before we can approve it.')
            ->line('Reason: '.($this->reason ?: 'Please review your application details.'))
            ->line('Open your application, update the details or documents mentioned above, and submit it again.')
            ->action('Update your application', route('application.edit'));
    }
}
