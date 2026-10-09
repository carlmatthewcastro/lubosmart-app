<?php

namespace App\Providers;

use Illuminate\Mail\Markdown;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Use the configured public origin for links, including mail sent during HTTP requests.
        URL::forceRootUrl(config('app.url'));
        URL::forceScheme(parse_url(config('app.url'), PHP_URL_SCHEME));

        // Treat names and review reasons as text, not embedded Markdown links or HTML.
        Markdown::withSecuredEncoding();
    }
}
