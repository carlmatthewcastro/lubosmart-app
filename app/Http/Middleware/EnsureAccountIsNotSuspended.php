<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsNotSuspended
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($request->routeIs('logout')) {
            return $next($request);
        }
        $message = match (true) {
            in_array($user?->status, ['suspended', 'deactivated'], true) => 'Your account is '.$user->status.'. Contact LubosMart support.',
            $user?->role === 'courier' && $user->status === 'approved' && ! $user->sorting_center_id => 'Your courier account needs an approved sorting center. Contact LubosMart support.',
            $user?->role === 'courier' && $user->sorting_center_id && ! $user->logisticsCenter()->operational()->exists() => 'Your sorting center is unavailable. Courier access is blocked until the center is approved and active.',
            default => null,
        };
        if ($message) {
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return response()->json(['message' => $message], 403);
            }

            return Inertia::render('auth/account-blocked', ['message' => $message])->toResponse($request)->setStatusCode(403);
        }

        return $next($request);
    }
}
