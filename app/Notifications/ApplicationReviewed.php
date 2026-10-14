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
            ->presentation($this->decision === 'approved' ? 'Application approved' : 'Application needs changes')
            ->subject('Your LubosMart application was '.$this->decision);

        if ($this->decision === 'approved') {
            return $message->line('Your application was approved. Welcome to LubosMart!')
                ->action('Open your dashboard', route('dashboard.role', ['role' => $notifiable->role]));
        }

        return $message->line('Your application needs changes before approval.')
            ->line('Reason: '.($this->reason ?: 'Please review your application details.'))
            ->line('Update your application and submit it again.')
            ->action('Update your application', route('application.edit'));
    }
}
