<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailSecurityCodes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email|max:160',
        ]);

        try {
            $codes->send($request->input('email'), 'password');
        } catch (\Throwable $exception) {
            report($exception);
        }
        $request->session()->put('password_code_email', strtolower(trim($request->input('email'))));

        return to_route('password.code')->with('status', EmailSecurityCodes::SENT_MESSAGE);
    }
}
