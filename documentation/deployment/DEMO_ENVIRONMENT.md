# LubosMart demonstration environment

This is an opt-in database preparation workflow. It does not deploy, replace the UI,
change business rules, or implement the Rider application. Use only an isolated
demonstration database/site. The five primary accounts are fixtures, not application
authorization rules. Existing passwords and Google associations are never replaced.

## Local preparation

From the repository root in PowerShell, with the existing private `.env` retained:

```powershell
php scripts/demo-backup.php
php artisan migrate --path=database/migrations/2026_11_16_161709_create_demo_fixtures_table.php --no-interaction
php artisan lubosmart:demo-provision-primary
php artisan lubosmart:demo-preflight
php artisan db:seed --class=LubosMartDemoSeeder --no-interaction
php artisan lubosmart:demo-photos
php artisan lubosmart:demo-verify
php artisan storage:link
php scripts/demo-local-check.php
php scripts/demo-audit.php .tools/demo-backups/BACKUP_DIRECTORY/record-fingerprints.json
node tests/Frontend/demo-qr-check.cjs
```

Replace `BACKUP_DIRECTORY` with the directory printed by the backup script. The
backup includes a database dump, runtime public/private uploads, checksums and row
fingerprints under ignored `.tools/demo-backups/`. It excludes historical browser
profiles and build checkouts in `storage/app`. Do not publish the backup. The audit
reruns the seeder and compares ID-bearing business rows, including inventory and ledgers.
The original-baseline comparison identifies expected primary-wallet changes and
reports volatile session differences separately; it does not restore old sessions.

The local smoke check creates one additional fictional buyer through the actual
registration validation, email-code verification, approval and checkout services.
It suppresses messages, uses the actual geographic service, authenticates generated
accounts through `/api/v1/auth/tokens`, retrieves `/api/v1/me` and Rider deliveries,
and revokes its temporary tokens. It leaves the new buyer purchase pending. It is
local-only and must not run on Azure. Network sandbox restrictions can prevent the
geographic lookup; do not replace actual locations with fabricated responses.

Private files, all excluded from version control by `storage/app/private/.gitignore`:

- `storage/app/private/demo/DEMO_GUIDE.md`: account credentials and parcel walkthrough.
- `storage/app/private/demo/lubosmart-credentials.json`: canonical generated passwords.
- `storage/app/private/demo/lubosmart-guide.json`: stores, products, addresses, rates,
  primary accounts, order references, return tasks and eligible new-refund order.
- `storage/app/private/demo/local-check-results.json`: local registration/API results.
- `storage/app/private/demo/idempotency-results.json`: rerun and preservation audit.
- `storage/app/private/demo/qr-labels/`: generated QR fixtures and verification result.

Unix files are written with mode 0600. On Windows restrict both private directories
to the owner and SYSTEM, including their children (Apache must run as an allowed
identity). From PowerShell:

```powershell
$demoOwner = (Get-Acl -LiteralPath .).Owner
foreach ($demoPrivateRoot in @('storage/app/private/demo', '.tools/demo-backups')) {
    icacls $demoPrivateRoot /inheritance:r /grant:r "${demoOwner}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' /Q
    Get-ChildItem -LiteralPath $demoPrivateRoot -Recurse -Force | ForEach-Object {
        icacls $_.FullName /inheritance:e /Q
    }
}
```

## Fixtures and operational prerequisites

The master seeder creates 2 riders, 4 sellers, 9 buyers, 45 products, 10 vouchers,
33 orders, 6 return/refund cases and 30 reviews. The optional local smoke check adds
one buyer and one pending order, bringing demonstration totals to 16 supplementary
accounts and 34 orders. Existing unrelated accounts/orders are retained.

Primary account retention:

| Role | Email | Local existing ID |
| --- | --- | --- |
| Administrator | ymkze.xviii@gmail.com | 22 |
| Logistics | elzmatthew18@gmail.com | 35 |
| Rider | villanuevajayward2005@gmail.com | 48 |
| Buyer | ongp1165@gmail.com | 47 |
| Seller | palconanallianah@gmail.com | 46 |

