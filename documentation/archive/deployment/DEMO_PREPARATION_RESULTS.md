> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Demonstration preparation results — 17 November 2026

Photo update requested later that day: the 45 seeded products now use 38 real
Wikimedia Commons photographs instead of the original SVG placeholders. Some
related listings share photographs; editions, packaging, quantity, color and exact
accessory model remain illustrative. Sources, photographers, per-photo licenses
and SHA-256 checksums are packaged in `database/demo/assets/photos/sources.json`.
See [photo attribution](../../../database/demo/assets/photos/ATTRIBUTION.md).
All 38 deployed photo files and the public credits page returned HTTP 200 locally;
the updated marketplace was visually inspected in desktop Chrome. The photo updater
reported 45 updates on its first run and zero on its second, with financial
reconciliation still passing. The final seeder suite passed 10 tests / 134 assertions,
including preservation of custom seller images, stock, prices and order history.
No additional frontend layout changes were made. Fresh seeds now install the photos
without downloading anything at runtime. `lubosmart:demo-photos` upgrades legacy
owned placeholders; it leaves seller-supplied image paths intact. A pre-photo backup
is available at `.tools/demo-backups/20261116-172418-86b682/`.

Implemented and executed locally against `ecommerce_db` on loopback MariaDB
10.4.32. No Azure database was accessed, no remote deployment or production seeding
ran, and no branch change, commit or push was performed. Existing UI and business
workflow edits remain intact.

## Prepared data

| Demonstration records | Result |
| --- | --- |
| Primary accounts | All 5 retained, including IDs, raw password hashes, OAuth associations, roles, profiles and approval/verification state |
| Additional accounts | 2 riders, 4 sellers, 10 buyers (the tenth buyer is the registration smoke account) |
| Stores used | Valora plus 4 fictional approved stores |
| Added products | 45; all 45 visible through `availableToShoppers`; sufficient remaining stock and selectable options |
| Public shop vouchers | 10, from existing starter templates |
| Orders | 34 registered demo orders; 14 historical delivered orders, actionable queues, cancelled order, Coins purchase and new-buyer purchase |
| Return/refund cases | 6: pending review, approved transport awaiting assignment, assigned collection, completed return/refund, rejection, seller-return dispatch assignment |
| Reviews | 30 marked `[DEMO REVIEW]`, linked to actual delivered purchases |
| Synthetic product-cash remittances | 7 |
| Synthetic paid seller settlements | 3, in new stores; existing Valora holds preserved |
| Rider compensation | Unseeded: no approved manual amount exists |

Primary identities remain Administrator #22, Logistics #35, Rider #48, Buyer #47 and
Seller #46. Existing passwords must be used. Password login for these identities
was not tested because their current plaintext passwords were not supplied. Their
unchanged account/profile records and operational eligibility were verified.

The compact cluster reuses Flash Express facility #2, Calios in Santa Cruz and
Barangay II (Pob.) in Pagsanjan, Laguna. Existing approved fees, geographic codes,
coverage, commission, return policy and voucher templates are documented in the
[runbook](../../deployment/DEMO_ENVIRONMENT.md). The geographic service resolved both actual locations
successfully outside the restricted tool network sandbox. No operational records
were created or replaced. Older synthetic facilities/coverage were left untouched.

## Ready-to-use primary Rider scenarios

| Task | Seller parcel / delivery ID | Tracking reference |
| --- | --- | --- |
| Pickup | 52 | LM-E91F75CDDCE44F308AD4145F642316E4 |
| Additional pickup | 53 | LM-776CA9DE62924C7FB53E117F88C2B796 |
| Delivery dispatch acceptance | 58 | LM-1E57BDC2D518464DB8039701B083EEBE |
| Additional delivery dispatch acceptance | 59 | LM-8DD90C0C61504B22A17252CED325BC04 |

Return case #5 / parcel #34 awaits primary Rider collection, reference
`RT-b9c121b2-3792-4d98-9aeb-2004bedddb9b`. Return case #8 / parcel #37 is at
`seller_assigned`, reference `RT-4791ca72-7318-43c5-abdc-6ae6a5bcd253`, ready for the
primary Rider's seller dispatch acceptance. Both use existing return transport.

Order #30 is a primary-buyer delivered purchase with no refund request or review,
available for a fresh demonstration action within its original return window.
Do not extend its dates or reset it after use. The new registration smoke buyer's
pending Valora purchase is order #64. IDs reflect this local execution only; consult
the generated private guide for the target database and current workflow state.

## Executed validation

