<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailVerificationLinks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(Request $request, string $token, EmailVerificationLinks $links): Response|RedirectResponse
    {
        abort(410, 'Verification links are disabled. Enter the six-digit code from your email.');
    }
}
