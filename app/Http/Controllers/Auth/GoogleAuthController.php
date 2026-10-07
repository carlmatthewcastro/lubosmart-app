<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\RegistrationApplication;
use App\Models\Store;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): Response
    {
        $validated = $request->validate([
            'intent' => ['nullable', Rule::in(['login', 'register'])],
            'role' => ['required_unless:intent,login', 'nullable', Rule::in(['buyer', 'seller', 'rider', 'logistics'])],
            'store_name' => ['nullable', 'string', 'max:160'],
            'business_category_id' => ['nullable', 'integer', Rule::exists(Category::class, 'id')->whereNull('parent_id')->where('is_active', true)],
        ]);

        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return back()->withErrors([
                'google' => 'Google sign-in is currently unavailable. Please use email and password to continue.',
            ]);
        }

        $request->session()->put('google_registration', [
            'intent' => $validated['intent'] ?? 'register',
            'started_at' => now()->timestamp,
            'role' => $validated['role'] ?? null,
            'store_name' => $validated['store_name'] ?? null,
            'business_category_id' => $validated['business_category_id'] ?? null,
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

        if (! is_array($registration) || ! isset($registration['started_at']) || $registration['started_at'] < now()->subMinutes(15)->timestamp || $registration['started_at'] > now()->timestamp || ! in_array($registration['intent'] ?? null, ['login', 'register'], true) || ($registration['intent'] === 'register' && ! in_array($registration['role'] ?? null, ['buyer', 'seller', 'rider', 'logistics'], true))) {
            return to_route('home')->withErrors([
                'google' => 'Please choose an account type before continuing with Google.',
            ]);
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $exception) {
            report($exception);

            return to_route('home')->withErrors(['google' => 'Google sign-in could not be completed. Please try again.']);
        }
        $googleEmail = Str::lower(trim((string) $googleUser->getEmail()));
        $googleId = trim((string) $googleUser->getId());
        $googleProfile = $googleUser->getRaw();
        $isEmailVerified = ($googleProfile['email_verified'] ?? $googleProfile['verified_email'] ?? false) === true;

        if (! filter_var($googleEmail, FILTER_VALIDATE_EMAIL) || strlen($googleEmail) > 160 || $googleId === '' || strlen($googleId) > 255 || ! $isEmailVerified) {
            return to_route('home')->withErrors([
                'google' => 'Google did not provide a verified email address. Please use email and password registration instead.',
            ]);
        }

        if ($registration['intent'] === 'register' && ($registration['role'] ?? null) === 'seller' && filled($registration['business_category_id'] ?? null) && ! Category::query()->whereKey($registration['business_category_id'])->whereNull('parent_id')->where('is_active', true)->exists()) {
            return to_route('home')->withErrors([
                'google' => 'Seller registration requires a store name and an available product category. Please select both and try again.',
            ]);
        }

        $user = DB::transaction(function () use ($googleEmail, $googleId, $googleUser, $registration): ?User {
            $user = User::query()->where('google_id', $googleId)->lockForUpdate()->first();

            if ($user) {
                return $user;
            }

            if ($registration['intent'] === 'login') {
                return null;
            }

            $user = User::query()->where('email', $googleEmail)->lockForUpdate()->first();

            // Email equality alone must never link a provider to an existing identity.
            if ($user) {
                return null;
            }

            $user = User::query()->create([
                'name' => Str::substr($googleUser->getName() ?: $googleEmail, 0, 160),
                'email' => $googleEmail,
                'google_id' => $googleId,
                'password' => Hash::make(Str::random(64)),
                'role' => $registration['role'],
            ]);
            $user->forceFill(['email_verified_at' => now(), 'status' => $user->role === 'buyer' ? 'active' : 'pending'])->save();
            if ($user->role !== 'buyer') {
                RegistrationApplication::query()->create(['user_id' => $user->id, 'requested_role' => $user->role]);
            }

            if ($registration['role'] === 'seller' && filled($registration['store_name'] ?? null) && filled($registration['business_category_id'] ?? null)) {
                Store::query()->create([
                    'user_id' => $user->id,
                    'name' => $registration['store_name'],
                    'business_category_id' => $registration['business_category_id'],
                    'status' => 'pending',
                ]);
            }

            return $user;
        });

        if (! $user) {
            return to_route('home')->withErrors([
                'google' => 'Use your existing sign-in method, or create a new account from the registration form.',
            ]);
        }

        if ($user->status === 'suspended') {
            return to_route('home')->withErrors(['google' => 'Your account is suspended. Contact LubosMart support.']);
        }

        if ($user->wasRecentlyCreated) {
            event(new Registered($user));
        }

        Auth::login($user);
        $request->session()->regenerate();

        $request->session()->forget('url.intended');

        return redirect(URL::route('dashboard', absolute: false));
    }
}
