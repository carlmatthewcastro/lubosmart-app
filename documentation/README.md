# LubosMart Documentation

Read the guides in this order to understand the platform, its implementation and how to run it.

| Order | Guide | What It Explains |
| --- | --- | --- |
| 1 | [Tech Stack](tech-stack/README.md) | Technologies and their purpose |
| 2 | [Functions](#functions) | What each user role can do |
| 3 | [Front End](front-end/README.md) | React/Inertia pages, forms, state and builds |
| 4 | [Backend](backend/README.md) | Laravel structure, authentication, approvals and business rules |
| 5 | [Database](database/README.md) | Tables, relationships and data rules |
| 6 | [API](api/README.md) | Planned REST API, Sanctum and migration checklist |
| 7 | [Deployment](deployment/README.md) | Local setup, email/Google configuration and production releases |

## Functions

Follow the order journey first, then platform administration:

1. [Buyer](functions/buyer/README.md) — Shopping, checkout and order tracking.
2. [Seller](functions/seller/README.md) — Inventory and order preparation.
3. [Rider / Courier](functions/rider/README.md) — Pickup, delivery and COD collection.
4. [Sorting Center](functions/sorting-center/README.md) — Parcel processing, dispatch and cash handovers.
5. [Admin](functions/admin/README.md) — Account reviews, compliance and platform oversight.

## Development Standards

Frontend changes follow [UI/UX rules](standards/UI_UX_RULES.md).

Branching, commits, and GitHub pushes follow [Git workflow rules](standards/GIT_WORKFLOW_RULES.md).

## Status and Sources

**Current** describes inspected source/configuration, not live acceptance. **Planned** identifies the REST API/Sanctum migration. Live Azure and Cloudflare settings remain unverified.

Baseline: `feat/logistics-workspace`, commit `3c39dc099de78b19be1a5272c663153861951526`, reviewed 2026-10-11. Each guide lists relevant repository sources. The supplied five-page `ERP-Components.pdf` provides role requirements; a formally identified official SRS was not found. Features beyond the implementation are labelled accordingly.

[Project README](../README.md)
