# Implementation order and release readiness

The 2026-10-07 updates implement authentication/onboarding, private applications, role-scoped review, account suspension, five responsive dashboards, and the connected COD marketplace workflow described in [UI workflow](../design/ui-workflow.md). They also add the Compose queue worker for decision emails. The project owner reported a successful Azure deployment and working Google sign-in on 2026-10-07. The newer admin dashboard and homepage navigation edits remain local. Dispatch and cash reconciliation are implemented; seller settlement remains unfinished. Production mail delivery, complete role journeys, and MySQL concurrency acceptance still need verification.

## Ordered implementation plan

| Stage | Deliverables | Exit condition |
| --- | --- | --- |
| 1. Identity/approval | Role/status contract, profiles/applications, verification, pending landing, first-admin command | Public roles cannot operate before verification/review; admin/logistics cannot self-grant |
| 2. Authorization | Active-account checks, record policies, admin review, role destinations | Cross-user/store/center requests denied; suspension takes effect in existing sessions |
| 3. Google polish | Separate login/register/link intents, safe linking, exceptions, shared UI | Real local/staging flow and failure paths pass; missing fields go to onboarding |
| 4. COD commerce | Authorized catalog/cart/address/checkout integration, retry protection, cancellation | Prices/fees trusted only from server; concurrent stock and retries remain correct |
| 5. Logistics/accounting | Centers/areas, task assignment/custody, proof, cash ledger/reconciliation | Competing assignments allocate once; duplicate money events cannot settle twice |
| 6. Production release | Backups, migrations, mail, credentials, HTTPS/cookies, verification | End-to-end role journeys pass on canonical production domain |

The updated ITEP attachment resolves taxonomy requirements: 14 departments and 83 subcategories. Apply the additive hierarchy migration and run only `MarketplaceCategorySeeder`; review unmapped legacy products/store departments without changing historical IDs.

## High-value acceptance checks

Use existing Pest feature-test conventions; extend tests when implementation changes. Test observable boundaries rather than merely asserting the presence of enums/routes.

| Boundary | Required examples |
| --- | --- |
| Registration | New buyers need verified email but no ID application; partners start pending drafts without business/vehicle details; drafts resume without granting privileges; final submission validates required details/documents; public admin or status injection rejected/ignored |
| Verification/review | Unverified or pending users cannot operate; approval/rejection audited; resubmission permitted; two reviewers cannot decide inconsistently |
| Session access | Suspended password/Google users denied operations; existing session denied after suspension; logout invalidates session |
| Authorization | Buyer cannot access another address/order; seller cannot edit another store; rider cannot complete another assignment; logistics cannot read another center/export |
| Google | Existing identity keeps role; no email-only account takeover; missing/expired intent, unverified identity, denial, invalid state, provider failure and conflicting IDs handled |
| Checkout | Unsupported payment rejected; browser price/fee ignored; unapproved seller/insufficient stock rejected; foreign address blocked; transaction rollback; retry idempotency |
| Dispatch | Two accept/assign requests produce one winner; inactive/out-of-area rider denied; duplicate scan harmless; reassignment revokes old access |
| COD | Package-specific due amount; short collection not delivered; repeated collection/handover/settlement not duplicated; reports match reconciled ledger |

Existing auth and checkout tests are a baseline, not proof of the proposed workflow. Google tests now reject linking based solely on matching email. Provider fakes do not exercise a real browser's cookies or Google configuration.

Manual journeys: short buyer signup and email verification then COD checkout; seller account setup, saved/resumed application, private documents, final review/store approval then fulfillment; rider application then assigned parcel and collection; logistics center receipt/dispatch/reconciliation; admin review history/suspension/settings. Historical buyer applications retain their review decisions. Also test mobile layout, keyboard-only form/dialog use, cancellation and provider outage. Use synthetic records and designated test accounts.

## Production environment checklist

- Confirm the actual Azure VM, branch, domain and deployment path from [deployment](deployment.md). This project already uses Azure; no Laravel Cloud migration is required by this guide.
- Use production Google client/callback, real mail transport, `APP_ENV=production`, `APP_DEBUG=false`, canonical HTTPS `APP_URL`, stable `APP_KEY`, persistent sessions, secure/HTTP-only/Lax cookies.
- Check that pending/approval notifications and recovery/verification messages actually arrive. The Compose file now includes a queue worker. Verify it is running and uses the correct mail transport; declaring `QUEUE_CONNECTION=database` alone does not process jobs. Add scheduler execution if scheduled tasks are introduced.
- Back up MySQL and uploaded storage off-VM and test restoration. Keep Docker volumes, database credentials and app key. Plan migration compatibility and code rollback separately from data rollback.
- Keep database/app ports private; public traffic reaches Caddy. Protect identity uploads separately from public product images. Verify proxy/cookie behavior through Google round trips.

## Deploying a reviewed release

Follow the existing branch/PR and SSH workflow. Confirm clean production checkout before switching/pulling; record the prior commit and backup reference. After configuration review and verified backup:

```bash
cd ~/lubosmart-app
git status --short
git branch --show-current
git pull --ff-only origin main
docker compose config --quiet
docker compose up -d --build
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --class=MarketplaceCategorySeeder --force
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache
docker compose ps
curl -I https://lubosmart.app/up
```

Use this sequence only after confirming the checked-out branch is `main` and it is safe to release. For schema changes incompatible with running code, use a maintenance-window plan or split backward-compatible expansion and later cleanup into separate releases. `up -d --build` can activate code before migrations; it is not automatically a zero-downtime migration strategy. After environment edits, recreate the app as described in the deployment runbook before rebuilding configuration cache.

The Dockerfile already installs production PHP dependencies and builds Vite assets. Do not run production `npm run dev`. Migrations are not run by that Dockerfile; they remain a release step. Keep private operational credentials out of command output and version control.

Laravel recommends production optimization and disabled debug mode in its [deployment documentation](https://laravel.com/docs/12.x/deployment).

## Verify and recover

After release, confirm `/up`, homepage assets, local sign-in, Google callback, verification/recovery mail, pending/approved destinations and denied wrong-role operations. Check redacted logs, queue processing if used, uploads and a designated COD test journey. A 200/redirect response alone does not prove these flows work.

If release checks fail, record the failing behavior, inspect logs and halt operational rollout. Restore a known compatible reviewed commit and rebuild containers when safe; use a reviewed revert or release branch rather than discarding production files. Rebuild caches. Keep additive data intact; database recovery requires its own restore/compatibility decision. Never use `migrate:fresh` or `docker compose down -v` in production.

## Documentation update validation

Validation recorded for the 2026-10-06 update: 61 PHP tests passed (220 assertions), Pint passed, and all local Markdown links/code fences passed inspection. The three additive migrations and taxonomy seeder were also applied successfully to the local MySQL `ecommerce_db`: 14 canonical departments, 83 canonical subcategories, default commission 1000 basis points. Production was not modified.

For this update, run the auth/application/role/command suites, the checkout suite, full PHP suite, formatting, TypeScript, ESLint, build and Markdown link checks. The upgrade must preserve legacy category/order IDs and leave historical commission snapshots null. The taxonomy migration refuses rollback while names repeat across departments; dropping populated foundation/commission tables or columns loses data. Prefer reviewed forward fixes in production.
