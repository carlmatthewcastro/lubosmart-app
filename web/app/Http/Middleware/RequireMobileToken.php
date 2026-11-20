<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RequireMobileToken
{
    public function handle(Request $request, Closure $next, ?string $role = null): Response
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();
        abort_unless($request->bearerToken() && $token instanceof PersonalAccessToken, 401);
        abort_unless($token->can('api:v1') && $token->can('role:'.$user->role), 403);
        if ($role !== 'logout') {
            abort_unless($user->canOperate() && in_array($user->role, ['buyer', 'seller', 'rider', 'logistics', 'admin'], true), 403);
        }
        if ($role && $role !== 'logout') {
            abort_unless($user->role === $role, 403);
        }

        return $next($request);
    }
}
