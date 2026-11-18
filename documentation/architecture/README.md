# System architecture and repository map

LubosMart is a Laravel modular monolith: one backend owns account, commerce, logistics and administration rules and database data. React/Inertia provides the integrated web client. Flutter is a separate native client calling the implemented versioned API.

```mermaid
flowchart LR
    Web[React and Inertia browser] --> Laravel[Laravel backend]
    Mobile[Flutter client] --> API[API v1 with Sanctum bearer tokens]
    API --> Laravel
    Laravel --> DB[(Shared database)]
    Laravel --> Private[(Private documents and proof)]
    Worker[Queue worker] --> DB
```

The API is implemented in [routes/api.php](../../routes/api.php) and [routes/mobile.php](../../routes/mobile.php), with controllers under `app/Http/Controllers/Api/V1`. This replaces the root README's older diagram that labelled the API planned. The [original PNG](../assets/system-architecture.png) remains a historical asset; neither this diagram nor route presence establishes deployed acceptance. Web sessions and mobile bearer tokens have separate access boundaries.

## Repository map

| Location | Purpose |
| --- | --- |
| `app/` | Controllers, models, policies, requests, services and shared actions |
| `routes/` | Web/auth/settings routes and versioned API routes |
| `resources/js/` | React entry points, hooks, types and utilities |
| `resources/views/` | Inertia React pages, components and layouts, plus Blade/mail templates; frontend aliases intentionally resolve here |
| `resources/css/`, `resources/data/` | Styles and reference data |
| `database/`, `config/`, `bootstrap/` | Schema/factories/seeders, configuration and bootstrapping |
| `public/`, `storage/` | Web document root, runtime files and private uploads |
| `apps/mobile/` | Flutter source, assets, Android/iOS projects and tests |
| `tests/` | Laravel tests, fixtures and Node browser/API harnesses |
| `scripts/`, `.github/workflows/` | Development utilities and automation |
| `documentation/` | Current guides, standards, contracts and historical evidence |

Dependencies, SDKs, build outputs and caches are local artifacts. Databases and uploads need separate backups; they are not disposable source build output.

## Detailed references

- [Technology stack](../tech-stack/README.md)
- [Frontend architecture](../front-end/README.md) and [source map](../front-end/code-map.md)
- [Backend and account boundaries](../backend/README.md)
- [Database guide](../database/README.md)
- [API coverage and contract links](../api/README.md)
- [Deployment topology and backups](../deployment/README.md)

The OpenAPI and Postman files are older snapshots. Later finance/return additions are described alongside them in the API guide; this cleanup does not regenerate contracts.

[Documentation index](../README.md)
