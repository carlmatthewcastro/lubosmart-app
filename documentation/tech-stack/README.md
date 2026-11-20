<div align="center">

# 🧰 Technology stack

**The website, API, native client and infrastructure technologies.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Architecture](../architecture/README.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the technologies declared for LubosMart and their responsibilities. It is for developers reviewing the implemented stack and the recorded limits of infrastructure and native-client acceptance.

<a id="how-it-works"></a>

## 🔄 How it works

LubosMart is a Laravel modular monolith: one backend handles commerce, accounts, Logistics and administration.

<a id="technology"></a>

## 🧰 Technology

| Layer           | Technology                                     | Purpose                                                                            |
| --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| Front End       | React 19, TypeScript, Inertia.js 2, Blade      | Pages, forms, navigation and server-provided data                                  |
| Mobile          | Flutter / Dart, Material 3                     | Separate Buyer, Seller and Rider client in mobile; native build acceptance pending |
| UI              | Tailwind CSS 4, Radix UI, Headless UI, Lucide  | Styling, accessible components and icons                                           |
| Build           | Vite 6, Node.js 22, npm                        | Development assets and production bundles                                          |
| Backend         | Laravel 12, PHP, Apache, Socialite, Ziggy      | Business logic, authentication, Google sign-in and named routes                    |
| Database        | MySQL 8.4 in Docker Compose, Eloquent          | Relational storage and queries                                                     |
| Background work | Laravel queue worker; database-driver defaults | Notifications, cache and sessions                                                  |
| Deployment      | Docker Compose, Caddy                          | Containers, reverse proxy and HTTPS                                                |
| Testing         | Pest, Pint, ESLint, Prettier, GitHub Actions   | Tests, formatting and builds                                                       |

Composer requires PHP 8.2+. Docker uses PHP 8.3; CI uses PHP 8.4. The reviewed Composer lock resolves Laravel 12.69.3. `.env.example` defaults to SQLite; tests use in-memory SQLite.

Azure Ubuntu VM hosting and Cloudflare DNS are described in the repository runbook. Their live settings are unverified. No Redis service or external database pool is configured.

**Implemented locally, November 5, 2026:** core Laravel JSON API under `/api/v1`, with Laravel Sanctum device tokens and API Resources, alongside the existing website. See [API coverage, OpenAPI and mobile setup](../api/README.md) for implemented endpoints and remaining parity.

Sources: `composer.json`, `composer.lock`, `package.json`, `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/`.

<a id="related-documentation"></a>

## 📚 Related documentation

[Documentation](../README.md)

---

<div align="center">

**LubosMart** · Technology stack · [Back to Documentation](../README.md)

</div>
