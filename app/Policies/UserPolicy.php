<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function updateStatus(User $actor, User $user): bool
    {
        if ($actor->role === 'logistics' && $user->logistics_company_id && $user->logistics_company_id !== $actor->id) {
            return false;
        }
        if ($actor->status !== 'approved' || ! $actor->hasVerifiedEmail() || $actor->id === $user->id || $user->role === 'admin') {
            return false;
        }
        if ($actor->role === 'admin') {
            return $actor->canAdmin('accounts') && $user->role !== 'rider';
        }

        return $actor->role === 'logistics' && $user->role === 'rider' && $user->application?->status === 'approved'
            && $actor->logisticsCenters()->operational()->where('logistics_centers.id', $user->logistics_center_id)->exists();
    }
}
