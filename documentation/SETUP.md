<div align="center">

# Setup and development

**Install, configure and run Web and Mobile from one guide.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This guide covers local installation, day-to-day development and environment configuration. It brings the Web, Flutter and shared API setup instructions together while keeping each application’s working directory explicit.

**In this guide:** [Setup boundaries](#guide) · [Laravel and website setup](#web) · [Web and Mobile development](#development) · [Flutter and API connection](#flutter) · [Environment configuration](#environment)

<a id="guide"></a>

## Setup boundaries

<a id="guide-how-it-works"></a>

### How it works

Use a dedicated development database, synthetic accounts and local uploads. Preserve an existing `.env`, application key and data when updating.

<a id="guide-setup-guides"></a>

### Setup guides

- [Laravel and web setup](SETUP.md#web)
- [Open the Web and Mobile folders](SETUP.md#development)
- [Flutter setup and API connection](SETUP.md#flutter)
- [Environment-variable reference](SETUP.md#environment)

Production procedures and backups belong in the [deployment runbook](DEPLOYMENT.md#deployment).

---

<a id="web"></a>

## Laravel and website setup

<a id="web-how-it-works"></a>

### How it works

Requires PHP 8.2+ with Laravel's required extensions, Composer 2, Node.js 22/npm and a local database. The Composer and npm manifests in `web/` belong to the Laravel application.

<a id="web-quick-start"></a>

### Quick Start

1. Clone the [repository](https://github.com/carlmatthewcastro/lubosmart-app) for a new installation. From its root, enter the website folder first:

```powershell
cd web
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
```

> [!IMPORTANT]
> Copy the example and generate a key only for a new installation. Configure your development database and mail settings privately using the [environment reference](SETUP.md#environment). The example selects SQLite; create the local database file if needed. MySQL requires a separately created local database and its connection settings.

2. After checking that the selected database is disposable development data:

```powershell
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
```

3. On Windows, return to the repository root and double-click **[Start LubosMart.cmd](../Start%20LubosMart.cmd)**. It starts Laravel, Vite and the notification queue, then opens the local website automatically. Keep its terminal open while working; press **Ctrl+C** to stop the app. For other operating systems, follow [manual startup](#development-manual-startup).

The category seeder avoids the default seeder's synthetic user. For subsequent local runs, use the launcher after starting your configured database; installation, migrations and seeding are separate setup steps.

<a id="web-configuration"></a>

### Configuration

Security email requires a working mail provider; operational notifications require the queue. Google login requires OAuth credentials and an exact registered callback URL. See [mail and Google configuration](SETUP.md#environment-mail-and-google-login); connection checks alone do not prove inbox delivery.

The website uses session authentication through Inertia.js. The Flutter client uses a separate [Laravel Sanctum bearer-token boundary](api/GUIDE.md). Do not use a live database or production accounts to try either client.

Sources: [Composer manifest](../web/composer.json), [npm manifest](../web/package.json), [example environment](../web/.env.example), [category seeder](../web/database/seeders/MarketplaceCategorySeeder.php).

---

<a id="development"></a>

## Web and Mobile development

<a id="development-how-it-works"></a>

### How it works

Open actual folders directly. Workspace shortcut files have been removed.

1. From the repository root:

```powershell
code --new-window web
code --new-window mobile
```

<a id="development-website-and-shared-api"></a>

### Website and shared API

On Windows, double-click **[Start LubosMart.cmd](../Start%20LubosMart.cmd)** in the repository root after
completing installation. It starts Laravel, Vite and the notification queue in
one terminal, then opens the browser. It uses PHP and Node.js from `PATH` and
the database configured in `web/.env`. If local MySQL is unavailable, it attempts
to start the installed MySQL/MariaDB Windows service when exactly one is found.
If Windows requires administrator access, the launcher opens a Windows permission
prompt. Accept it to start the database and continue automatically. Only service
startup runs with administrator access; Laravel, Vite and the queue run normally.
If the prompt is cancelled, launch again and accept it. If the service still fails
to start, inspect its error in Windows Services. Keep the terminal open; press **Ctrl+C** to stop the development
servers. The database service stays running. The launcher expects a local HTTP
`APP_URL` on port 8000 and requires ports 8000 and 5173 to be available.

If the launcher reports a missing dependency, complete the [web installation](#web)
first. If port 8000 or 5173 is in use, close the previous development server before
launching again. The launcher reads the existing `web/.env`; it does not install
dependencies, generate application keys, migrate or seed the database.

<a id="development-manual-startup"></a>

#### Manual startup

For other operating systems or when you need separate terminals:

1. In a terminal inside `web/`, run these in separate terminals:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
npm run dev
```

```powershell
php artisan queue:work --tries=1
```

2. Open http://127.0.0.1:8000. Keep these terminals open while working. Use `npm run build` for production assets. On Windows, the launcher or separate terminals avoid the Unix-only Pail dependency in Composer's combined dev command.

For a new installation, follow [web setup](SETUP.md#web); preserve existing environment files, keys, databases and uploads.

<a id="development-mobile"></a>

### Mobile

1. Open `mobile/`. Flutter source, assets, Android/iOS projects and tests are all here. VS Code tasks and debug settings are stored inside this folder. The local SDK remains in the shared ignored `.tools/` folder; use your own installed Flutter SDK on another machine.

2. From a terminal inside `mobile/`:

```powershell
.\scripts\rider-android.cmd analyze
.\scripts\rider-android.cmd test
.\scripts\android-mobile.cmd run http://10.0.2.2:8000/api/v1
```

The URL above is for an Android emulator. Physical devices require USB forwarding or a reachable test API. Mobile needs the Laravel API running; Vite is only needed for the website. The Rider build helper retains its existing live API default; pass an explicit test URL for testing.

<a id="development-repository-and-deployment"></a>

### Repository and deployment

Laravel `web/storage/` holds application uploads, private files and runtime data.
Development snapshots and browser-check output belong in the ignored root
`.tools/development-artifacts/` directory. Browser harnesses default to that
directory so their output does not accumulate beside application uploads.

Both folders share one Git repository and branch. Changes to shared backend rules or the database can affect both clients.

Docker files live in `web/`; build with `web/` as the context. Compose commands also run inside `web/`, preserving the deployment's existing Compose project name and storage volume names when migrating an existing installation. Deployment requires separate authorization.

> [!NOTE]
> Historical reports retain their original commands. For current work, run Laravel/npm commands inside `web/`, Flutter commands inside `mobile/`, backend utility scripts from `web/scripts/`, and Android helpers from `mobile/scripts/`.

---

<a id="flutter"></a>

## Flutter and API connection

<a id="flutter-how-it-works"></a>

### How it works

Flutter lives in `mobile` and shares the Laravel backend with the website. Start with the [web setup](SETUP.md#web) on a dedicated test installation. Use a Flutter SDK compatible with [pubspec.yaml](../mobile/pubspec.yaml), which declares Dart `^3.13.7`..

<a id="flutter-commands"></a>

### Commands

From `mobile`, for the multi-role client:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

<a id="flutter-configuration"></a>

### Configuration

`10.0.2.2` reaches the host PC from an Android emulator. A physical phone needs a reachable test LAN/HTTPS address or USB forwarding; its own localhost is not the PC. Laravel `APP_URL` must also make image and pagination URLs reachable. Release requests require HTTPS.

The multi-role entry point is `lib/main.dart`. The dedicated Rider entry point is `lib/rider_main.dart`; its helper defaults to the live API, so supply an authorized test API URL for testing. Follow the existing [Rider Android guide](../mobile/RIDER_ANDROID.md) for explicit target, build arguments, installation and USB setup. Retain the [mobile README](../mobile/README.md) for workspace details and optional Google client configuration.

<a id="flutter-testing"></a>

### Testing

Install the Android SDK and platform tools for Android development. Release signing and physical-device acceptance require separate verification; iOS builds require macOS/Xcode.

Use the [API connection guide](api/MOBILE_CONNECTION_GUIDE.md) for onboarding tokens, retries and uploads, and the [API guide](api/GUIDE.md) for coverage and contract limitations. Native wallet screens and full physical-device journeys remain pending according to the existing records.

---

<a id="environment"></a>

## Environment configuration

<a id="environment-how-it-works"></a>

### How it works

Set values privately in the intended installation. This reference lists names, not credentials. Preserve existing `APP_KEY`, database contents and private uploads. Flutter compile-time definitions are separate from Laravel `.env` settings.

<a id="environment-environment-variables"></a>

### Environment variables

| Area             | Names and purpose                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application      | `APP_ENV`, `APP_DEBUG`, `APP_URL`, `APP_KEY`: environment, diagnostics, generated URLs and encryption key                                               |
| Session          | `SESSION_DRIVER`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`: storage and browser cookie scope; the example uses database sessions                       |
| Database         | `DB_CONNECTION`; MySQL also uses `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`; Compose requires `DB_ROOT_PASSWORD`                 |
| Queue            | `QUEUE_CONNECTION`: the example uses database jobs; a worker processes operational notifications                                                        |
| Mail             | `MAIL_MAILER`, `MAIL_SECURITY_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` |
| Google web login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`                                                                                       |
| Flutter          | `API_BASE_URL`, ending in `/api/v1`; optional `GOOGLE_SERVER_CLIENT_ID` for mobile Google login                                                         |

<a id="environment-mail-and-google-login"></a>

<a id="environment-configuration"></a>

### Configuration

Configure `MAIL_MAILER=smtp` and `MAIL_SECURITY_MAILER=smtp` with the provider's authorized sender, host, port and scheme. Security mail is synchronous; approval/status mail uses the queue. The [mail verification runbook](DEPLOYMENT.md#mail) distinguishes provider connection from actual inbox acceptance. Do not paste real credentials into reports.

Google's registered redirect must exactly match `GOOGLE_REDIRECT_URI`. The existing local example is `http://localhost:8000/auth/google/callback`; use the same hostname throughout login. Mobile Google sign-in additionally needs platform OAuth configuration, described in the [mobile README](../mobile/README.md#authentication-and-configuration).

The example environment defaults to SQLite, database sessions and database queues. Defaults in Laravel configuration can differ when an environment variable is absent. Provider availability, OAuth console settings and live environment values were not verified in this cleanup.

Sources: [example environment](../web/.env.example), [database configuration](../web/config/database.php), [mail configuration](../web/config/mail.php), [provider configuration](../web/config/services.php), [Compose definition](../web/docker-compose.yml).

---

<div align="center">

**LubosMart** · Setup and development · [Documentation](README.md)

</div>
