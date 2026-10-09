<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Services\EmailSecurityCodes;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(Request $request, EmailSecurityCodes $codes): Response
    {
        return Inertia::render('settings/password', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'googleOnly' => ! $request->user()->password,
            'confirmed' => $codes->hasValidConfirmation($request->user(), 'password', $request->session()->get('password_confirmation')),
        ]);
    }

    /**
     * Validate the proposed password before sending its confirmation code.
     */
    public function confirmChange(PasswordUpdateRequest $request, EmailSecurityCodes $codes): RedirectResponse
    {
        if (! $request->user()->password) {
            throw ValidationException::withMessages(['code' => 'This account uses Google only. Sign in with Google.']);
        }

        $request->session()->forget('password_confirmation');
        $codes->send($request->user()->email, 'password', true);

        return back()->with('status', 'A verification code was sent to your registered email.');
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $validated = $request->validated();

        $codes->changePassword($request->user()->email, $request->session()->get('password_confirmation', ''), $validated['password'], $request);
        $request->session()->forget('password_confirmation');

        return back()->with('status', 'Password changed. Other devices have been signed out.');
    }
}
