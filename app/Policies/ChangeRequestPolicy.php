<?php

namespace App\Policies;

use App\Models\ChangeRequest;
use App\Models\User;

class ChangeRequestPolicy
{
    public function create(User $user): bool
    {
        return $user->role === 'logistics' && $user->hasVerifiedEmail() && in_array($user->status, ['approved', 'pending_reverification'], true)
            && $user->application()->where('status', 'approved')->exists();
    }

    public function viewAny(User $user): bool
    {
        return $user->canAdmin('registrations');
    }

    public function review(User $user, ChangeRequest $changeRequest): bool
    {
        return $user->id !== $changeRequest->account_id && $this->viewAny($user);
    }
}
