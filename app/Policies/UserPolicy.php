<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function updateStatus(User $actor, User $user): bool
    {
        if ($actor->status !== 'active' || ! $actor->hasVerifiedEmail() || $actor->id === $user->id || $user->role === 'admin') {
            return false;
        }
        if ($actor->role === 'admin') {
            return true;
        }

        return $actor->role === 'logistics' && $user->role === 'rider' && $user->application?->status === 'approved'
            && $actor->sortingCenters()->where('is_active', true)->where('sorting_centers.id', $user->application->sorting_center_id)->exists();
    }
}
