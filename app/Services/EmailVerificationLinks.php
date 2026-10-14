<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmailVerificationLinks
{
    public function cooldown(User $user): int
    {
        $lastSent = DB::table('registration_email_codes')->where('user_id', $user->id)->value('last_sent_at');

        return $lastSent ? max(0, 60 - (int) now()->diffInSeconds($lastSent, absolute: true)) : 0;
    }

    public function send(User $user): void
    {
        $delivery = DB::transaction(function () use ($user): ?array {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($user->hasVerifiedEmail()) {
                return null;
            }
            if ($this->cooldown($user) > 0) {
                throw ValidationException::withMessages(['email' => 'Please wait 60 seconds before requesting another verification code.']);
            }
            $issued = app(RegistrationEmailCodes::class)->issue($user);

            return [$user, $issued];
        }, 3);
        if ($delivery) {
            [$recipient, $issued] = $delivery;
            // Deliver synchronously so raw verification codes are not stored in queues.
            try {
                $recipient->notify(new VerifyAccountEmail($issued['code']));
            } catch (\Throwable $exception) {
                DB::table('registration_email_codes')->where('user_id', $recipient->id)->where('code_hash', $issued['hash'])->delete();
                throw $exception;
            }
        }
    }
}
