<?php

namespace App\Notifications\Messages;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\DB;

class LubosMartMailMessage extends MailMessage
{
    public function presentation(string $title, string $symbol = '✓', ?string $code = null, ?int $minutes = null): static
    {
        $this->viewData = array_merge($this->viewData, ['mailTitle' => $title, 'mailSymbol' => $symbol, 'verificationCode' => $code, 'expiryMinutes' => $minutes]);

        return $this;
    }

    public function __construct(object $notifiable)
    {
        $this->view(['html' => 'mail.transactional', 'text' => 'mail.transactional-text']);
        $firstName = $notifiable->first_name ?? null;

        // Registration stores structured names in user_profiles, rather than users.
        if (blank($firstName) && $notifiable instanceof User && $notifiable->exists) {
            $firstName = DB::table('user_profiles')->where('user_id', $notifiable->id)->value('first_name');
        }

        if (blank($firstName)) {
            $firstName = preg_split('/\s+/u', trim($notifiable->name ?? ''), 2)[0] ?? '';
        }

        $this->greeting(filled($firstName) ? 'Hello, '.trim($firstName).'!' : 'Hello!');
    }
}
