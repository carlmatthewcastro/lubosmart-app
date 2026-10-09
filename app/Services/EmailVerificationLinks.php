<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmailVerificationLinks
{
    public function cooldown(User $user): int
    {
        $lastSent = DB::table('email_verification_tokens')->where('user_id', $user->id)->value('last_sent_at');

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
                throw ValidationException::withMessages(['email' => 'Please wait 60 seconds before requesting another verification link.']);
            }
            $token = Str::random(64);
            DB::table('email_verification_tokens')->updateOrInsert(['user_id' => $user->id], [
                'email' => $user->email, 'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addDay(), 'consumed_at' => null, 'last_sent_at' => now(),
                'created_at' => now(), 'updated_at' => now(),
            ]);

            return [$user, $token];
        });
        if ($delivery) {
            [$recipient, $token] = $delivery;
            // A synchronous notification keeps the raw token out of persistent queues.
            try {
                $url = route('verification.verify', ['token' => $token]);
                $recipient->notify(new VerifyAccountEmail($url));
            } catch (\Throwable $exception) {
                DB::table('email_verification_tokens')->where('user_id', $recipient->id)->where('token_hash', hash('sha256', $token))->delete();
                throw $exception;
            }
        }
    }

    public function verify(string $token): ?User
    {
        $user = DB::transaction(function () use ($token): ?User {
            $hash = hash('sha256', $token);
            $ownerId = DB::table('email_verification_tokens')->where('token_hash', $hash)->value('user_id');
            $user = $ownerId ? User::query()->whereKey($ownerId)->lockForUpdate()->first() : null;
            $record = $user ? DB::table('email_verification_tokens')->where('user_id', $user->id)->lockForUpdate()->first() : null;
            if (! $record || ! hash_equals($record->token_hash, $hash) || $record->consumed_at || $record->expires_at <= now()
                || $record->email !== $user->email || $user->hasVerifiedEmail()) {
                return null;
            }
            $user->forceFill(['email_verified_at' => now(), 'status' => $user->status === 'unverified' ? 'incomplete' : $user->status])->save();
            DB::table('email_verification_tokens')->where('id', $record->id)->update(['consumed_at' => now(), 'updated_at' => now()]);

            return $user;
        });
        if ($user) {
            event(new Verified($user));
        }

        return $user;
    }
}
