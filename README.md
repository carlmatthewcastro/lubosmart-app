# LubosMart

LubosMart is an e-commerce and delivery platform for Filipino communities, connecting buyers, sellers, riders, logistics companies and administrators from shopping through parcel fulfillment and cash reconciliation.

[Public website](https://lubosmart.app) (deployment status not verified here).

## Main features by role

| Role | Main features |
| --- | --- |
| Buyer | Browse products, manage cart/addresses, use shop vouchers, place orders, track parcels and request returns |
| Seller | Manage listings/stock, prepare parcels and waybills, manage vouchers, review sales and settlements |
| Rider | Perform assigned pickup/delivery work, scan custody checkpoints, submit private delivery proof and hand over COD |
| Logistics | Review riders, manage coverage/rates, receive/sort parcels, assign work and confirm cash handovers |
| Admin | Review applications, manage compliance/support, approve refunds and reconcile platform funds |

Operational access depends on verification, approval and role/ownership checks. Buyer password signup activates after email verification; other onboarding paths retain their documented review requirements. See [role workflows](documentation/workflows/README.md).

## Technology stack

Laravel 12/PHP, React 19/TypeScript with Inertia.js 2 and Tailwind CSS 4, Flutter/Dart, Sanctum, Vite and Pest. Docker documents PHP 8.3/Apache, MySQL 8.4 and Caddy on Azure. Local configuration can use SQLite. See the [stack guide](documentation/tech-stack/README.md).

## Architecture

The Laravel modular monolith serves the integrated React/Inertia website and an implemented `/api/v1` mobile API. Flutter lives in `apps/mobile`; both clients share backend business rules and database data. Web sessions and mobile bearer tokens have separate authentication boundaries. Queue workers process operational notifications.

See the [architecture diagram and repository map](documentation/architecture/README.md).

## Quick start

Use a dedicated local database and preserve existing environment files and keys. From a new checkout, follow [Laravel/web setup](documentation/setup/WEB.md) for dependency installation, environment configuration and local startup. Follow [Flutter setup](documentation/setup/FLUTTER.md) for a test API connection and the dedicated Rider Android entry point.

The Rider helper defaults to the live API; use an authorized test API URL for testing. Setup commands are documented for future use and were not executed during this cleanup.

## Documentation

Start at the [documentation index](documentation/README.md): [setup](documentation/setup/README.md), [architecture](documentation/architecture/README.md), [workflows](documentation/workflows/README.md), [testing](documentation/testing/README.md), [deployment and backups](documentation/deployment/README.md), and [historical records](documentation/archive/README.md).

Repository work follows the [Git workflow rules](documentation/standards/GIT_WORKFLOW_RULES.md) and [UI/UX rules](documentation/standards/UI_UX_RULES.md).

## Project status and limitations

Documentation reviewed November 17, 2026 (Asia/Manila). Source presence and prior reports do not certify deployed behavior. No application tests or builds were run for this documentation cleanup.

- OpenAPI/Postman are older snapshots; later finance, wallet and return changes are described in the [API guide and additions](documentation/api/README.md). Generated contracts remain unchanged.
- Current refunds use version-3 decisions and Lubos Coin credits; bank transfers, top-ups and withdrawals are not implemented in the [finance contract](documentation/workflows/FINANCE_AND_RETURNS.md). Native wallet screens remain pending in existing mobile records.
- The [November 17 Rider device record](apps/mobile/DEVICE_TEST_2026_11_17.md) confirms installation, launch and an authenticated assignment screen. Complete physical scanning, proof upload, delivery/return journeys, release signing and iOS acceptance remain separate work.
- Dated test reports retain their original failures, skips and acceptance limits in the [archive](documentation/archive/README.md). Live infrastructure, external services and full accessibility were not verified here.

Changes remain local. Nothing was pushed, merged, published or deployed; a future push or merge may trigger existing automation and needs separate review.
