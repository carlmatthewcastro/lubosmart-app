<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\RegistrationEmailCodes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class RegistrationEmailCodeController extends Controller
{
    public function store(Request $request, RegistrationEmailCodes $codes): RedirectResponse
    {
        abort_if($request->user()->hasVerifiedEmail(), 403);
        $data = $request->validate(['code' => ['required', 'string', 'regex:/\A[0-9]{6}\z/']]);
        $user = $codes->verify($request->user(), $data['code']);
        $request->user()->setRawAttributes($user->getAttributes(), true);
        $request->session()->forget('url.intended');

        $message = match ($user->status) {
            'approved' => 'Email verified. Your account is active.',
            'pending' => 'Email verified. Your application is awaiting administrator approval.',
            default => 'Email verified. Complete your application for review.',
        };

        return to_route($user->onboardingRoute())->with('status', $message);
    }
}
