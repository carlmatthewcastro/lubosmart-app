<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyAccountEmail extends Notification
{
    public function __construct(public string $url) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new LubosMartMailMessage($notifiable))->mailer(config('mail.security_mailer'))
            ->subject('Verify your LubosMart email')
            ->line('You received this email because a LubosMart account was created with this email address. Please verify your email to continue.')
            ->action('Verify email', $this->url)
            ->line('This link expires in 24 hours and can only be used once.')
            ->line('If you did not create this account, you can ignore this email.');
    }
}
