<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if ($request->user()?->role === 'admin') {
            Gate::authorize('admin.'.$permission);
        }

        return $next($request);
    }
}
