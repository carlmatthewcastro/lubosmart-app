<?php

namespace App\Policies;

use App\Models\RegistrationApplication;
use App\Models\User;

class RegistrationApplicationPolicy
{
    public function review(User $user, RegistrationApplication $application): bool
    {
        if ($user->status !== 'active' || ! $user->hasVerifiedEmail() || $user->id === $application->user_id) {
            return false;
        }
        if ($user->role === 'admin' || $application->requested_role !== 'rider') {
            return $user->role === 'admin';
        }

        return $user->role === 'logistics' && $user->sortingCenters()->where('sorting_centers.id', $application->sorting_center_id)->where('is_active', true)->exists();
    }
}
