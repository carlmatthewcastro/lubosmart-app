# LubosMart Documentation

Read the guides in this order to understand the platform, its implementation and how to run it.

| Order | Guide | What It Explains |
| --- | --- | --- |
| 1 | [Tech Stack](tech-stack/README.md) | Technologies and their purpose |
| 2 | [Functions](#functions) | What each user role can do |
| 3 | [Front End](front-end/README.md) | React/Inertia pages, forms, state and builds |
| 4 | [Backend](backend/README.md) | Laravel structure, authentication, approvals and business rules |
| 5 | [Database](database/README.md) | Tables, relationships and data rules |
| 6 | [API](api/README.md) | Implemented mobile API v1, token login, OpenAPI, Postman and remaining parity |
| 7 | [Deployment](deployment/README.md) | Local setup, email/Google configuration and production releases |

## Project Navigation and Requirements

Laravel and the integrated React/Inertia website remain at the repository root; Flutter remains under `apps/mobile`. See the [root repository map](../README.md#repository-map) and [organization record and testing roadmap](PROJECT_ORGANIZATION.md).

Account-creation references are consolidated under `requirements/`: [audit](requirements/ACCOUNT_CREATION_AUDIT.md), [traceability](requirements/ACCOUNT_CREATION_TRACEABILITY.md), [implementation plan](requirements/ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md) and [final report](requirements/ACCOUNT_CREATION_FINAL_REPORT.md). Their `evidence/` files are historical execution records, not new acceptance results.

## Functions

Use the [black-box testing guide](BLACK_BOX_TESTING_GUIDE.md) and [Excel-compatible results sheet](BLACK_BOX_TEST_RESULTS.csv) to test core workflows, backend integrity, role boundaries and physical acceptance. All supplied cases start Not Run.

The [November 5 automated test report](AUTOMATED_TEST_REPORT_2026_11_05.md) records the fresh local backend/browser checks, test-harness repairs and remaining manual acceptance.

That report predates the expanded mobile API. Use the [later mobile verification report](api/MOBILE_COMPLETION_2026_11_05.md) for its recorded API/Flutter results and the [Android build report](api/ANDROID_SETUP_2026_11_05.md) for retained debug APK evidence. These reports describe prior runs; the documentation organization batch did not rerun application tests. Physical-device and external-service acceptance remain outstanding.

Start with the [complete system feature checklist](SYSTEM_FEATURE_CHECKLIST.md), ordered Admin, Seller, Buyer, Logistics and Rider, with implementation states and acceptance requirements.

The [finance and returns guide](FINANCE_AND_RETURNS.md) explains Admin seller settlements, Logistics-only Rider pay, controlled returns/refunds, historical stock restoration and seller costs/profit.

The [four-role workspace acceptance guide](WORKSPACE_ACCEPTANCE.md) covers reusable settings, dialogs/toast feedback, live updates, stock timing, waybill requests, and testing with fresh accounts.

The [Admin approval and notification guide](ADMIN_APPROVAL_NOTIFICATIONS.md) covers mandatory Buyer/Seller/Logistics approval, pending account restrictions, individual registration alerts, and the separation between live and local accounts.

The [seller/buyer completion and role connections](SELLER_BUYER_COMPLETION.md) guide explains variants, vouchers, verified reviews, the parcel journey and separate COD handovers.

Follow the order journey first, then platform administration:

1. [Buyer](functions/buyer/README.md) — Shopping, checkout and order tracking.
2. [Seller](functions/seller/README.md) — Inventory and order preparation.
3. [Rider](functions/rider/README.md) — Pickup, delivery and COD collection.
4. [Logistics](functions/logistics/README.md) — Parcel processing, dispatch and cash handovers.
5. [Admin](functions/admin/README.md) — Account reviews, compliance and platform oversight.

## Development Standards

Frontend changes follow [UI/UX rules](standards/UI_UX_RULES.md). The [page audit](standards/UI_UX_AUDIT.md) records improvements and remaining verification.

Branching, commits, and GitHub pushes follow [Git workflow rules](standards/GIT_WORKFLOW_RULES.md).

The [ERP role and capability audit](standards/ERP_ROLE_CAPABILITY_AUDIT.md) maps the supplied reference to implemented role boundaries, the public Rider/Logistics approval flow and remaining capability gaps.

Use the [Logistics and Rider demo](LOGISTICS_DEMO.md) for local sample parcels and every implemented function. The [connection verification](LOGISTICS_RIDER_VERIFICATION.md) records current checks and unresolved test limitations.

The [core workflows and scanning requirements](standards/CORE_WORKFLOWS_AND_SCANNING_REQUIREMENTS.md) preserve the full order, custody and financial journey. The [Logistics implementation and acceptance report](standards/LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md) records the 2026-10-16 implementation, checks and remaining decisions.

## Status and Sources

**Current** describes inspected source/configuration, not live acceptance. The core mobile API v1 is implemented locally; remaining API parity is identified in its guide. Live Azure and Cloudflare settings remain unverified.

Baseline: `feat/logistics-workspace`, commit `3c39dc099de78b19be1a5272c663153861951526`, reviewed 2026-10-11. Each guide lists relevant repository sources. The supplied five-page `ERP-Components.pdf` provides role requirements; a formally identified official SRS was not found. Features beyond the implementation are labelled accordingly.

[Project README](../README.md)
