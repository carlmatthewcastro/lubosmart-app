# Laravel and web setup

Requires PHP 8.2+ with Laravel's required extensions, Composer 2, Node.js 22/npm and a local database. The Composer and npm manifests at the repository root belong to the Laravel application.

Clone the [repository](https://github.com/carlmatthewcastro/lubosmart-app) for a new installation. From its root:

```powershell
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
```

Copy the example and generate a key only for a new installation. Configure your development database and mail settings privately using the [environment reference](ENVIRONMENT.md). The example selects SQLite; create the local database file if needed. MySQL requires a separately created local database and its connection settings.

After checking that the selected database is disposable development data:

```powershell
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
composer run dev
```

Open `http://localhost:8000`. The category seeder avoids the default seeder's synthetic user. `composer run dev` starts Laravel, Vite, a queue listener and log monitoring. On Windows, use `PHP_CLI_SERVER_WORKERS=1` if PHP reports an unsupported-fork warning.

Security email requires a working mail provider; operational notifications require the queue. Google login requires OAuth credentials and an exact registered callback URL. See [mail and Google configuration](ENVIRONMENT.md#mail-and-google-login); connection checks alone do not prove inbox delivery.

The website uses session authentication through Inertia. The Flutter client uses a separate [Sanctum bearer-token boundary](../api/README.md). Do not use a live database or production accounts to try either client.

Sources: [Composer manifest](../../composer.json), [npm manifest](../../package.json), [example environment](../../.env.example), [category seeder](../../database/seeders/MarketplaceCategorySeeder.php).

[Setup index](README.md)
