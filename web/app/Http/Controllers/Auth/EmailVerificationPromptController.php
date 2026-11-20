<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailVerificationLinks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Show the email verification prompt page.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        return $request->user()->hasVerifiedEmail()
                    ? to_route($request->user()->onboardingRoute())
                    : Inertia::render('auth/verify-email', [
                        'status' => $request->session()->get('status'),
                        'email' => $request->user()->email,
                        'cooldown' => app(EmailVerificationLinks::class)->cooldown($request->user()),
                    ]);
    }
}
