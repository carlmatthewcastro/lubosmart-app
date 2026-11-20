<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RequireOnboardingToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();
        abort_unless($request->bearerToken() && $token instanceof PersonalAccessToken && $token->can('onboarding'), 401);
        abort_unless(in_array($request->user()->role, ['buyer', 'seller', 'rider'], true)
            && ! in_array($request->user()->status, ['suspended', 'deactivated'], true), 403);

        return $next($request);
    }
}
