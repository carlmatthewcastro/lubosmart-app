<?php

use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureAccountIsNotSuspended;
use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureOnboardingAccess;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureRoleIsChosen;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Session\Middleware\AuthenticateSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
        $middleware->alias(['active' => EnsureAccountIsActive::class, 'role' => EnsureRole::class, 'admin.permission' => EnsureAdminPermission::class]);
        $middleware->web(append: [
            AuthenticateSession::class,
            HandleInertiaRequests::class,
            EnsureAccountIsNotSuspended::class,
            EnsureRoleIsChosen::class,
            EnsureOnboardingAccess::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
