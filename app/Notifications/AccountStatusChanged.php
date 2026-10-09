<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public $tries = 3;

    public $backoff = [10, 60, 300];

    public function __construct(public string $status, public string $reason)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $status = $this->status === 'approved' ? 'reactivated' : $this->status;
        $message = (new LubosMartMailMessage($notifiable))
            ->subject('Your LubosMart account was '.$status)
            ->line('Your LubosMart account was '.$status.'.')
            ->line('Reason: '.$this->reason);

        if ($this->status === 'approved') {
            return $message->line('You can sign in and use your account again.')
                ->action('Open your dashboard', route('dashboard.role', ['role' => $notifiable->role]));
        }

        // Suspended accounts cannot open the in-app support page.
        return $message->line('Your account access is currently restricted. Contact LubosMart support at '.config('mail.reply_to.address').' to ask about the reason and next steps.');
    }
}
