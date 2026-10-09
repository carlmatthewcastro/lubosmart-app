<?php

namespace App\Policies;

use App\Models\SupportCase;
use App\Models\User;

class SupportCasePolicy
{
    public function view(User $user, SupportCase $case): bool
    {
        return $user->status === 'approved' && $user->hasVerifiedEmail()
            && ($user->canAdmin($case->kind === 'complaint' ? 'disputes' : 'messages') || $case->participants()->where('users.id', $user->id)->exists());
    }
}
