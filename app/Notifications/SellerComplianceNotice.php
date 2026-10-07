<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerComplianceNotice extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $product, public string $action, public string $reason)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('LubosMart listing review')
            ->line('Listing: '.$this->product)->line('Action: '.$this->action)->line($this->reason)
            ->action('Open LubosMart', route('dashboard'));
    }
}
