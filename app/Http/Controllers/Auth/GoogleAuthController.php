<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccountVerificationLifecycle;
use App\Services\GoogleRegistration;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): Response
    {
        $data = $request->validate([
            'intent' => ['required', Rule::in(['login', 'register'])],
            'role' => ['exclude_unless:intent,register', 'required', Rule::in(['buyer', 'seller', 'sorting_center'])],
            'policy_accepted' => ['exclude_unless:intent,register', 'sometimes', 'boolean'],
        ]);
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return back()->withErrors(['google' => 'Google sign-in is currently unavailable. Please use email and password to continue.']);
        }
        $request->session()->put('google_registration', [...$data, 'started_at' => now()->timestamp]);
        $request->session()->forget('pending_google_registration');

        return Inertia::location(Socialite::driver('google')->redirect()->getTargetUrl());
    }

    public function callback(Request $request): RedirectResponse
    {
        $registration = $request->session()->pull('google_registration');
        if ($request->filled('error') || ! is_array($registration) || ($registration['started_at'] ?? 0) < now()->subMinutes(15)->timestamp || $registration['started_at'] > now()->timestamp
            || ! in_array($registration['intent'] ?? null, ['login', 'register'], true)
            || ($registration['intent'] === 'register' && (! in_array($registration['role'] ?? null, ['buyer', 'seller', 'sorting_center'], true)))) {
            return to_route('home')->withErrors(['google' => 'Google sign-in expired or was cancelled. Please try again.']);
        }
        try {
            $google = Socialite::driver('google')->user();
        } catch (\Exception $exception) {
            report($exception);

            return to_route('home')->withErrors(['google' => 'Google sign-in could not be completed. Please try again.']);
        }
        $email = Str::lower(trim((string) $google->getEmail()));
        $id = trim((string) $google->getId());
        $raw = $google->getRaw();
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160 || $id === '' || strlen($id) > 255 || ($raw['email_verified'] ?? $raw['verified_email'] ?? false) !== true) {
            return to_route('home')->withErrors(['google' => 'Google did not provide a verified email address. Please use email and password registration instead.']);
        }
        $newIdentity = false;
        try {
            $user = DB::transaction(function () use ($email, $id, &$newIdentity): ?User {
                $newIdentity = false;
                $user = User::query()->where('google_id', $id)->lockForUpdate()->first();
                if ($user) {
                    if ($user->status === 'unverified' && $user->application?->registration_contract === 'company-rider-2026-10') {
                        return null;
                    }
                    if ($user->email === $email && ! $user->hasVerifiedEmail() && ! in_array($user->status, ['suspended', 'deactivated'], true)) {
                        app(AccountVerificationLifecycle::class)->complete($user);
                        DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
                        DB::table('registration_email_codes')->where('user_id', $user->id)->delete();
                    }

                    return $user;
                }
                $user = User::query()->where('email', $email)->lockForUpdate()->first();
                if ($user) {
                    if ($user->status === 'unverified' && $user->application?->registration_contract === 'company-rider-2026-10') {
                        return null;
                    }
                    if (in_array($user->status, ['suspended', 'deactivated'], true)) {
                        return $user;
                    }
                    if (filled($user->google_id)) {
                        return null;
                    }
                    $user->forceFill(['google_id' => $id])->save();
                    app(AccountVerificationLifecycle::class)->complete($user);
                    DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
                    DB::table('registration_email_codes')->where('user_id', $user->id)->delete();

                    return $user;
                }
                $newIdentity = true;

                return null;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            return to_route('home')->withErrors(['google' => 'This account was updated during sign-in. Please try signing in again.']);
        }
        if (! $user) {
            if ($newIdentity) {
                $request->session()->regenerate();
                app(GoogleRegistration::class)->remember($request, $id, $email, (string) $google->getName(), $raw);

                return to_route('register');
            }

            return to_route('login')->withErrors(['google' => 'This Google account cannot be linked. Please use your existing sign-in method or contact support.']);
        }
        if (in_array($user->status, ['suspended', 'deactivated'], true)) {
            return to_route('home')->withErrors(['google' => 'This account cannot sign in. Contact LubosMart support.']);
        }
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->forget('url.intended');

        return to_route($user->onboardingRoute());
    }
}
