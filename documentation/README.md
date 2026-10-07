# Project documentation

Reviewed: **2026-10-07 (Asia/Manila)**. Authentication now includes verified/pending applications, private documents, admin/logistics review, queued decisions, suspension and five role dashboards. See [registration](registration-authentication.md) and [testing](testing-workflow.md). The latest update includes additive migrations, the full course product taxonomy and commission/category enforcement in checkout. Approval actions/screens are implemented; dispatch and COD settlement still need authorized workflows. Production has not been changed or inspected remotely.

## Reading order

| Document | Purpose |
| --- | --- |
| [Source requirements](source-requirements.md) | PDF findings, conflicts, assumptions, missing requirements |
| [ERP product categories](erp-categories.md) | Complete updated ITEP 308 taxonomy: 14 departments, 83 subcategories |
| [Registration and authentication](registration-authentication.md) | Five roles, approval states, permissions, implementation steps |
| [Progressive onboarding decisions](onboarding-design-decisions.md) | Applied DOCX recommendations, buyer signup, saved application progress, and acceptance steps |
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
| Public registration | New buyers shop after email verification; partners receive saved draft applications | Admin provisioned interactively; no public admin grants |
| Approval | Partners remain pending; step-based submission, admin/logistics review/history and audit | Real mail delivery and concurrency acceptance |
| Google | Dependency, config, routes, controller, tests, homepage button | Separate login/onboarding, safe linking, graceful errors |
| Verification | MustVerifyEmail, verified/active boundaries and session suspension checks | Real verification/recovery delivery |
| Dashboard | Five responsive role destinations, navigation, scoped counts and activity | Further UX acceptance and future modules |
| Catalog | Search/filter UI, seller inventory/photo editing, taxonomy and store department checks | Variations and advanced merchandising |
| Checkout/commission | Shopping bag/address UI, transactional COD checkout, retry protection, cancellation, and snapshots | Refunds and seller settlement |
| Logistics | Authorized center receipt, rider assignment, status/proof, COD receipt/reconciliation, event history | Service-area automation, scans, and seller payouts |
| Registration review | Validated applications/private uploads; admin reviews buyers/sellers/logistics, assigned center reviews riders | Real document/notification acceptance |
| UI | Consistent dashboard shell, custom logo, connected role screens; see [workflow](ui-workflow.md) | Remaining module UI and environment acceptance |

## Maintenance

Keep guides, decisions and schema explanations here. Do not relocate `AGENTS.md`, `SKILL.md`, vendor documents or tool-required files. The former deployment README and database ERD have been moved here with their substantive content preserved.

Label future behavior as **proposed** until migrations, authorization, UI and checks exist. Update the relevant guide with each business-rule change. Record decision owner, date, reason and acceptance evidence. Never document credentials or real identity/customer data.

Use `core-schema-erd.md` consistently as the schema filename. Apply migrations then `php artisan db:seed --class=MarketplaceCategorySeeder`; do not run the generic demo-user seeder in production. See [deployment](deployment.md) for release steps and [business rules](business-rules.md) for confirmed commission parameters and proposed feature limits.
