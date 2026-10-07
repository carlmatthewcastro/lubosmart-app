<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()->status !== 'active') {
            return to_route('application.edit');
        }

        return $next($request);
    }
}
