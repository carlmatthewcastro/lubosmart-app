<?php

namespace App\Notifications;

use App\Notifications\Messages\LubosMartMailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderDeliveryUpdated extends Notification implements ShouldQueue
{
    use Queueable;

    public $tries = 3;

    public $backoff = [10, 60, 300];

    public function __construct(public int $orderId, public int $sellerOrderId, public string $status)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new LubosMartMailMessage($notifiable))->subject('LubosMart order #'.$this->orderId.' delivery update')
            ->line('The parcel for order #'.$this->orderId.' is now '.str_replace('_', ' ', $this->status).'.')
            ->action('View orders', route('orders.index'));
    }
}