IDs are discovered by email on each target; these local IDs are never imposed on an
existing deployed database. Primary password login remains unverified without the
operator's current passwords. No hash recovery or password reset is performed.

Valora remains unchanged under Books and Media. Its nine added products are books.
The four fictional stores are Calios Kusina at Kape, Papel at Pangarap, Bahay Calios
Essentials and Laguna Gadget Corner. Each uses an existing supported department.
The private catalog lists every product, weight, current stock and variation.
Real product photographs and their per-photo credits/licenses are packaged under
`database/demo/assets/photos`; images are served from local public storage rather
than hotlinked. The 38 photographs illustrate 45 fictional listings, so exact
editions, packaging, counts, colors and models may differ. Each product description
includes its photographer/source/license. Public credits are available at
`/storage/demo/catalog/photos/credits.html`. Synthetic historical evidence remains
an original project demo asset, visibly marked as synthetic.
Stores do not have a logo field, so no unsupported logo column is introduced.

Use the existing Flash Express facility owned by the primary Logistics account.
No facility or geographic configuration is created. The compact operational cluster:

| Use | Existing location | Geographic codes | Existing rate |
| --- | --- | --- | --- |
| Seller pickup | Calios, Santa Cruz, Laguna | 043400000 / 043426000 / 043426004 | ₱38 first 1 kg; ₱10 per additional kg; max 20 kg |
| Buyer delivery | Barangay II (Pob.), Pagsanjan, Laguna | 043400000 / 043419000 / 043419013 | ₱38 first 1 kg; ₱38 per additional kg; max 20 kg |

Orders use `ShippingQuotes`, including rounded extra kilograms and pickup coverage.
The existing 500-basis-point commission and 7-day return window are retained. The
₱50 legacy fallback remains configured but is not used while logistics quotes are
enabled. Voucher amounts/minimums/limits come from approved `shop-vouchers` templates.
No operational rates, coverage, inactive areas or administrator settings are changed.
The geographic service uses PSGC HTTP/cache; an empty `psgc_locations` table alone
does not indicate missing approved shipping configuration.

## Live demonstration and financial behavior

Use the private guide for exact current IDs and tracking references. The primary
Rider has pending pickup assignments, prepared delivery assignments and an assigned
physical return collection. Delivered history includes clearly synthetic proof.
The same system-generated `LM-...` references power waybill QR/barcode and API lookup.
Local historical scanner checkpoints are simulated workflow evidence, not claims
that a physical camera scanned those parcels.

Start with primary Buyer → Valora → primary Logistics → primary Rider. Print the
existing waybill, perform pickup QR capture, facility receipt/sorting, rider dispatch
acceptance, delivery/POD and COD handover through normal actions. Verify tracking
and administrator finance. Do not scan already-completed checkpoints to repeat a
demonstration. The private guide identifies a delivered order with no refund request
and no review, allowing new buyer actions within its original return window.

Fourteen historical orders are delivered; remaining orders stay at actionable
preparation/pickup/facility/dispatch/delivery stages, with a cancellation and a
refund-funded Coins purchase. Synthetic cash stages include collected COD, rider
handover declarations, Logistics receipt, Admin reconciliation, product-cash
remittance and paid seller settlements in new stores. All are database evidence;
the application initiates no external transfer. Existing Valora settlement holds
remain effective and are not bypassed to manufacture a paid example.

Six refund scenarios cover pending review, credited refund with approved transport
awaiting assignment, assigned return collection, completed seller receipt/refund,
rejection, and return delivery to the seller awaiting rider dispatch. Refunds credit Coins immediately through current services; physical
transport has its own `return_tasks` status. Return fees/compensation are unseeded
because no approved amount exists. Wallet credits/debits and inventory restoration
are produced by normal services. Never assign a direct synthetic wallet balance.

Reruns skip fixture creation and never rewind live progress, replenish spent stock,
reissue credentials, extend vouchers or reset return windows. Time-limited scenarios
will naturally expire. Review an expired demonstration rather than altering history.
Missing fixture records or changed account eligibility stop the run.

## Missing deployed primary accounts

