<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailSecurityCode extends Notification
{
    // Deliver synchronously: never serialize a plain security code into a queue.
    public function __construct(public string $code, public string $purpose) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new LubosMartMailMessage($notifiable))->mailer(config('mail.security_mailer'))
            ->subject($this->purpose === 'password' ? 'Your LubosMart password code' : 'Confirm your LubosMart account change')
            ->line($this->purpose === 'password' ? 'Use this code to change your password.' : 'Use this code to confirm a sensitive account change.')
            ->line('Your code: '.$this->code)
            ->line('This code expires in 10 minutes. Never share it with anyone.')
            ->line('If you did not request this, ignore this email.');
    }
}
