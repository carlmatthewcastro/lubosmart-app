<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function updateStatus(User $actor, User $user): bool
    {
        if ($actor->role === 'sorting_center' && $user->logistics_company_id && $user->logistics_company_id !== $actor->id) {
            return false;
        }
        if ($actor->status !== 'approved' || ! $actor->hasVerifiedEmail() || $actor->id === $user->id || $user->role === 'admin') {
            return false;
        }
        if ($actor->role === 'admin') {
            return $actor->canAdmin('accounts') && $user->role !== 'courier';
        }

        return $actor->role === 'sorting_center' && $user->role === 'courier' && $user->application?->status === 'approved'
            && $actor->sortingCenters()->operational()->where('sorting_centers.id', $user->sorting_center_id)->exists();
    }
}
