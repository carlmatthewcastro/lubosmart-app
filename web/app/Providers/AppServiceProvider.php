<?php

namespace App\Providers;

use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\SupportCase;
use App\Models\User;
use App\Observers\WorkflowNotificationObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\Markdown;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

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
        foreach ([SellerOrder::class, ParcelReturn::class, RegistrationApplication::class,
            User::class, SellerPayout::class, Product::class, SupportCase::class] as $model) {
            $model::observe(WorkflowNotificationObserver::class);
        }

        // Use the configured public origin for links, including mail sent during HTTP requests.
        URL::forceRootUrl(config('app.url'));
        URL::forceScheme(parse_url(config('app.url'), PHP_URL_SCHEME));

        // Treat names and review reasons as text, not embedded Markdown links or HTML.
        Markdown::withSecuredEncoding();

        RateLimiter::for('mobile-api', fn (Request $request) => Limit::perMinute(120)->by('mobile:'.($request->user()?->id ?? $request->ip())));
        RateLimiter::for('mobile-login', function (Request $request) {
            $email = is_string($request->input('email')) ? Str::lower(trim($request->input('email'))) : '';

            return [
                Limit::perMinute(20)->by('mobile-login-ip:'.$request->ip()),
                Limit::perMinute(5)->by('mobile-login:'.$email.'|'.$request->ip()),
            ];
        });
    }
}
