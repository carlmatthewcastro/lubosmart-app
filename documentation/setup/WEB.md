<div align="center">

# 🚀 Laravel and web setup

**Install and run the Laravel and React website locally.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Environment](ENVIRONMENT.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers a new local website installation and its prerequisites. It is for developers configuring Laravel, frontend assets and a dedicated development database.

<a id="how-it-works"></a>

## 🔄 How it works

Requires PHP 8.2+ with Laravel's required extensions, Composer 2, Node.js 22/npm and a local database. The Composer and npm manifests in `web/` belong to the Laravel application.

<a id="quick-start"></a>

## 🚀 Quick Start

1. Clone the [repository](https://github.com/carlmatthewcastro/lubosmart-app) for a new installation. From its root, enter the website folder first:

```powershell
cd web
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
```

> [!IMPORTANT]
> Copy the example and generate a key only for a new installation. Configure your development database and mail settings privately using the [environment reference](ENVIRONMENT.md). The example selects SQLite; create the local database file if needed. MySQL requires a separately created local database and its connection settings.

2. After checking that the selected database is disposable development data:

```powershell
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
composer run dev
```

3. Open `http://localhost:8000`. The category seeder avoids the default seeder's synthetic user. `composer run dev` starts Laravel, Vite, a queue listener and log monitoring. On Windows, use `PHP_CLI_SERVER_WORKERS=1` if PHP reports an unsupported-fork warning.

<a id="configuration"></a>

## ⚙️ Configuration

Security email requires a working mail provider; operational notifications require the queue. Google login requires OAuth credentials and an exact registered callback URL. See [mail and Google configuration](ENVIRONMENT.md#mail-and-google-login); connection checks alone do not prove inbox delivery.

The website uses session authentication through Inertia.js. The Flutter client uses a separate [Laravel Sanctum bearer-token boundary](../api/README.md). Do not use a live database or production accounts to try either client.

Sources: [Composer manifest](../../web/composer.json), [npm manifest](../../web/package.json), [example environment](../../web/.env.example), [category seeder](../../web/database/seeders/MarketplaceCategorySeeder.php).

<a id="related-documentation"></a>

## 📚 Related documentation

[Setup index](README.md)

---

<div align="center">

**LubosMart** · Laravel and web setup · [Back to Documentation](../README.md)

</div>
