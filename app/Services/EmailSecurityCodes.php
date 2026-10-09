<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\EmailSecurityCode;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmailSecurityCodes
{
    public const SENT_MESSAGE = "If an account exists for that email, we've sent a code.";

    public function send(string $email, string $purpose, bool $private = false): void
    {
        $email = Str::lower(trim($email));
        $emailHash = hash('sha256', $email);
        $user = User::query()->where('email', $email)->first();
        // Include nonexistent emails in the public request limit and response.
        $code = (string) random_int(100000, 999999);
        $hash = Hash::make($code);
        $send = DB::transaction(function () use ($email, $emailHash, &$user, $purpose, $hash, $private): bool {
            if ($user) {
                $user = User::query()->whereKey($user->id)->lockForUpdate()->first();
            }
            if (DB::table('email_code_requests')->where('email_hash', $emailHash)->where('requested_at', '>', now()->subHour())->count() >= 3) {
                if ($private) {
                    throw ValidationException::withMessages(['code' => 'You can request 3 codes per hour. Please try again later.']);
                }

                return false;
            }
            DB::table('email_code_requests')->insert(['email_hash' => $emailHash, 'requested_at' => now()]);
            if (! $user || $user->email !== $email || ($purpose === 'password' && ! $user->password)) {
                return false;
            }
            DB::table('email_security_codes')->updateOrInsert(['user_id' => $user->id, 'purpose' => $purpose], [
                'email' => $email, 'code_hash' => $hash, 'expires_at' => now()->addMinutes(10), 'attempts' => 0,
                'token_hash' => null, 'token_expires_at' => null,
            ]);

            return true;
        });
        if ($send) {
            try {
                $user->notify(new EmailSecurityCode($code, $purpose));
            } catch (\Throwable $exception) {
                DB::table('email_security_codes')->where('user_id', $user->id)->where('purpose', $purpose)->where('code_hash', $hash)->delete();
                report($exception);
                throw ValidationException::withMessages(['code' => 'We could not send the email code. Please try again later or contact support.']);
            }
        }
    }

    public function verify(string $email, string $purpose, string $code): string
    {
        $token = DB::transaction(function () use ($email, $purpose, $code): ?string {
            $user = User::query()->where('email', Str::lower(trim($email)))->lockForUpdate()->first();
            $record = $user ? DB::table('email_security_codes')->where('user_id', $user->id)->where('purpose', $purpose)->lockForUpdate()->first() : null;
            if (! $record || ! $record->code_hash || $record->email !== $user->email || $record->expires_at <= now() || $record->attempts >= 5) {
                return null;
            }
            if (! Hash::check($code, $record->code_hash)) {
                // Commit wrong attempts before returning a validation error.
                DB::table('email_security_codes')->where('id', $record->id)->increment('attempts');

                return null;
            }
            $token = Str::random(64);
            DB::table('email_security_codes')->where('id', $record->id)->update(['code_hash' => null, 'token_hash' => hash('sha256', $token), 'token_expires_at' => now()->addMinutes(10)]);

            return $token;
        });
        if (! $token) {
            throw ValidationException::withMessages(['code' => 'The code is invalid, expired, or locked. Request a new code.']);
        }

        return $token;
    }

    public function hasValidConfirmation(User $user, string $purpose, ?string $token): bool
    {
        if (! $token) {
            return false;
        }

        return DB::table('email_security_codes')
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->where('email', $user->email)
            ->where('token_hash', hash('sha256', $token))
            ->where('token_expires_at', '>', now())
            ->exists();
    }

    // Call inside the user's transaction so confirmation and mutation are atomic.
    public function consume(User $user, string $purpose, ?string $token): void
    {
        $record = DB::table('email_security_codes')->where('user_id', $user->id)->where('purpose', $purpose)->lockForUpdate()->first();
        if (! $token || ! $record?->token_hash || $record->email !== $user->email || $record->token_expires_at <= now() || ! hash_equals($record->token_hash, hash('sha256', $token))) {
            throw ValidationException::withMessages(['code' => 'Confirm your email code again before continuing.']);
        }
        DB::table('email_security_codes')->where('id', $record->id)->delete();
    }

    public function confirmSensitiveChange(Request $request, User $user): void
    {
        if ($user->password && is_string($request->input('current_password')) && Hash::check($request->input('current_password'), $user->password)) {
            return;
        }
        $this->consume($user, 'profile', $request->session()->get('profile_confirmation'));
        $request->session()->forget('profile_confirmation');
    }

    public function changePassword(string $email, string $token, string $password, Request $request): void
    {
        DB::transaction(function () use ($email, $token, $password, $request) {
            $user = User::query()->where('email', Str::lower(trim($email)))->lockForUpdate()->first();
            if (! $user || ! $user->password) {
                throw ValidationException::withMessages(['code' => 'Confirm your email code again before continuing.']);
            }
            $this->consume($user, 'password', $token);
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            DB::table('email_security_codes')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            DB::table('sessions')->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->delete();
            event(new PasswordReset($user));
            if ($request->user()?->id === $user->id) {
                $request->user()->setRawAttributes($user->getAttributes(), true);
                $request->session()->regenerate();
                $request->session()->put('password_hash_web', $user->password);
            }
        });
    }
}
