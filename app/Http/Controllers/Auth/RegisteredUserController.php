<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterAccountRequest;
use App\Models\SortingCenter;
use App\Services\GoogleRegistration;
use App\Services\RegisterAccount;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(Request $request, GoogleRegistration $google): Response
    {
        $identity = $google->pending($request);

        return Inertia::render('auth/register', [
            'riderCenters' => SortingCenter::query()->operational()->orderBy('name')->get(['id', 'name']),
            'googleRegistration' => $identity ? array_intersect_key($identity, array_flip(['first_name', 'last_name', 'email'])) : null,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(RegisterAccountRequest $request, RegisterAccount $accounts): RedirectResponse
    {
        $identity = app(GoogleRegistration::class)->pending($request);
        $user = $accounts->create($request->validated(), $identity['id'] ?? null);
        $request->session()->forget('pending_google_registration');

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
