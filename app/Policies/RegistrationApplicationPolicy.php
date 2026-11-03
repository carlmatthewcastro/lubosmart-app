<?php

namespace App\Policies;

use App\Models\RegistrationApplication;
use App\Models\User;

class RegistrationApplicationPolicy
{
    public function review(User $user, RegistrationApplication $application): bool
    {
        if ($user->role === 'logistics' && $application->user->logistics_company_id && $application->user->logistics_company_id !== $user->id) {
            return false;
        }
        if ($user->status !== 'approved' || ! $user->hasVerifiedEmail() || $user->id === $application->user_id) {
            return false;
        }

        return ($user->canAdmin('registrations') && $application->requested_role !== 'rider')
            || ($user->role === 'logistics' && $application->requested_role === 'rider'
                && $application->user->role === 'rider' && $application->user->logistics_center_id === $application->logistics_center_id
                && $user->logisticsCenters()->operational()->where('logistics_centers.id', $application->logistics_center_id)->exists());
    }

    public function view(User $user, RegistrationApplication $application): bool
    {
        return $user->canOperate() && (($user->canAdmin('registrations') && $application->requested_role !== 'rider') || $this->review($user, $application));
    }
}
