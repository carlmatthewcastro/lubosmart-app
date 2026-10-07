# Local development setup

Use this guide to run LubosMart on your computer. For the live website, use the [deployment guide](../operations/deployment.md).

## Technical Requirements

- PHP **8.2 or later**, with extensions required by Laravel and the selected database driver; the production image uses PHP **8.3**.
- Composer **2.x**.
- Node.js **22** and npm to match the repository's frontend build image.
- MySQL with an existing local database and appropriate credentials; XAMPP may supply the local server.
- Git; Docker and Docker Compose when using the deployment environment.
- A Google OAuth web client for Google sign-in, and an email transport for verification and account notifications.

Use the committed dependency lockfiles. The frontend build and test environment should be validated before changing runtime versions.

## Installation & Environment Setup

### 1. Clone the repository

```powershell
git clone https://github.com/carlmatthewcastro/lubosmart-app.git
cd lubosmart-app
```

For an existing checkout, use its current project directory instead.

### 2. Install dependencies

```powershell
composer install
npm ci
```

### 3. Create the local environment file

For a **new installation only**:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Do not overwrite an existing `.env` or regenerate an established application key.

Edit `.env` using local values. The following is an example configuration with credential placeholders:

```dotenv
APP_NAME="LubosMart"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=Asia/Manila

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecommerce_db
DB_USERNAME=replace_with_local_database_user
DB_PASSWORD=replace_with_local_database_password

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
MAIL_MAILER=log

GOOGLE_CLIENT_ID=replace_with_google_client_id
GOOGLE_CLIENT_SECRET=replace_with_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

Create the MySQL database before migrating and ensure the local server is running. `.env.example` defaults to SQLite; the example above deliberately selects MySQL. Google credentials are optional until sign-in is configured. Register the exact callback URI with Google and follow the [OAuth guide](../accounts/google-oauth.md).

`MAIL_MAILER=log` supports local development; it does not send email to applicants. Configure a real transport before testing email delivery or approval notifications.

### 4. Apply migrations and import categories

```powershell
php artisan config:clear
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
```

The taxonomy seeder is repeatable and preserves existing category IDs and custom rows. Use additive migrations for existing databases. Historical orders retain null commission snapshots rather than receiving retroactive fees.

> **Database safety:** Never run `migrate:fresh` against data you need to keep. The generic `DatabaseSeeder` creates a demo user; use the explicit taxonomy seeder for production category imports. Review [schema and rollback limitations](../architecture/core-schema-erd.md) before upgrading.

## Local Development

Start the integrated development processes:

```powershell
composer run dev
```

This runs Laravel, the queue listener, log monitoring and Vite through the configured Composer script. Open **http://localhost:8000**.

Alternatively, run these in separate terminals:

```powershell
php artisan serve
```

```powershell
npm run dev
```

```powershell
php artisan queue:listen --tries=1
```

Build production frontend assets with:

```powershell
npm run build
```

## Quality Assurance

Run checks appropriate to the changed code:

```powershell
php artisan test
php vendor/bin/pint --test
npx tsc --noEmit
npx eslint resources/js
npm run format:check
npm run build
```

Automated tests cover application behavior; real Google callbacks, email delivery, accessibility and role journeys also require environment-specific acceptance checks. A local passing test suite is not a live CI badge. See [coding guidelines](coding-guidelines.md) and [release readiness](../operations/release-readiness.md).
