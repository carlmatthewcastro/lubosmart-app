<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyAccountEmail extends Notification
{
    public function __construct(public string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new LubosMartMailMessage($notifiable))->mailer(config('mail.security_mailer'))
            ->presentation('Verify your email address', '✓', $this->code, 5)
            ->subject('Verify your LubosMart email')
            ->line('Use the verification code below to verify your email address and continue your registration.');
        if ($this->code !== null) {
            $message->line('Your verification code is '.$this->code.'. It expires in five minutes.')
                ->line('Enter it on the verification page. Do not share this code.');
        }

        return $message
            ->line('If you did not create this account, you can ignore this email.');
    }
}