| Check | Result |
| --- | --- |
| Broad backend regression run | 208 tests passed, 2,731 assertions, across checkout, seeding, Rider, fulfillment, settlements, refunds, marketplace, Google auth, shipping and dashboard suites |
| Final seeder-focused run | 9 tests passed, 121 assertions; overlaps the broad run and adds the unowned-email collision rollback case |
| Local normal registration | Passed actual registration validation, location resolution, captured email-code verification and administrator approval; all messages suppressed |
| Local new-buyer checkout | Passed normal checkout into Valora, selected variation, ₱38 quoted shipping and eligible ₱10 voucher; order #64 total ₱518 |
| API password authentication | All 16 generated accounts authenticated through existing token and user endpoints; temporary tokens revoked |
| Primary Rider API retrieval | Delivery and return endpoints passed using a temporary scoped token; this does not verify the unknown existing password |
| Ordinary HTTP buyer flows | Password and mocked Google signup, required verification/approval, cart option/quantity updates, shipping, voucher checkout and seller order visibility passed in isolated feature tests |
| Unsupported delivery area | Checkout rejected through existing coverage validation without decrementing stock |
| Images and storage | All 45 generated SVG URLs returned HTTP 200 locally; existing `public/storage` junction resolves to public uploads |
| QR compatibility | All 34 system-generated references passed pure QR pixel encoding/decoding with installed ZXing and application reference validation; private printable SVG fixtures generated |
| Financial reconciliation | Orders, item/discount totals, shipping snapshots, COD, commissions, remittances, settlements, refunds and wallet ledger totals reconciled |
| Rerun idempotency | Passed comparison of ID-bearing business rows before/after a local rerun, including stock, financial entries, assignments and progress |
| Live-progress preservation | Passed feature test advancing a pending parcel through the real seller action, then rerunning without resetting it |
| Original-record preservation | Original business rows unchanged except the primary buyer wallet's authorized, reconciled refund/redemption changes; two volatile session records differed from the backup |
| PHP formatting | Pint passed for this task's PHP files |
| TypeScript | `npx.cmd tsc --noEmit` passed |
| Changed JavaScript lint | `npx.cmd eslint tests/Frontend/demo-qr-check.cjs` passed |
| Production build | `npm.cmd run build` passed |

Repository-wide ESLint remains blocked by three existing unused variables in
`tests/Frontend/refund-browser-check.cjs`: `adminRefinement`, `financeSnapshots`,
and `previousSnapshots`. No unrelated file was changed to resolve them. The build
reported existing unresolved-at-build-time banner/category image references; all
new demo catalog images were separately verified over HTTP.

The existing `qr-pod-browser-check.cjs` failed at its current Rider page selector
(`disabled` on an absent control), before validating camera acquisition. This is
not recorded as a successful camera test. Physical phone QR acquisition, printing
and fresh live POD capture remain operator acceptance items. The pure QR check
verifies encoded content and reference compatibility, not physical custody.

Real Google provider authentication, deployed account presence, Azure connectivity,
container execution and MySQL 8.4 behavior remain unverified. The existing local
Google callback points to production. Follow the exact callback and acceptance
steps in the runbook; no OAuth secrets were printed or changed.

## Backups and private deliverables

The pre-seeding backup is `.tools/demo-backups/20261116-162548-ceadb4/`, containing
`database.sql`, `uploads.tar`, checksums in `manifest.json` and private row
fingerprints. A post-preparation backup was also created at
`.tools/demo-backups/20261116-170129-c0a33e/`. Backup creation, nonempty SQL and archive
generation succeeded; an isolated restore rehearsal was not executed.

Credentials and scenario details are in `storage/app/private/demo/DEMO_GUIDE.md`
and its companion JSON files. Git ignore checks confirmed that both credentials
and backups are excluded. Windows ACLs restrict these directories to the repository
owner, SYSTEM and the current Codex sandbox identity. No credentials, hashes,
environment files or database exports were added to version control.

Run locally:

```powershell
php artisan db:seed --class=LubosMartDemoSeeder --no-interaction
php artisan lubosmart:demo-verify
```

See [DEMO_ENVIRONMENT.md](../../deployment/DEMO_ENVIRONMENT.md) for preflight, backup, review/commit,
missing-primary provisioning, safe migration and exact future Compose commands.
Deployed seeding requires separate explicit authorization and an isolated demo
environment with the opt-in flag. The seeder never runs at application startup.

## Files added or modified by this task

- `.env.example`: documented disabled-by-default demo opt-in flag.
- `config/demo.php`: fixture primary identities and deployed-execution opt-in.
- `app/Console/Commands/DemoPreflight.php`, `DemoProvisionPrimary.php`, `DemoVerify.php`, `DemoPhotos.php`.
- `app/Services/Demo/DemoAccounts.php`, `DemoActions.php`, `DemoCatalog.php`,
  `DemoFixtures.php`, `DemoOrders.php`, `DemoPreflight.php`, `DemoVerification.php`, `DemoProductPhotos.php`.
- `database/migrations/2026_11_16_161709_create_demo_fixtures_table.php`.
- `database/seeders/LubosMartDemoSeeder.php`.
- `database/demo/assets/catalog.svg`, `evidence.png`, `README.md`.
- `database/demo/assets/photos/`: 38 JPEG photographs, source/checksum manifest,
  product-to-photo mapping, attribution document and deployable credits HTML.
- `scripts/demo-backup.php`, `demo-local-check.php`, `demo-audit.php`.
- `tests/Feature/Database/LubosMartDemoSeederTest.php`.
- `tests/Frontend/demo-qr-check.cjs`.
- `documentation/deployment/DEMO_ENVIRONMENT.md`, `DEMO_PREPARATION_RESULTS.md`.

The only existing tracked file edited by this task is `.env.example`. No normal
routes, controllers, models, UI components, operational configuration rows, or
previously applied business migrations were modified. One additive fixture registry
migration was applied locally. The existing mixed working tree was preserved.
