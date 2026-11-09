<?php

use App\Http\Middleware\ApiResponseHeaders;
use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureAccountIsNotSuspended;
use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureOnboardingAccess;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureRoleIsChosen;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireMobileToken;
use App\Http\Middleware\RequireOnboardingToken;
use App\Support\ApiErrors;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Session\Middleware\AuthenticateSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
        $middleware->alias(['active' => EnsureAccountIsActive::class, 'role' => EnsureRole::class, 'admin.permission' => EnsureAdminPermission::class, 'mobile.token' => RequireMobileToken::class, 'onboarding.token' => RequireOnboardingToken::class]);
        $middleware->api(append: [ApiResponseHeaders::class]);
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
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/v1', 'api/v1/*') || $request->expectsJson());
        $exceptions->render([ApiErrors::class, 'render']);
    })->create();
