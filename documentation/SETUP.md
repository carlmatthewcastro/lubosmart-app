<div align="center">

# Setup and development

**Install, configure and run the website and shared API.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

<a id="guide"></a>

## Before you start

Use a dedicated development database, synthetic accounts and local uploads. Preserve existing environment files, application keys, data and private documents when updating an installation. Production procedures belong in [Deployment](DEPLOYMENT.md#deployment).

[Web installation](#web) · [Local development](#development) · [Flutter connection](#flutter) · [Environment](#environment)

<a id="web"></a>

## Web installation

Requires PHP 8.2+ with Laravel's required extensions, Composer 2, Node.js 22/npm and a dedicated local database. Dependencies and application commands belong in `web/`.

1. Clone the [repository](https://github.com/carlmatthewcastro/lubosmart-app). For a new installation, run from its root:

    ```powershell
    cd web
    composer install
    npm ci
    Copy-Item .env.example .env
    php artisan key:generate
    ```

    Copy the environment example and generate a key only for a new installation. The example selects SQLite; create `web/database/database.sqlite` if absent. MySQL requires a separately created local database and its connection settings. Configure mail privately using the [environment reference](#environment).

2. Verify that the selected database contains only disposable development data, then prepare the schema and category taxonomy:

    ```powershell
    php artisan migrate
    php artisan db:seed --class=MarketplaceCategorySeeder
    ```

    The category seeder avoids the default seeder's synthetic user. Installation, migrations and seeding are separate from ordinary startup.

3. Start the application using the [Windows launcher or manual commands](#development-website-and-shared-api).

Sources: [Composer](../web/composer.json), [npm](../web/package.json), [example environment](../web/.env.example), [category seeder](../web/database/seeders/MarketplaceCategorySeeder.php).

<a id="development"></a>

## Local development

Open `web/` and optionally `mobile/` directly in your editor; no workspace file is required. Both folders share one repository and backend rules. From the repository root:

```powershell
code --new-window web
code --new-window mobile
```

<a id="development-website-and-shared-api"></a>

### Website and shared API

On Windows, double-click **[Start LubosMart.cmd](../Start%20LubosMart.cmd)** in the repository root. It starts Laravel, Vite and the notification queue, then opens the browser. Keep its terminal open; **Ctrl+C** stops the development servers.

The launcher uses PHP/Node.js from `PATH` and reads `web/.env`. It expects a local HTTP `APP_URL` on port 8000, with ports 8000 and 5173 available. It does not install dependencies, generate keys, migrate or seed.

If local MySQL is stopped, the launcher attempts to start its Windows service when exactly one MySQL/MariaDB service is found. Accept the administrator prompt if Windows requests it; only service startup runs elevated. The database service stays running after the app stops. If startup fails, check the reported dependency, port conflict or Windows Services error. Restart the launcher after cancelling the permission prompt.

<a id="development-manual-startup"></a>

#### Manual startup

For other operating systems or separate processes, run each command in its own terminal inside `web/`:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
npm run dev
```

```powershell
php artisan queue:work --tries=1
```

Open http://127.0.0.1:8000. Use one hostname consistently for session authentication and Google callbacks. The launcher/separate terminals avoid the Unix-only Pail dependency in Composer's combined dev command. Use `npm run build` for production assets.

### Verification and artifacts

Run relevant backend tests with `php artisan test` and formatting checks with `php vendor/bin/pint --test` from `web/`. The [frontend guide](FRONTEND.md#interface-commands) lists TypeScript, lint and build checks. These commands are procedures, not results from this documentation cleanup.

Laravel `web/storage/` is reserved for uploads, private files and runtime data. Browser evidence, snapshots and completed build logs belong in the ignored root `.tools/development-artifacts/` directory. Historical reports retain their original paths. Test failures involving shared storage may need an isolated rerun; do not overlap harnesses that share output or fixtures.

Docker files and Compose commands belong in `web/`. Existing deployments must preserve their Compose project name and named volumes; see [Deployment](DEPLOYMENT.md#deployment).

<a id="development-mobile"></a>
<a id="flutter"></a>

## Flutter setup and API connection

Mobile UI work is paused pending a new Figma design. The existing Buyer, Seller and Rider client remains an integration reference. Install Flutter compatible with [pubspec.yaml](../mobile/pubspec.yaml), which requires Dart `^3.13.7`. Android development also needs the Android SDK/platform tools; iOS builds require macOS/Xcode. Local SDKs under the ignored root `.tools/` are machine-specific.

Start Laravel against a test database using the [web setup](#web). Vite is needed for the website, not the native API client. For a phone using a test LAN connection, run from `web/` instead of the loopback-only server:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

From `mobile/`, run the multi-role entry point:

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --target lib/main.dart --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

| Connection                 | API address                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Android emulator           | `http://10.0.2.2:8000/api/v1`; `10.0.2.2` reaches the host PC                                        |
| Physical phone on test LAN | A reachable PC/test-server address; the phone's localhost is not the PC                              |
| USB-connected test phone   | Configure port forwarding before using a localhost API; USB connection alone does not provide access |
| Release operation          | Reachable HTTPS API; debug HTTP settings do not authorize insecure release traffic                   |

Laravel `APP_URL` must also make generated image/pagination URLs reachable from the client. Configure the local test network as needed; these instructions do not establish deployed networking or device acceptance.

The dedicated Rider target is `lib/rider_main.dart`. Its Windows helper defaults to the live API, so supply an authorized test URL explicitly. For example, from `mobile/`:

```powershell
.\scripts\rider-android.cmd analyze
.\scripts\rider-android.cmd test
.\scripts\android-mobile.cmd run http://10.0.2.2:8000/api/v1
```

Use the [mobile README](../mobile/README.md) for source structure and Google OAuth configuration, [Rider Android](../mobile/RIDER_ANDROID.md) for build/install/USB commands and [baseline report](../mobile/REFERENCE_UI_1_0_1.md) for retained APK metadata. Release signing and physical-device acceptance require separate verification.

The [API guide](api/GUIDE.md) owns token lifecycle, onboarding, response formats, uploads and retries. See [role coverage](api/ROLE_COVERAGE.md) for provisional screens and remaining native parity, including wallet interfaces.

<a id="environment"></a>

## Environment configuration

Set values privately for the intended installation. Preserve `APP_KEY`, databases and private uploads. Flutter compile-time definitions are separate from Laravel environment settings.

| Area             | Variables                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application      | `APP_ENV`, `APP_DEBUG`, `APP_URL`, `APP_KEY`                                                                                                            |
| Session          | `SESSION_DRIVER`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`                                                                                             |
| Database         | `DB_CONNECTION`; MySQL also uses `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`; Compose needs `DB_ROOT_PASSWORD`                    |
| Queue            | `QUEUE_CONNECTION`; the example uses database jobs and requires a worker                                                                                |
| Mail             | `MAIL_MAILER`, `MAIL_SECURITY_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` |
| Google web login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`                                                                                       |
| Flutter          | `API_BASE_URL` ending in `/api/v1`; optional `GOOGLE_SERVER_CLIENT_ID`                                                                                  |

The example defaults to SQLite and database sessions/queues. Laravel defaults can differ when an environment variable is absent. Do not expose real credentials in reports or screenshots.

<a id="environment-mail-and-google-login"></a>
<a id="environment-configuration"></a>

### Mail and Google login

Configure `MAIL_MAILER=smtp` and `MAIL_SECURITY_MAILER=smtp` with an authorized sender and provider settings. Security mail sends synchronously; operational approval/status mail needs the queue. A successful connection check does not prove inbox delivery; follow the [email verification runbook](DEPLOYMENT.md#mail).

Google's registered redirect must exactly match `GOOGLE_REDIRECT_URI`. The local example is `http://localhost:8000/auth/google/callback`; use the same hostname throughout login. Mobile sign-in also requires matching platform OAuth settings and the Web OAuth client ID as `GOOGLE_SERVER_CLIENT_ID`; see the [mobile configuration](../mobile/README.md#authentication-and-configuration).

Provider availability, OAuth console settings and live environment values are installation-specific and were not verified during this cleanup.

Sources: [example environment](../web/.env.example), [database](../web/config/database.php), [mail](../web/config/mail.php), [providers](../web/config/services.php), [Compose](../web/docker-compose.yml).

[Documentation](README.md)
