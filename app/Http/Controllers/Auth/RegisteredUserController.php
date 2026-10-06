<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\Rule;
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
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->merge(['role' => $request->input('role', 'buyer')]);

        $validated = $request->validate([
            'name' => 'required|string|max:160',
            'email' => 'required|string|lowercase|email|max:160|unique:'.User::class,
            'role' => ['required', Rule::in(['buyer', 'seller', 'rider'])],
            'store_name' => ['required_if:role,seller', 'nullable', 'string', 'max:160'],
            'store_description' => ['required_if:role,seller', 'nullable', 'string'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);

            if ($validated['role'] === 'seller') {
                Store::query()->create([
                    'user_id' => $user->id,
                    'name' => $validated['store_name'],
                    'description' => $validated['store_description'],
                    'status' => 'pending',
                ]);
            }

            return $user;
        });

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard');
    }
}
