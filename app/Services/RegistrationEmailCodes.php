<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class RegistrationEmailCodes
{
    // Called only inside the verification sender's transaction with the user locked.
    public function issue(User $user): array
    {
        $previous = DB::table('registration_email_codes')->where('user_id', $user->id)->first();
        $sameWindow = $previous && $previous->window_started_at > now()->subHour();
        if ($sameWindow && $previous->send_count >= 3) {
            throw ValidationException::withMessages(['email' => 'You can request three verification emails per hour.']);
        }
        do {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while ($previous && Hash::check($code, $previous->code_hash));
        $hash = Hash::make($code);
        DB::table('registration_email_codes')->updateOrInsert(['user_id' => $user->id], [
            'email' => $user->email, 'code_hash' => $hash, 'expires_at' => now()->addMinutes(5), 'last_sent_at' => now(),
            'attempts' => 0, 'send_count' => $sameWindow ? $previous->send_count + 1 : 1,
            'window_started_at' => $sameWindow ? $previous->window_started_at : now(), 'consumed_at' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return ['code' => $code, 'hash' => $hash];
    }

    public function verify(User $actor, string $code): User
    {
        $user = DB::transaction(function () use ($actor, $code) {
            $user = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $record = DB::table('registration_email_codes')->where('user_id', $user->id)->lockForUpdate()->first();
            if ($user->hasVerifiedEmail() || in_array($user->status, ['suspended', 'deactivated'], true)
                || ! $record || $record->email !== $user->email || $record->consumed_at
                || $record->expires_at <= now() || $record->attempts >= 5) {
                return null;
            }
            if (! Hash::check($code, $record->code_hash)) {
                DB::table('registration_email_codes')->where('id', $record->id)->increment('attempts');

                return null;
            }
            app(AccountVerificationLifecycle::class)->complete($user);
            DB::table('registration_email_codes')->where('id', $record->id)->update(['consumed_at' => now(), 'updated_at' => now()]);
            DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();

            return $user;
        }, 3);
        if (! $user) {
            throw ValidationException::withMessages(['code' => 'The code is invalid, expired, or locked. Request a new verification email.']);
        }
        event(new Verified($user));

        return $user;
    }
}
