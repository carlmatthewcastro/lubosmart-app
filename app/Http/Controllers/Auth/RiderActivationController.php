<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\RiderInvitations;
use App\Support\AccountRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RiderActivationController extends Controller
{
    public function show(Request $request, string $token, RiderInvitations $invitations): Response
    {
        $record = $invitations->eligible($token);
        if ($request->user() && $record) {
            abort_unless($request->user()->role === 'sorting_center' && $request->user()->id === $record->company_id, 403);
        }

        return Inertia::render('auth/activate-rider', ['token' => $token, 'valid' => $record !== null, 'requiresLogout' => $request->user() !== null]);
    }

    public function store(Request $request, string $token, RiderInvitations $invitations): RedirectResponse
    {
        $data = $request->validate(['password' => ['required', 'confirmed', ...AccountRules::password()]]);
        $invitations->activate($token, $data['password']);

        return to_route('login')->with('status', 'Your rider account is active. Sign in with your new password.');
    }
}
