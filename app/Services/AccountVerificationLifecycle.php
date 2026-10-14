<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class AccountVerificationLifecycle
{
    // Called with the user locked. Historical applications keep their review flow.
    public function complete(User $user): void
    {
        $application = $user->application()->lockForUpdate()->first();
        $status = $user->status === 'unverified' ? 'incomplete' : $user->status;
        if ($application?->registration_contract === 'company-rider-2026-10' && $user->status === 'unverified') {
            throw ValidationException::withMessages(['code' => 'Use your company invitation to activate your rider account.']);
        }
        if ($user->status === 'unverified' && $user->role === 'sorting_center' && $application?->registration_contract === 'logistics-2026-10' && $application->status === 'submitted') {
            $status = 'pending';
        }
        if ($user->status === 'unverified' && $user->role === 'courier' && $application?->registration_contract === 'self-service-rider-2026-10' && $application->status === 'submitted') {
            $status = 'pending';
        }
        if ($user->status === 'unverified' && $application?->registration_contract === 'buyer-seller-2026-10') {
            if (in_array($user->role, ['buyer', 'seller'], true) && $application->requested_role === $user->role && $application->status === 'submitted') {
                $status = 'pending';
            }
        }
        $user->forceFill(['email_verified_at' => now(), 'status' => $status])->save();
    }
}