GitHub does not transfer database users, password hashes, profiles, uploads or OAuth
links. Live deployed account presence has not been inspected in this task. After
authorized deployment to the isolated demo environment, run the read-only account
audit first. Existing accounts are never updated, even when their role/status differs.

For a missing account, prepare a private JSON object keyed by its designated email.
Supply its current known password and confirmation, and the normal registration
fields required by `RegisterAccountRequest`. Document fields contain absolute paths
to private uploads inside the `app` container. Never place this file in Git/public
storage or pass credentials as command-line arguments.

```bash
docker compose exec app php artisan lubosmart:demo-provision-primary
docker compose exec app php artisan lubosmart:demo-provision-primary --input=/var/www/html/storage/app/private/demo-provision.json
# Only after reviewing missing identities and explicitly authorizing provisioning:
docker compose exec app php artisan lubosmart:demo-provision-primary --input=/var/www/html/storage/app/private/demo-provision.json --apply
```

Non-admin accounts use actual registration validation/services and remain subject
to email verification and normal approval. The CLI sends no verification message;
use normal sign-in/resend afterward. The missing Administrator has no public signup:
its private entry requires `name`, `password`, `password_confirmation`, and the
explicit `--apply` invocation bootstraps that designated admin only. A role conflict
is reported for operator review. Primary provisioning does not fabricate a logistics
facility or service rates; finish approved operational setup before seeding.

If original local user IDs, exact hashes, profiles and associated records must all
transfer, use the private full database/upload backup in a separately authorized
restore into an empty isolated database, retaining the original private `APP_KEY`
for encrypted attributes. Test that restore first. Do not import local accounts over
an existing deployed customer database or remap existing IDs. This task does not
authorize restoring or replacing Azure data.

## Review and commit preparation

Read `documentation/standards/GIT_WORKFLOW_RULES.md` before Git operations. The working
tree also contains pending UI, API, finance, wallet and return-workflow changes.
These seeders depend on the latest local workflow code/migrations; a seeders-only
commit on an older remote revision is insufficient. Review those prerequisites as
separate logical commit groups before one consolidated release. No commit/push was
performed by this task. A suitable branch for this work is `feat/demo-database-seeding`;
do not switch or move the mixed working tree without reviewing it first.

After approval of the branch/base, stage only this task's paths:

```powershell
git status --short --branch
git diff --stat
git add -- app/Services/Demo database/demo config/demo.php .env.example database/seeders/LubosMartDemoSeeder.php database/migrations/2026_11_16_161709_create_demo_fixtures_table.php app/Console/Commands/DemoPreflight.php app/Console/Commands/DemoProvisionPrimary.php app/Console/Commands/DemoVerify.php app/Console/Commands/DemoPhotos.php scripts/demo-backup.php scripts/demo-local-check.php scripts/demo-audit.php tests/Feature/Database/LubosMartDemoSeederTest.php tests/Frontend/demo-qr-check.cjs documentation/deployment/DEMO_ENVIRONMENT.md documentation/archive/deployment/DEMO_PREPARATION_RESULTS.md
git diff --cached --check
git diff --cached
git commit -m 'feat(demo): prepare interconnected marketplace demonstration fixtures'
# Only after an explicit push request and reviewed destination:
git push -u origin feat/demo-database-seeding
```

Never stage private storage, `.tools`, `.env`, SQL dumps or credentials.

## Future Azure / Docker commands — do not execute without deployment authorization

Actual Compose services are `app`, `queue`, `db` and `caddy`; persistent application
uploads use `app-storage`. The deployment checkout location and SSH identity are
operator-specific and have not been verified. Run the following from the existing
VM checkout after selecting the reviewed, approved release commit. Stop on errors.
Do not assume local pending changes have reached GitHub.

Privately set `LUBOSMART_DEMO_ENABLED=true` in the demo deployment's existing `.env`,
alongside `APP_ENV=production`, HTTPS `APP_URL`, `DB_HOST=db`, and existing secrets.
Recreating app/queue below loads the changed environment. The flag permits manual
CLI seeding; startup does not invoke a demo seeder.

