# Tech Stack

LubosMart is a Laravel modular monolith: one backend handles commerce, accounts, logistics and administration.

| Layer | Technology | Purpose |
| --- | --- | --- |
| Front End | React 19, TypeScript, Inertia.js 2, Blade | Pages, forms, navigation and server-provided data |
| UI | Tailwind CSS 4, Radix UI, Headless UI, Lucide | Styling, accessible components and icons |
| Build | Vite 6, Node.js 22, npm | Development assets and production bundles |
| Backend | Laravel 12, PHP, Apache, Socialite, Ziggy | Business logic, authentication, Google sign-in and named routes |
| Database | MySQL 8.4 in Docker Compose, Eloquent | Relational storage and queries |
| Background work | Laravel queue worker; database-driver defaults | Notifications, cache and sessions |
| Deployment | Docker Compose, Caddy | Containers, reverse proxy and HTTPS |
| Testing | Pest, Pint, ESLint, Prettier, GitHub Actions | Tests, formatting and builds |

Composer requires PHP 8.2+. Docker uses PHP 8.3; CI uses PHP 8.4. The reviewed Composer lock resolves Laravel 12.69.3. `.env.example` defaults to SQLite; tests use in-memory SQLite.

Azure Ubuntu VM hosting and Cloudflare DNS are described in the repository runbook. Their live settings are unverified. No Redis service or external database pool is configured.

**Planned:** Laravel REST API under `/api/v1` with Sanctum. See [API](../api/README.md).

Sources: `composer.json`, `composer.lock`, `package.json`, `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/`.

[Documentation](../README.md)
