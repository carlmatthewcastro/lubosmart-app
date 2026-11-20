<?php

namespace App\Services\Demo;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Auth;

class DemoActions
{
    /** Invoke existing validated actions; no alternate fulfillment rules. */
    public function call(User $actor, string $controller, string $method, array $data = [], array $parameters = [], array $files = []): mixed
    {
        $request = Request::create('/demo-fixture', 'POST', $data, files: $files);
        $request->setUserResolver(fn () => $actor);
        $request->setRouteResolver(fn () => new Route('POST', '/demo-fixture', []));
        $session = new Store('demo-fixture', new ArraySessionHandler(120));
        $session->start();
        $request->setLaravelSession($session);
        $previous = app('request');
        $guard = Auth::guard();
        $previousUser = $guard->user();
        try {
            app()->instance('request', $request);
            $guard->setUser($actor);

            // The normal controller still performs role/state authorization and validation.
            return app()->call([app($controller), $method], ['request' => $request, ...$parameters]);
        } finally {
            app()->instance('request', $previous);
            $previousUser ? $guard->setUser($previousUser) : $guard->forgetUser();
        }
    }
}
