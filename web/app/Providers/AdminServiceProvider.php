<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Admin\AdminPermissions;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AdminServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        foreach (AdminPermissions::ALL as $permission) {
            Gate::define('admin.'.$permission, fn (User $user) => $user->canAdmin($permission));
        }
    }
}
