<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $request->routeIs('verification.*', 'logout')) {
            return $next($request);
        }
        if (! $user->hasVerifiedEmail()) {
            return to_route('verification.notice');
        }
        if ($user->status === 'unverified') {
            $user->forceFill(['status' => 'incomplete'])->save();
        }
        if ($request->routeIs('registration-documents.show')) {
            return $next($request);
        }
        if ($user->status === 'pending' && ! $request->routeIs('application.waiting', 'home', 'shop', 'platform-information', 'dashboard')) {
            return to_route('application.waiting');
        }
        if (in_array($user->status, ['incomplete', 'rejected'], true)
            && ! $request->routeIs('home', 'shop', 'platform-information', 'application.*', 'locations', 'dashboard', 'role.*')) {
            return to_route('application.edit');
        }

        return $next($request);
    }
}