```bash
set -euo pipefail
umask 077
: "${release_commit:?Set release_commit to the reviewed release SHA}"
git status --short
# Resolve pending VM changes before continuing.
git fetch origin
git show --stat "$release_commit"
git switch --detach "$release_commit"
docker compose config --quiet
backup_dir="$HOME/lubosmart-private-backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
docker compose exec app php artisan down --retry=60
docker compose stop queue
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --user=root --single-transaction --no-tablespaces --routines --triggers --events --hex-blob "$MYSQL_DATABASE"' > "$backup_dir/database.sql"
docker compose exec -T app tar -C /var/www/html/storage/app -czf - public private > "$backup_dir/uploads.tar.gz"
test -s "$backup_dir/database.sql"
tar -tzf "$backup_dir/uploads.tar.gz" > "$backup_dir/uploads-list.txt"
sha256sum "$backup_dir/database.sql" "$backup_dir/uploads.tar.gz" > "$backup_dir/SHA256SUMS"
# Copy the private backup off the VM through the established secure backup channel.
# Validate restoration in an isolated database before applying irreversible migrations.
docker compose build app
docker compose up -d --no-deps --force-recreate app
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan migrate --force
docker compose exec app php artisan lubosmart:demo-provision-primary
docker compose exec app php artisan lubosmart:demo-preflight
# STOP if a primary identity or an approved configuration is missing.
# Run only with separate explicit authorization to seed this deployed demo database:
docker compose exec --user www-data app php artisan db:seed --class=LubosMartDemoSeeder --force
docker compose exec --user www-data app php artisan lubosmart:demo-photos
docker compose exec app php artisan lubosmart:demo-verify
docker compose exec app sh -c 'test -L public/storage || php artisan storage:link'
docker compose exec app sh -c 'test -f database/demo/assets/photos/sources.json && test -f database/demo/assets/evidence.png && test -d storage/app/public/demo/catalog/photos'
docker compose exec app php artisan optimize
docker compose up -d --no-deps --force-recreate queue
docker compose exec app php artisan up
docker compose ps
curl --fail --silent --show-error https://lubosmart.app/up
curl --fail --silent --show-error https://lubosmart.app/api/v1/products > /dev/null
curl --fail --silent --show-error -I https://lubosmart.app/storage/demo/catalog/photos/credits.html
docker compose logs --tail=50 app queue
```

Run the seeder as `www-data` so private evidence and credentials remain readable by
the application and shared queue worker. Do not make private uploads world-readable.

If any step fails, retain maintenance mode and the backup while diagnosing it.
Do not automatically roll back irreversible migrations, wipe data, remove volumes
or restore a backup over existing records. Do not use the existing RiderDemoSeeder:
it creates a separate synthetic facility and owner, contrary to this preparation.

## Google and Rider acceptance after deployment

Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` private. Register exactly
`https://lubosmart.app/auth/google/callback` with the provider and set
`GOOGLE_REDIRECT_URI` to the same URL. For local provider testing use the application's
actual local hostname consistently; its configured callback currently points to
production. Do not expose OAuth secrets in screenshots or logs.

1. Open the deployed site in a fresh browser profile. Sign in with a new Google
   identity, choose Buyer, supply required identity/address details, verify email
   and obtain normal administrator approval.
2. Browse Valora and another demo store, select a variation, change quantity, save a
   supported delivery address and inspect shipping. An unsupported area must fail.
3. Apply an eligible public voucher and available Coins; place the order. Confirm
   seller receipt, stock decrement, buyer tracking and financial totals.
4. Authenticate the primary Rider through `POST /api/v1/auth/tokens`, supplying the
   current password privately. Use its returned bearer token for `GET /api/v1/me`,
   `GET /api/v1/deliveries` and `GET /api/v1/returns`. Revoke the test token afterward.
5. Scan the real generated waybill QR on a phone, complete only an actionable
   assignment, capture fresh POD and verify buyer/admin updates. Never treat a QR
   lookup as a physical custody confirmation.
6. Use an eligible delivered purchase to submit a review or refund request, approve
   through the existing workflow and verify Coins plus separate return transport.

Real Google provider login, deployed database/account checks, physical phone capture
and Azure MySQL 8.4 execution remain unverified until these steps are performed.
