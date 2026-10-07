# LubosMart

### *Lubos na Kaginhawaan, Matalinong Pamimili*

![Build Status: CI not configured](https://img.shields.io/badge/build-CI%20not%20configured-lightgrey)
![Tech Stack: Laravel 12, React 19, Inertia 2](https://img.shields.io/badge/stack-Laravel%2012%20%7C%20React%2019%20%7C%20Inertia%202-5B2A86)
![Version: Unversioned](https://img.shields.io/badge/version-unversioned-F59E0B)
[![License: MIT declared](https://img.shields.io/badge/license-MIT%20declared-blue)](composer.json)

> **Project status:** Active development. Enterprise-grade, multi-tenant commerce is the platform vision. The current implementation provides a multi-seller foundation; complete tenant isolation, role workflows and production readiness remain release requirements. Badges describe repository metadata, not live CI results or a published release.

## Table of Contents

- [Project Overview](#project-overview)
- [Brand Identity](#brand-identity)
- [Core User Ecosystem](#core-user-ecosystem)
- [Engineering & Development Team](#engineering--development-team)
- [Architecture & Technology](#architecture--technology)
- [Implementation Status](#implementation-status)
- [Technical Requirements](#technical-requirements)
- [Installation & Environment Setup](#installation--environment-setup)
- [Local Development](#local-development)
- [Quality Assurance](#quality-assurance)
- [Safety, Compliance & Security](#safety-compliance--security)
- [Documentation & Deployment](#documentation--deployment)
- [Versioning & License](#versioning--license)

## Project Overview

**LubosMart** is designed as an enterprise-grade, multi-tenant e-commerce platform connecting buyers, local merchants, couriers and administrators within a unified digital ecosystem optimized for Filipino communities.

The platform brings product discovery, merchant operations, delivery coordination and administrative oversight into one marketplace. Its initial payment model is **Cash on Delivery (COD) only**, with a confirmed default platform commission of **10% of each seller order's item subtotal, excluding shipping**.

The project name is **LubosMart**, and the repository and existing deployment use the identifier `lubosmart-app`.

## Brand Identity

**Tagline:** *Lubos na Kaginhawaan, Matalinong Pamimili*

| Brand Color | Hex Code | UI Usage |
| --- | --- | --- |
| Primary Purple | `#6D47B1` | Primary actions and the LubosMart shopping bag logo |
| Deep Purple | `#312344` | Dashboard welcome panels and brand depth |
| Warm Accent | `#ECAA68` | Small logo and illustration accents |
| Soft Canvas | `#F7F4FB` | Surface background |

These colors define the intended design system. Apply them through shared tokens and reusable components. Validate text contrast, keyboard focus and alert meaning; color alone must not communicate status.

## Core User Ecosystem

```text
                          LubosMart
                              |
          +-------------------+-------------------+
          |                   |                   |
        Buyers          Sellers (MSMEs)         Couriers
          |                   |                   |
       Discover          Manage catalog       Accept routes
       Purchase          Control stock        Deliver parcels
       Track orders      Process orders       Track earnings
                              |
                       Administrators
                              |
              Onboarding, compliance, disputes
                    and commission auditing
```

| Core Role | Platform Responsibilities |
| --- | --- |
| **Buyers** | Product discovery, real-time tracking and secure COD checkout |
| **Sellers (MSMEs)** | Catalog management, inventory control and automated order processing |
| **Couriers** | Dynamic dispatch handling, route acceptance and earnings tracking |
| **Administrators** | Merchant onboarding, compliance, dispute resolution and commission auditing |

Five responsive role dashboards now connect catalog, shopping bag, COD checkout, inventory, fulfillment, dispatch, proof of delivery, cash receipt/reconciliation, order conversations, and reports. Real-time GPS tracking, courier earnings, and seller payouts remain future work. See [UI workflow and persistent test logins](documentation/ui-workflow.md), [registration](documentation/registration-authentication.md), and [testing](documentation/testing-workflow.md).

**Operational support:** Logistics / Sorting Center is a separate staff role for parcel receipt, sorting, area assignment and dispatch. The database recognizes five roles: `buyer`, `seller`, `rider`, `admin` and `logistics`. New buyers can shop after email verification without an ID application. Sellers, riders and logistics users complete saved, step-based applications with pending operational access. Admin approves sellers and logistics; logistics approves riders for its center. Historical buyer applications remain reviewable. Administrators require trusted provisioning. See [registration design decisions](documentation/onboarding-design-decisions.md).

## Engineering & Development Team

| Team Member | Professional Role | Technical Responsibilities |
| --- | --- | --- |
| **Carl Matthew Castro** | *Lead Full-Stack Developer & System Architect* | End-to-end system architecture, core API design, relational database modeling, role-based access control (RBAC) and transaction pipelines |
| **Jayward Villanueva** | *Lead Mobile Application & Frontend Developer* | Client-side mobile architecture, cross-platform UI integration, database consolidation and real-time frontend-to-backend data synchronization |
| **Allianah Pauline Palconan** | *Technical Documentation Specialist & UI/UX Designer* | System design documentation, software specifications, user experience architecture, visual ergonomics and design system compliance |

These responsibilities define ownership across engineering and design. They do not imply that a mobile client or real-time synchronization service is already included in this repository.

## Architecture & Technology

| Layer | Technology / Responsibility |
| --- | --- |
| Backend | Laravel 12 and PHP; server validation, authorization and business actions |
| Frontend | React 19, TypeScript and Inertia.js v2 |
| Styling | Tailwind CSS v4, shared UI components and scoped CSS |
| Server-rendered views | Laravel Blade for the Inertia host and appropriate server-rendered templates |
| Authentication | Laravel sessions and Google OAuth through Socialite |
| Database | MySQL for the local project and documented deployment; SQLite for automated tests |
| Asset pipeline | Vite and npm |
| Production runtime | Azure VM, Docker Compose, PHP 8.3 / Apache, MySQL and Caddy HTTPS |

A checkout is split into one seller order and one delivery per participating store. Product prices, addresses, shipping fees and commission amounts are snapshotted to preserve transaction history.

Multi-tenant access requires explicit store ownership, buyer ownership, rider assignment and sorting-center boundaries. A shared database or seller foreign key alone does not guarantee isolation.

## Implementation Status

| Capability | Current Status |
| --- | --- |
| Email/password and Google authentication | Shared auth forms, verified identity, pending onboarding, role dashboards, suspension checks and explicit Google intents; actual provider/mail acceptance still required |
| Product taxonomy | 14 departments and 83 subcategories from the supplied ITEP 308 categories |
| Checkout | Shopping bag/address UI, transactional COD checkout, retry protection, split orders, stock checks, and cancellation before preparation |
| Commission | Configurable rate, default 10%; per-seller snapshots, excluding shipping |
| Category compliance | Checkout rejects disabled categories and products outside a store's declared department |
| Registration and logistics | Personal/role details, private documents, review/resubmission, center receipt, rider dispatch, delivery status and private proof UI |
| COD accounting | Courier collection, center receipt, and admin reconciliation implemented; seller payout/settlement remains pending |
| Inventory and reports | Seller product/photo creation, editing, visibility, pricing/stock; scoped completed sales reports and audited admin rates |
| Extended marketplace features | Order conversations and printable waybills implemented; variants, vouchers, wishlists, ratings, live chat, and returns remain planned |

See [business rules](documentation/business-rules.md) for confirmed policies, proposed limits and feature dependencies. Commission snapshots represent expected amounts; seller settlement requires reconciled COD and a completed authorized workflow.

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

Create the MySQL database before migrating and ensure the local server is running. `.env.example` defaults to SQLite; the example above deliberately selects MySQL. Google credentials are optional until sign-in is configured. Register the exact callback URI with Google and follow the [OAuth guide](documentation/google-oauth.md).

`MAIL_MAILER=log` supports local development; it does not send email to applicants. Configure a real transport before testing email delivery or approval notifications.

### 4. Apply migrations and import categories

```powershell
php artisan config:clear
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
```

The taxonomy seeder is repeatable and preserves existing category IDs and custom rows. Use additive migrations for existing databases. Historical orders retain null commission snapshots rather than receiving retroactive fees.

> **Database safety:** Never run `migrate:fresh` against data you need to keep. The generic `DatabaseSeeder` creates a demo user; use the explicit taxonomy seeder for production category imports. Review [schema and rollback limitations](documentation/core-schema-erd.md) before upgrading.

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

Automated tests cover application behavior; real Google callbacks, email delivery, accessibility and role journeys also require environment-specific acceptance checks. A local passing test suite is not a live CI badge. See [coding guidelines](documentation/coding-guidelines.md) and [release readiness](documentation/release-readiness.md).

## Safety, Compliance & Security

> **Safety:** Back up database and uploaded files before production changes. Preserve persistent Docker volumes. Never run `docker compose down -v` on production. Deploy reviewed changes using the established runbook.

> **Security:** Keep credentials, populated `.env` files and private keys out of Git. Use HTTPS, secure sessions, CSRF protection, rate limits and server-side authorization. Public input must never grant administrative roles, approval status or unrestricted center access. Store identity documents privately and serve them through authorized routes.

> **Compliance:** Define consent, document retention, account review, listing restrictions and dispute procedures before operational launch. Follow the documented Philippine-community requirements and confirm applicable obligations with the responsible project owner. This README does not certify regulatory compliance.

> **Financial integrity:** COD is the only supported payment method. Calculate totals and commission on the server. Separate collection, reconciliation and settlement; unresolved disputes or unreconciled cash must prevent payout when the settlement workflow is implemented.

## Documentation & Deployment

Project Markdown belongs in `documentation/`; the root README serves as the repository entry point. Framework, dependency and agent/skill instruction files remain in their required locations.

| Document | Purpose |
| --- | --- |
| [Documentation Index](documentation/README.md) | Project guides and implementation status |
| [Core Schema ERD](documentation/core-schema-erd.md) | Canonical database reference and relationship diagrams |
| [ERP Categories](documentation/erp-categories.md) | Course taxonomy and import rules |
| [Registration & Authentication](documentation/registration-authentication.md) | Five roles, verification, onboarding and approval design |
| [Google OAuth](documentation/google-oauth.md) | Configuration, account linking and failure handling |
| [Business Rules](documentation/business-rules.md) | Commission structure, COD policies and operational limits |
| [Sorting Center](documentation/sorting-center.md) | Parcel custody, area routing and dispatch design |
| [Coding Guidelines](documentation/coding-guidelines.md) | Maintainable architecture and frontend/backend practices |
| [Release Readiness](documentation/release-readiness.md) | Acceptance criteria and deployment gates |
| [Testing Workflow](documentation/testing-workflow.md) | Focused development branches and local testing instructions |
| [UI Workflow](documentation/ui-workflow.md) | Connected role screens, persistent logins, and complete local COD test journey |
| [Deployment Runbook](documentation/deployment.md) | Existing Azure / Docker production procedure |

Production deployments follow the documented manual Azure workflow. Merging into `main` does not deploy automatically. Local setup commands are not a production release procedure.

## Versioning & License

**Version:** No project release version is declared yet. Establish release tags and a changelog when the team adopts a release process.

**License:** `composer.json` declares **MIT**. A standalone project `LICENSE` file is not currently present; include the applicable license text and ownership information when formalizing distribution. Dependencies retain their respective licenses.
