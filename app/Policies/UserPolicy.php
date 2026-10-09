<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function updateStatus(User $actor, User $user): bool
    {
        if ($actor->status !== 'approved' || ! $actor->hasVerifiedEmail() || $actor->id === $user->id || $user->role === 'admin') {
            return false;
        }
        if ($actor->role === 'admin') {
            return $actor->canAdmin('accounts');
        }

        return $actor->role === 'sorting_center' && $user->role === 'courier' && $user->application?->status === 'approved'
            && $actor->sortingCenters()->operational()->where('sorting_centers.id', $user->sorting_center_id)->exists();
    }
}
