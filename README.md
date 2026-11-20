<div align="center">

<img src="web/public/images/brand/logo.svg" width="80" height="76" alt="LubosMart logo" />

# LubosMart

**E-commerce and delivery for Filipino communities.**

Local shopping, store management, parcel delivery and cash reconciliation in one website.

[Visit LubosMart](https://lubosmart.app) · [Documentation](documentation/README.md) · [Run locally](#run-locally) · [Workspaces](documentation/WORKSPACES.md)

</div>

---

## Overview

LubosMart connects Buyers with local Sellers and carries each order through preparation, parcel custody, delivery and financial reconciliation. Buyer, Seller, Rider, Logistics and Admin have dedicated workspaces with server-enforced permissions.

The Web platform is implemented with Laravel 12, React and Inertia.js. A separate Flutter application uses the implemented versioned API and the same Laravel business rules and database.

## Workspaces

| Workspace     | What you can do                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Buyer**     | Browse the marketplace, manage your cart and addresses, apply shop vouchers, place orders, track deliveries and request returns |
| **Seller**    | Manage products and stock, prepare orders and waybills, create shop vouchers, and review sales and settlements                  |
| **Rider**     | Handle assigned pickups and deliveries, scan parcel checkpoints, submit delivery proof and record COD handovers                 |
| **Logistics** | Manage Riders, coverage and shipping rates; receive, sort and dispatch parcels; confirm cash handovers                          |
| **Admin**     | Review applications, manage accounts and compliance, handle support and refund decisions, and reconcile platform funds          |

Shared features include account verification, Google sign-in, notifications, messaging, private document access and role-based permissions. The [workspace guide](documentation/WORKSPACES.md) covers account requirements, actions and access boundaries for all five roles.

## From checkout to delivery

1. A Buyer checks out with an address and an available shipping option. The server validates vouchers and opt-in Lubos Coins; shipping remains cash.
2. Each Seller prepares their parcel and waybill. A multi-store purchase has separate parcels and tracking references.
3. Logistics teams and assigned Riders record custody through three forward checkpoints: pickup, facility receipt and delivery-Rider handover.
4. The delivery Rider submits proof, recipient information and confirmation of the remaining COD when cash is due.
5. Rider and Logistics record actual cash handovers. Logistics retains shipping and remits merchandise cash; Admin confirms reconciliation and platform receipt before eligible Seller settlement.

> [!NOTE]
> Returns and refunds follow a separate review workflow. Approved refunds credit Lubos Coins. Financial approval, physical return custody and settlement recovery remain separate. Payment records and settlement confirmations record financial activity; bank transfers require separate handling.

Read the [workflow guide](documentation/WORKFLOWS.md) for current scanning, finance, vouchers, returns and account-review rules.

## Technology

<p align="center">
  <img src="documentation/assets/icons/php.svg" width="34" height="34" alt="PHP" title="PHP" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/laravel.svg" width="34" height="34" alt="Laravel" title="Laravel" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/react.svg" width="34" height="34" alt="React" title="React" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/typescript.svg" width="34" height="34" alt="TypeScript" title="TypeScript" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/tailwindcss.svg" width="34" height="34" alt="Tailwind CSS" title="Tailwind CSS" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/vite.svg" width="34" height="34" alt="Vite" title="Vite" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/mysql.svg" width="34" height="34" alt="MySQL" title="MySQL" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/flutter.svg" width="34" height="34" alt="Flutter" title="Flutter" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/docker.svg" width="34" height="34" alt="Docker" title="Docker" />&nbsp;&nbsp;
  <img src="documentation/assets/icons/nodejs.svg" width="34" height="34" alt="Node.js" title="Node.js" />
</p>

| Layer                 | Stack                                                     |
| --------------------- | --------------------------------------------------------- |
| Website               | React 19, TypeScript, Inertia.js 2                        |
| Interface             | Tailwind CSS 4, Radix UI, Lucide                          |
| Backend               | Laravel 12, PHP 8.2+, Eloquent                            |
| API                   | Versioned JSON endpoints, Laravel Sanctum                 |
| Mobile                | Flutter and Dart; separate Buyer, Seller and Rider client |
| Assets                | Vite 6, Node.js 22, npm                                   |
| Database              | MySQL; SQLite supported for local development             |
| Hosting configuration | Docker Compose, Apache, Caddy                             |

Laravel serves the website and owns authentication, authorization, business rules and data. Queue workers process background notifications. The [architecture guide](documentation/ARCHITECTURE.md) brings the system map, technology choices, backend and database together.

## Run locally

| Requirement | Version or setup                                             |
| ----------- | ------------------------------------------------------------ |
| PHP         | 8.2+ with Laravel's required extensions                      |
| Composer    | 2                                                            |
| Node.js     | 22 with npm                                                  |
| Database    | Dedicated local database; follow the selected driver's setup |

1. Open `web/` in your editor. Follow [Web installation](documentation/SETUP.md#web) to install dependencies, configure the local environment and prepare your development database.
2. With setup complete, run these commands in **separate terminals inside `web/`**:

    ```powershell
    php artisan serve
    ```

    ```powershell
    npm run dev
    ```

3. Open **http://localhost:8000**.

| Task                                                   | Command or guide                                                |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Process queued notifications                           | `php artisan queue:work --tries=1`                              |
| Build website assets                                   | `npm run build`                                                 |
| Configure mail, Google login and environment variables | [Environment configuration](documentation/SETUP.md#environment) |
| Develop the native client                              | [Flutter setup](documentation/SETUP.md#flutter)                 |
| Work across both applications                          | [Development workflow](documentation/SETUP.md#development)      |

Use a dedicated development database and synthetic accounts. Preserve existing application keys, customer data and private uploads.

## Repository

```text
lubosmart-app/
├── web/             Laravel, React/Inertia.js website, shared API and backend tests
├── mobile/          Flutter application and Android helper scripts
├── documentation/   Category guides, API contracts, standards and dated reviews
├── .agents/         Shared agent instructions and reusable task skills
├── .github/         Repository automation
└── README.md        Project overview and starting point
```

Run PHP, Composer, npm and Docker commands from `web/`; run Flutter commands from `mobile/`. Development snapshots, browser artifacts and completed build logs belong in the ignored root `.tools/development-artifacts/` directory.

## Documentation

One [documentation index](documentation/README.md) connects the full guides. Related topics share a document, so you can follow a category without opening several READMEs.

| Guide                                                    | Contents                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Workspaces](documentation/WORKSPACES.md)                | Buyer, Seller, Rider, Logistics and Admin capabilities                 |
| [Workflows](documentation/WORKFLOWS.md)                  | Orders, scanning, COD, Lubos Coins, returns, vouchers and approvals    |
| [Architecture](documentation/ARCHITECTURE.md)            | System map, technology stack, backend boundaries and database          |
| [Frontend](documentation/FRONTEND.md)                    | React/Inertia.js structure, shared components and screen-to-source map |
| [Setup and development](documentation/SETUP.md)          | Web, Mobile, shared API and environment configuration                  |
| [API](documentation/api/GUIDE.md)                        | Authentication, endpoints, response formats and integration contracts  |
| [Deployment and operations](documentation/DEPLOYMENT.md) | Production topology, backups, release procedures and email acceptance  |

The index also links project standards, dated reviews and [documentation decisions to reconcile](documentation/README.md#documentation-decisions-and-verification). Historical proposals retain their original review scope; they do not describe the completed Web platform as planned. Native device acceptance and live-service verification remain specific to the target environment.

## Contributing

Follow the [Git workflow](documentation/standards/GIT_WORKFLOW_RULES.md) and [UI/UX standards](documentation/standards/UI_UX_RULES.md). Use the existing LubosMart identity, shared components and supported Tailwind feature set. Preserve authentication, authorization and business workflows.

Agent guidance starts at [AGENTS.md](AGENTS.md), with detailed instructions and reusable skills under `.agents/`.

---

<div align="center">

**LubosMart** · Built for Filipino communities · [lubosmart.app](https://lubosmart.app)

Technology logos: [Devicon](https://github.com/devicons/devicon/tree/v2.17.0) · [License](documentation/assets/icons/LICENSE.txt)

</div>
