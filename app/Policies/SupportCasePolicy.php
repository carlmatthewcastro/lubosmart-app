<?php

namespace App\Policies;

use App\Models\SupportCase;
use App\Models\User;

class SupportCasePolicy
{
    public function view(User $user, SupportCase $case): bool
    {
        return $user->status === 'active' && $user->hasVerifiedEmail()
            && ($user->role === 'admin' || $case->participants()->where('users.id', $user->id)->exists());
    }
}
