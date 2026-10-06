# Project documentation

Reviewed: **2026-10-06 (Asia/Manila)**. The latest update includes additive migrations, the full course product taxonomy and commission/category enforcement in checkout. Approval, dispatch and COD settlement workflows have schema foundations but still need authorized actions/screens. Production has not been changed or inspected remotely.

## Reading order

| Document | Purpose |
| --- | --- |
| [Source requirements](source-requirements.md) | PDF findings, conflicts, assumptions, missing requirements |
| [ERP product categories](erp-categories.md) | Complete updated ITEP 308 taxonomy: 14 departments, 83 subcategories |
| [Registration and authentication](registration-authentication.md) | Five roles, approval states, permissions, implementation steps |
| [Google OAuth](google-oauth.md) | Configure and harden the existing Socialite integration |
| [Core functions and business rules](business-rules.md) | System categories, COD checkout, fulfillment and settlement |
| [Sorting center](sorting-center.md) | Area-based sorting, rider assignment and custody |
| [Coding guidelines](coding-guidelines.md) | Laravel, React, JS/TS, Blade, CSS and Tailwind architecture |
| [Core Schema ERD](core-schema-erd.md) | Canonical schema reference, actual relationship diagrams and migration limitations |
| [Release readiness](release-readiness.md) | Implementation order, acceptance criteria and launch checks |
| [Testing workflow](testing-workflow.md) | Focused branch stack, complete testing version and local startup |
| [Deployment](deployment.md) | Existing Azure/Docker runbook |

## Current implementation versus target

| Concern | Repository now | Target |
| --- | --- | --- |
| Roles | Users enum includes buyer, seller, admin, logistics, rider | Five roles with explicit authorization |
| Public registration | Buyer/seller/rider accepted; buyer default | Applications for these roles; no public admin/logistics grants |
| Approval | Users default active; seller stores start pending | Approval before operational access |
| Google | Dependency, config, routes, controller, tests, homepage button | Separate login/onboarding, safe linking, graceful errors |
| Verification | Routes exist; User lacks `MustVerifyEmail`; dashboard uses only `auth` | Verified identity and approval checks |
| Dashboard | One authenticated dashboard | Authorized role destinations and application status pages |
| Catalog | Hierarchical category migration and idempotent 97-row taxonomy seeder; store department FK | Category management, seller classification and catalog UI |
| Checkout/commission | Transactional COD checkout with commission snapshots, active taxonomy and declared-department checks | Authorized endpoints/screens; refunds and reconciled settlement |
| Logistics | Centers, service areas, memberships, parcel events, collection and settlement tables in migrations | Authorized scan/dispatch/reconciliation workflows |
| Registration review | Profile, application, document and rider-profile tables in migrations | Pending-account creation, onboarding and admin review actions |
| UI | Homepage modal and dedicated auth pages differ; legacy Blade/public assets exist | Shared React auth components and validation |

## Maintenance

Keep guides, decisions and schema explanations here. Do not relocate `AGENTS.md`, `SKILL.md`, vendor documents or tool-required files. The former deployment README and database ERD have been moved here with their substantive content preserved.

Label future behavior as **proposed** until migrations, authorization, UI and checks exist. Update the relevant guide with each business-rule change. Record decision owner, date, reason and acceptance evidence. Never document credentials or real identity/customer data.

Use `core-schema-erd.md` consistently as the schema filename. Apply migrations then `php artisan db:seed --class=MarketplaceCategorySeeder`; do not run the generic demo-user seeder in production. See [deployment](deployment.md) for release steps and [business rules](business-rules.md) for confirmed commission parameters and proposed feature limits.
