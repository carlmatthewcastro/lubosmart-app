<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailSecurityCodes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VerificationEmailController extends Controller
{
    public function update(Request $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $request->merge(['email' => is_string($request->input('email')) ? strtolower(trim($request->input('email'))) : $request->input('email')]);
        $data = $request->validate([
            'email' => ['required', 'email', 'max:160', Rule::unique('users')->ignore($request->user()->id)],
            'current_password' => ['nullable', 'string', 'max:255'],
        ]);
        DB::transaction(function () use ($request, $data, $codes) {
            $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_if($user->hasVerifiedEmail(), 403);
            $codes->confirmSensitiveChange($request, $user);
            $oldEmail = $user->email;
            $user->forceFill(['email' => $data['email'], 'email_verified_at' => null])->save();
            DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
            DB::table('email_security_codes')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $oldEmail)->delete();
            $request->user()->setRawAttributes($user->getAttributes(), true);
        });
        try {
            $request->user()->sendEmailVerificationNotification();
        } catch (\Throwable $exception) {
            report($exception);

            return to_route('verification.notice')->with('status', 'verification-mail-unavailable');
        }

        return to_route('verification.notice')->with('status', 'verification-link-sent');
    }
}
