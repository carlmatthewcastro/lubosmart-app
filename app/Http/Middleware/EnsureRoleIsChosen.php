<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRoleIsChosen
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->hasVerifiedEmail() && $request->user()->role === null && ! $request->routeIs('role.*', 'logout', 'home', 'shop', 'verification.*', 'auth.google.*')) {
            return to_route('role.choose');
        }

        return $next($request);
    }
}
