<?php

namespace App\Policies;

use App\Models\RegistrationApplication;
use App\Models\User;

class RegistrationApplicationPolicy
{
    public function review(User $user, RegistrationApplication $application): bool
    {
        if ($user->status !== 'approved' || ! $user->hasVerifiedEmail() || $user->id === $application->user_id) {
            return false;
        }

        return $user->canAdmin('registrations')
            || ($user->role === 'sorting_center' && $application->requested_role === 'courier'
                && $application->user->role === 'courier' && $application->user->sorting_center_id === $application->sorting_center_id
                && $user->sortingCenters()->operational()->where('sorting_centers.id', $application->sorting_center_id)->exists());
    }

    public function view(User $user, RegistrationApplication $application): bool
    {
        return $user->canOperate() && ($user->canAdmin('registrations') || $this->review($user, $application));
    }
}
