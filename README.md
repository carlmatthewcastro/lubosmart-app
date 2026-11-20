# LubosMart

**An e-commerce and delivery platform for Filipino communities.**

LubosMart brings shopping, store management, parcel delivery and cash reconciliation into one website. Buyers discover products from local sellers, while sellers, riders, logistics teams and administrators manage the order journey through dedicated workspaces.

[Visit LubosMart](https://lubosmart.app) · [Features and workflows](documentation/workflows/README.md) · [Documentation](documentation/README.md)

## Website features

| Workspace | What you can do                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Buyer     | Browse the marketplace, manage your cart and addresses, apply shop vouchers, place orders, track deliveries and request returns |
| Seller    | Manage products and stock, prepare orders and waybills, create shop vouchers, and review sales and settlements                  |
| Rider     | Handle assigned pickups and deliveries, scan parcel checkpoints, submit delivery proof and record COD handovers                 |
| Logistics | Manage riders, coverage and shipping rates; receive, sort and dispatch parcels; confirm cash handovers                          |
| Admin     | Review applications, manage accounts and compliance, handle support and refund decisions, and reconcile platform funds          |

Shared features include account verification, Google sign-in, notifications, messaging, private document access and role-based permissions.

## From checkout to delivery

1. A buyer checks out with an address and available shipping option.
2. Each seller prepares their parcel and waybill.
3. Logistics teams and assigned riders record custody through parcel checkpoints.
4. The rider submits delivery proof and collected COD.
5. Logistics and Admin confirm cash receipt and reconciliation before seller settlement.

Returns and refunds follow a separate review workflow. Approved refunds credit Lubos Coins. Payment records and settlement confirmations record financial activity; bank transfers require separate handling.

## Technology

| Layer                 | Stack                                         |
| --------------------- | --------------------------------------------- |
| Website               | React 19, TypeScript, Inertia.js 2            |
| Interface             | Tailwind CSS 4, Radix UI, Lucide              |
| Backend               | Laravel 12, PHP 8.2+, Eloquent                |
| API                   | Versioned JSON endpoints, Laravel Sanctum     |
| Assets                | Vite 6, Node.js 22, npm                       |
| Database              | MySQL; SQLite supported for local development |
| Hosting configuration | Docker Compose, Apache, Caddy                 |

Laravel serves the website and owns authentication, authorization, business rules and data. Queue workers process background notifications. Explore the [architecture](documentation/architecture/README.md), [technology guide](documentation/tech-stack/README.md) and [API documentation](documentation/api/README.md).

## Run the website locally

Open the `web/` folder in your editor. Install PHP 8.2+, Composer 2 and Node.js 22, then follow the [web setup guide](documentation/setup/WEB.md) to install dependencies and configure a local database.

With setup complete, run these commands in separate terminals inside `web/`:

```powershell
php artisan serve
```

```powershell
npm run dev
```

Open **http://localhost:8000**. Run `php artisan queue:work --tries=1` when using queued notifications. Build website assets with `npm run build`.

## Explore the project

- [Role features and business workflows](documentation/workflows/README.md)
- [Architecture and source layout](documentation/architecture/README.md)
- [Database structure](documentation/database/README.md)
- [API endpoints and authentication](documentation/api/README.md)
- [Environment configuration](documentation/setup/ENVIRONMENT.md)
- [Deployment and backups](documentation/deployment/README.md)

Repository changes follow the [Git workflow rules](documentation/standards/GIT_WORKFLOW_RULES.md) and [UI/UX standards](documentation/standards/UI_UX_RULES.md).
