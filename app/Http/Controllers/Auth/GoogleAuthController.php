<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): Response
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['buyer', 'seller', 'rider'])],
            'store_name' => ['required_if:role,seller', 'nullable', 'string', 'max:160'],
            'store_description' => ['required_if:role,seller', 'nullable', 'string'],
        ]);

        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return back()->withErrors([
                'google' => 'Google sign-in is not configured yet. Add the Google OAuth credentials to your local environment.',
            ]);
        }

        $request->session()->put('google_registration', [
            'role' => $validated['role'],
            'store_name' => $validated['store_name'] ?? null,
            'store_description' => $validated['store_description'] ?? null,
        ]);

        return Inertia::location(Socialite::driver('google')->redirect()->getTargetUrl());
    }

    public function callback(Request $request): RedirectResponse
    {
        $registration = $request->session()->pull('google_registration');

        if ($request->filled('error')) {
            return to_route('home')->withErrors([
                'google' => 'Google sign-in was cancelled. You can try again whenever you are ready.',
            ]);
        }

        if (! is_array($registration) || ! in_array($registration['role'] ?? null, ['buyer', 'seller', 'rider'], true)) {
            return to_route('home')->withErrors([
                'google' => 'Please choose an account type before continuing with Google.',
            ]);
        }

        $googleUser = Socialite::driver('google')->user();
        $googleEmail = Str::lower(trim((string) $googleUser->getEmail()));
        $googleId = trim((string) $googleUser->getId());
        $googleProfile = $googleUser->getRaw();
        $isEmailVerified = ($googleProfile['email_verified'] ?? $googleProfile['verified_email'] ?? false) === true;

        if ($googleEmail === '' || strlen($googleEmail) > 160 || $googleId === '' || ! $isEmailVerified) {
            return to_route('home')->withErrors([
                'google' => 'Google did not provide a verified email address. Please use email and password registration instead.',
            ]);
        }

        if (($registration['role'] ?? null) === 'seller' && (blank($registration['store_name'] ?? null) || blank($registration['store_description'] ?? null))) {
            return to_route('home')->withErrors([
                'google' => 'Seller registration requires a store name and description. Please enter both and try again.',
            ]);
        }

        $user = DB::transaction(function () use ($googleEmail, $googleId, $googleUser, $registration): ?User {
            $user = User::query()->where('google_id', $googleId)->lockForUpdate()->first();

            if ($user) {
                return $user;
            }

            $user = User::query()->where('email', $googleEmail)->lockForUpdate()->first();

            if ($user && $user->google_id !== null) {
                return null;
            }

            if ($user) {
                $user->forceFill([
                    'google_id' => $googleId,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ])->save();

                return $user;
            }

            $user = User::query()->create([
                'name' => $googleUser->getName() ?: $googleEmail,
                'email' => $googleEmail,
                'google_id' => $googleId,
                'password' => Hash::make(Str::random(64)),
                'role' => $registration['role'],
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();

            if ($registration['role'] === 'seller') {
                Store::query()->create([
                    'user_id' => $user->id,
                    'name' => $registration['store_name'],
                    'description' => $registration['store_description'],
                    'status' => 'pending',
                ]);
            }

            return $user;
        });

        if (! $user) {
            return to_route('home')->withErrors([
                'google' => 'This email is already linked to another Google account. Please log in with your existing sign-in method.',
            ]);
        }

        if ($user->wasRecentlyCreated) {
            event(new \Illuminate\Auth\Events\Registered($user));
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(URL::route('dashboard', absolute: false));
    }
}
