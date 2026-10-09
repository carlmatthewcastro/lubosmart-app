<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Order;
use App\Models\SupportCase;
use App\Models\User;
use App\Services\EmailSecurityCodes;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'googleConnected' => filled($request->user()->google_id),
            'googleOnly' => ! $request->user()->password,
            'sensitiveConfirmed' => $request->session()->has('profile_confirmation'),
            'businessName' => $request->user()->role === 'sorting_center' ? $request->user()->application?->business_name : $request->user()->store?->name,
            'bankAccount' => $request->user()->role === 'seller' ? $request->user()->store?->bank_account : $request->user()->bank_account,
            'plateNumber' => DB::table('rider_profiles')->where('user_id', $request->user()->id)->value('plate_number'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request, EmailSecurityCodes $codes): RedirectResponse
    {
        $path = null;
        $emailChanged = false;
        try {
            DB::transaction(function () use ($request, $codes, &$path, &$emailChanged) {
                $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                $before = $user->only(['name', 'email', 'phone', 'status']);
                $user->fill($request->safe()->only($user->role === 'admin' ? ['name'] : ['name', 'email']));
                if ($user->role !== 'admin' && $request->has('phone')) {
                    $user->forceFill(['phone' => $request->validated('phone')]);
                }
                $store = $user->store;
                $businessName = $user->role === 'sorting_center' ? $user->application?->business_name : $store?->name;
                $bankAccount = $user->role === 'seller' ? $store?->bank_account : $user->bank_account;
                $rider = DB::table('rider_profiles')->where('user_id', $user->id)->first();
                $partnerBefore = ['business_name' => $businessName, 'plate_number' => $rider?->plate_number];
                $bankChanged = $request->has('bank_account') && $request->validated('bank_account') !== $bankAccount;
                $businessChanged = $request->has('business_name') && $request->validated('business_name') !== $businessName;
                $plateChanged = $request->has('plate_number') && $request->validated('plate_number') !== $rider?->plate_number;
                if ($user->isDirty(['email', 'phone']) || $bankChanged) {
                    // Confirm against the current email before applying its replacement.
                    $identity = User::query()->findOrFail($user->id);
                    $codes->confirmSensitiveChange($request, $identity);
                }
                $important = $businessChanged || $bankChanged || $plateChanged || $request->hasFile('identity');
                if ($important && $user->status !== 'approved') {
                    throw ValidationException::withMessages(['business_name' => 'Complete your application or wait for its review before changing partner details.']);
                }
                if ($user->isDirty('email')) {
                    $emailChanged = true;
                    $user->email_verified_at = null;
                    DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
                    DB::table('email_security_codes')->where('user_id', $user->id)->delete();
                }
                if ($request->has('phone') && $user->isDirty('phone') && $user->role === 'buyer' && $user->status === 'approved' && blank($user->phone)) {
                    throw ValidationException::withMessages(['phone' => 'Approved buyers must keep a valid contact number.']);
                }
                if ($businessChanged) {
                    $businessName = $request->validated('business_name');
                    if ($store) {
                        $store->name = $businessName;
                    }
                }
                if ($bankChanged) {
                    if ($user->role !== 'seller') {
                        $user->bank_account = $request->validated('bank_account');
                    } else {
                        $store->bank_account = $request->validated('bank_account');
                    }
                }
                if ($plateChanged) {
                    DB::table('rider_profiles')->where('user_id', $user->id)->update(['plate_number' => $request->validated('plate_number'), 'updated_at' => now()]);
                }
                if ($important && in_array($user->role, ['buyer', 'seller', 'courier', 'sorting_center'], true)) {
                    $user->status = 'pending';
                    $user->application()->updateOrCreate(['user_id' => $user->id], [
                        'requested_role' => $user->role, 'status' => 'submitted', 'submitted_at' => now(),
                        'reviewer_id' => null, 'reviewed_at' => null, 'rejection_reason' => null,
                        'business_name' => $businessName,
                        'sorting_center_id' => $user->role === 'courier' ? $user->sorting_center_id : null,
                    ]);
                    if ($request->hasFile('identity')) {
                        $application = $user->application()->firstOrFail();
                        $file = $request->file('identity');
                        $path = $file->store('registration/'.$application->id, 'local');
                        if (! $path) {
                            throw new \RuntimeException('Unable to store the identity document.');
                        }
                        $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
                    }
                    if ($store) {
                        $store->status = 'pending';
                    }
                }
                $store?->save();
                $user->save();
                DB::table('audit_events')->insert(['actor_id' => $user->id, 'subject_type' => 'user', 'subject_id' => $user->id, 'action' => $important ? 'profile_review_requested' : 'profile_updated',
                    'old_status' => $before['status'], 'new_status' => $user->status,
                    'changes' => json_encode(['before' => $before, 'after' => $user->only(['name', 'email', 'phone', 'status']), 'partner_before' => $partnerBefore, 'partner_after' => ['business_name' => $businessName, 'plate_number' => $plateChanged ? $request->validated('plate_number') : $rider?->plate_number], 'bank_account_changed' => $bankChanged, 'identity_changed' => $request->hasFile('identity')]), 'occurred_at' => now()]);
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        if ($emailChanged) {
            try {
                $request->user()->fresh()->sendEmailVerificationNotification();
            } catch (\Throwable $exception) {
                report($exception);

                return to_route('verification.notice')->with('status', 'verification-mail-unavailable');
            }

            return to_route('verification.notice')->with('status', 'verification-link-sent');
        }

        return to_route($request->user()->fresh()->status === 'pending' ? 'application.waiting' : 'profile.edit')->with('status', $request->user()->role === 'admin'
            ? 'Admin name saved.'
            : 'Profile saved. Important changes require another approval review.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($user->role !== 'buyer' || $user->application()->exists() || Order::query()->where('buyer_id', $user->id)->exists()
            || DB::table('audit_events')->where('actor_id', $user->id)->exists()
            || SupportCase::query()->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))->exists()) {
            throw ValidationException::withMessages(['password' => 'This account has records to keep. Contact support to request account closure.']);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
