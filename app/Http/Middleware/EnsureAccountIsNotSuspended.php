<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsNotSuspended
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(in_array($request->user()?->status, ['suspended', 'deactivated'], true) && ! $request->routeIs('logout'), 403, 'Your account is '.$request->user()?->status.'. Contact LubosMart support.');

        return $next($request);
    }
}
