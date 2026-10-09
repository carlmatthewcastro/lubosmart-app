<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailSecurityCodes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EmailCodeController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('auth/verify-code', ['email' => $request->session()->get('password_code_email', ''), 'status' => $request->session()->get('status')]);
    }

    public function verify(Request $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $data = $request->validate(['email' => 'required|email|max:160', 'code' => 'required|digits:6']);
        $token = $codes->verify($data['email'], 'password', $data['code']);

        return to_route('password.reset', ['token' => $token, 'email' => strtolower(trim($data['email']))]);
    }

    public function sendAuthenticated(Request $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $data = $request->validate(['purpose' => ['required', Rule::in(['password', 'profile'])]]);
        if ($data['purpose'] === 'password' && ! $request->user()->password) {
            return back()->withErrors(['code' => 'This account uses Google only. Sign in with Google.']);
        }
        $codes->send($request->user()->email, $data['purpose'], true);

        return back()->with('status', 'A verification code was sent to your registered email.');
    }

    public function verifyAuthenticated(Request $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $data = $request->validate(['purpose' => ['required', Rule::in(['password', 'profile'])], 'code' => 'required|digits:6']);
        $token = $codes->verify($request->user()->email, $data['purpose'], $data['code']);
        $request->session()->put($data['purpose'].'_confirmation', $token);

        return back()->with('status', 'Email confirmed. You have 10 minutes to save your change.');
    }
}
