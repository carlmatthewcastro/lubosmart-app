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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }

        $structuredName = $request->hasAny(['first_name', 'last_name']);
        $validated = $request->validate([
            'name' => $structuredName ? ['exclude'] : ['nullable', 'string', 'max:160'],
            'first_name' => [$structuredName ? 'required' : 'exclude', 'string', 'max:80'],
            'last_name' => [$structuredName ? 'required' : 'exclude', 'string', 'max:80'],
            'email' => 'required|string|lowercase|email|max:160|unique:'.User::class,
            'role' => ['required', Rule::in(['buyer', 'seller', 'courier', 'sorting_center'])],
            'store_name' => ['nullable', 'string', 'max:160'],
            'business_category_id' => ['nullable', 'integer', Rule::exists(Category::class, 'id')->whereNull('parent_id')->where('is_active', true)],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'policy_accepted' => ['sometimes', 'boolean'],
        ], [
            'email.required' => 'Enter your email.',
            'email.email' => 'Enter a valid email.',
            'email.unique' => 'This email is already registered.',
            'password.required' => 'Enter your password.',
            'password.min' => 'Use 8 or more characters.',
            'password.confirmed' => 'Passwords don’t match.',
            'role.in' => 'Choose a valid account type.',
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => isset($validated['first_name'])
                    ? Str::substr($validated['first_name'].' '.$validated['last_name'], 0, 160)
                    : ($validated['name'] ?? 'LubosMart member'),
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);
            $user->forceFill(['status' => 'unverified'])->save();
            if (isset($validated['first_name'])) {
                DB::table('user_profiles')->insert([
                    'user_id' => $user->id,
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            RegistrationApplication::query()->create([
                'user_id' => $user->id, 'requested_role' => $user->role,
                'policy_version' => ! empty($validated['policy_accepted']) ? 'terms-privacy-2026-10' : null, 'policy_accepted_at' => ! empty($validated['policy_accepted']) ? now() : null,
            ]);

            if ($validated['role'] === 'seller' && filled($validated['store_name'] ?? null) && filled($validated['business_category_id'] ?? null)) {
                Store::query()->create([
                    'user_id' => $user->id,
                    'name' => $validated['store_name'],
                    'business_category_id' => $validated['business_category_id'],
                    'status' => 'pending',
                ]);
            }

            return $user;
        });

        $mailStatus = 'verification-link-sent';
        try {
            event(new Registered($user));
        } catch (\Throwable $exception) {
            report($exception);
            $mailStatus = 'verification-mail-unavailable';
        }

        Auth::login($user);
        $request->session()->regenerate();

        return to_route('verification.notice')->with('status', $mailStatus);
    }
}
