<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailVerificationLinks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(Request $request, string $token, EmailVerificationLinks $links): Response|RedirectResponse
    {
        $user = $links->verify($token);
        if ($user && $request->user()?->id === $user->id) {
            $request->user()->setRawAttributes($user->getAttributes(), true);
            $request->session()->forget('url.intended');

            return to_route($user->onboardingRoute());
        }

        return Inertia::render('auth/verification-result', ['verified' => $user !== null]);
    }
}
