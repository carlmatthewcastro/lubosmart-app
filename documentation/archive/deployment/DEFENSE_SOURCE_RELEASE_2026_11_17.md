> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Defense source release — 17 November 2026

Publish finalized application source to `feat/platform-release-ui-onboarding` in
`carlmatthewcastro/lubosmart-app`. This does not authorize Azure deployment.
The authoritative SQL export, upload bundles, credentials guides and verification
reports remain private and excluded from Git. Do not copy the local environment.

## Schema and imported queue review

Read-only inspection found 43 migration records and exactly 43 matching source
files, with no missing or pending migrations. Every migration name is present in
the finalized export. The source database reports MariaDB 10.4.32; Compose targets
MySQL 8.4. Docker/MySQL 8.4 are unavailable locally, so this export has not been
rehearsed on that engine. The earlier refund-release MySQL rehearsal used a
different database snapshot and does not establish this export's compatibility.
Static export inspection found 77 InnoDB tables, `utf8mb4_unicode_ci` and
`utf8mb4_bin` collations, 15 JSON-validity checks, no routines, zero-date values,
or flagged MariaDB-specific table options. No actual import blocker was observed
by this scan; it does not establish engine compatibility.
An isolated MySQL 8.4 import and complete counts/foreign-key verification remain
mandatory before cutover. Do not edit the original export to hide import errors.

All 22 queued payloads match the export. They are Laravel
`Illuminate\Notifications\SendQueuedNotifications` wrappers on the `default`
queue, with zero attempts and no reservation:

| Notification | Count | Purpose |
| --- | ---: | --- |
| `App\Notifications\AccountStatusChanged` | 1 | Email about account access status |
| `App\Notifications\ApplicationReviewed` | 1 | Email about the application decision |
| `App\Notifications\OrderDeliveryUpdated` | 20 | Email about a recorded parcel status |

Their channels are mail only. Reviewed notification code constructs messages and
reads user/profile data; it does not charge, refund, post financial entries or
transition orders. The serialized delivery status may already be stale. Retries
can send duplicate emails if sending succeeds before acknowledgement. Existing
Laravel notification event listeners must also be considered if later changed.

Keep workers and any external supervisor stopped before restoration and through
initial verification. Retain an unchanged protected copy of all payloads; review
recipients and status relevance privately. Obtain an explicit decision to send,
quarantine or discard imported messages in the deployment database only. Do not
run `queue:work`, `queue:listen`, `queue:retry`, `queue:clear`, or delete source jobs.
Prefer quarantine for these historical demo messages; preserve their audit copy.

## Deployment automation

The two checked-in Actions workflows only lint/test on pushes to `main`/`develop`
and pull requests targeting those branches. They do not deploy Azure. GitHub API
inspection returned no repository webhooks and no deployment records, and listed
only these two active workflows. A push to the current feature branch therefore
does not trigger the inspected automation. VM-side polling/supervisors were not
inspected remotely; the existing deployment guide describes manual releases.

## Exact next commands after separate deployment authorization

Source validation: TypeScript, ESLint, Prettier and the production build passed;
49 frontend unit tests passed. The full Laravel run produced 1,366 passed, three
skipped and three failures in obsolete buyer-dashboard assertions. Those test
expectations were updated to the existing four dashboard metrics, preserving
ownership checks; all 30 tests in the affected role-access, buyer-workspace and
dashboard-summary suites then passed. Pint passed for every changed PHP file.
No full-suite rerun followed these test-only corrections. Existing build warnings
concern runtime image URLs; browser/device and accessibility acceptance were not
repeated for this publication.

Run on the established Azure VM. First verify the working directory, clean
checkout, Compose mounts, existing override, image selection and off-VM backup
channel. Stop if there are pending VM edits. Do not run a general `compose up`:
it would also start queue workers. Preserve the existing `APP_KEY`, OAuth secrets,
HTTPS settings and original database. Never run key generation, seeders or
`migrate:fresh` against this finalized database.

```bash
set -euo pipefail
umask 077
cd /home/azureuser/lubosmart-app
git status --short
test -z "$(git status --porcelain)"
docker compose config --quiet
docker compose ps
docker compose exec -T app php artisan down --retry=60
docker compose stop queue
backup="$HOME/lubosmart-defense-backup-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$backup"
cp .env docker-compose.yml "$backup/"
if test -f docker-compose.override.yml; then cp docker-compose.override.yml "$backup/"; fi
docker inspect "$(docker compose ps -q app)" --format '{{.Image}}' > "$backup/app-image-id"
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --events --hex-blob --no-tablespaces "$MYSQL_DATABASE"' > "$backup/database.sql"
docker compose exec -T app tar -czf - -C /var/www/html/storage app/public app/private > "$backup/uploads.tar.gz"
test -s "$backup/database.sql"
test -s "$backup/uploads.tar.gz"
(cd "$backup" && sha256sum database.sql uploads.tar.gz > SHA256SUMS)
# Copy and verify these protected backups off the VM before continuing.
git fetch origin feat/platform-release-ui-onboarding
release_commit="$(git rev-parse FETCH_HEAD)"
# Compare this SHA with the final source-release report before switching.
git show --stat "$release_commit"
git switch --detach "$release_commit"
docker build --tag "lubosmart-defense:$release_commit" .
```

The live override currently documented in `REFUND_RELEASE_READINESS_2026_11_16.md`
pins an older candidate image. Building a new image alone does not select it.
Prepare a reviewed override selecting `lubosmart-defense:<verified-release-SHA>`
for app and queue, but recreate only app after the isolated restore and acceptance
gates. Retain the original override/image for rollback; leave queue stopped.

The private `.tools/defense-final/DEPLOYMENT.md` contains the secure transfer,
isolated-database import, upload hash verification and rollback commands. Use it
with the newly verified source image, not the old pinned candidate. Restore only
to a newly created isolated database, verify every count and foreign key, grant
the existing app identity access, then review switching `DB_DATABASE`. Imported
sessions/cache/security-code state also requires private review. Do not start
workers until the imported notification disposition is explicitly approved.

Required acceptance: all five primary role logins, Rider token authentication and
protected endpoints, checkout/vouchers/Coins, returns/refunds, private evidence
authorization, waybill QR and fresh proof of delivery. Confirm the running
frontend manifest matches this source build. Browser/device acceptance and full
accessibility verification are separate from automated source checks.
