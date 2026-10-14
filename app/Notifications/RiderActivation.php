<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RiderActivation extends Notification
{
    public function __construct(public string $url, public string $company) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new LubosMartMailMessage($notifiable))->subject('Activate your LubosMart rider account')->line($this->company.' invited you to join as a rider.')->line('Set your own password within 24 hours.')->action('Activate rider account', $this->url);
    }
}
