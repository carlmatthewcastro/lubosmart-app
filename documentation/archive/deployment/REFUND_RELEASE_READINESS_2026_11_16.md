> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Refund release readiness — 2026-11-16

The tested Azure candidate was deployed with explicit user authorization on November 16, 2026 at 18:55 Philippine time (10:55 UTC). All 13 pending production migrations completed. App and queue run the verified image below; database, Caddy and storage volumes were preserved.

## Live deployment result

### Frontend correction at 21:41 Philippine time

The first deployed image incorrectly retained the old frontend bundle. A CRLF-sensitive `sed` filter failed to remove `public/build` from the prepared Docker ignore file. HTTP health checks and backend smoke tests did not detect this mismatch. The user's report prompted comparison of public HTML, the running manifest and the uploaded candidate archive; the live manifest lacked the new wallet entry.

Corrected runtime image: `lubosmart-refund-candidate:20261116-assets`, ID `sha256:e54f8833d3ea6fec762810430cb0dbe4e8f2a8fe192ef9ed377d6430cc9a17f7`. This image adds the already uploaded candidate's compiled frontend to the same backend. Both app and queue now use it, and the live Compose override is updated. No further database migration was needed.

Public HTML now references `app-CYu0Zeye.js` instead of `app-Cb65rv6j.js`. The public app bundle SHA256 matches the image (`a1742421eeae76aff763d23e9aa3e191be085ce638a329e78e1cd3cb064fd573`). New returns and wallet bundles return HTTP 200, as does `/up`; no failed queue jobs were found. Production release checks passed again. An explicit Dockerfile-specific ignore file now includes built frontend assets without relying on line-ending-sensitive generation. GitHub publication remains pending.

- Production `returns:release-check --production`: passed, zero pending migrations.
- Historical credit reconciliation, read-only: zero cases requiring review or posting.
- Public HTTPS `/`, `/login` and `/up`: HTTP 200 after cutover.
- Queue restarted on the same candidate image; no failed jobs found.
- Production caches rebuilt; maintenance mode lifted after successful checks.
- Candidate selection persisted in the live `docker-compose.override.yml`. Normal Compose commands retain this image and secure cookies. Do not rebuild or retag the release image in place.
- The live host source checkout was not replaced. Runtime code comes from the tested image; use the recorded override when managing containers. GitHub publication is recorded separately from deployment.
- Compared 696 application, frontend, route, config, migration and public files with the tested candidate source archive: no changes before GitHub publication.

GitHub publication follow-up: the user authorized the full tested web release on `feat/platform-release-ui-onboarding`. Three existing formatting failures in cart CSS, the cart page and the shared sheet component were corrected before publication; this formatting cleanup is not a new runtime image. Fresh checks passed: **1,345 Laravel tests, 3 skipped, 11,787 assertions**, TypeScript, changed-source ESLint, PHP Pint and production build. The pre-existing accidental README edit is excluded and preserved locally. Native mobile source, private data, environment files, uploaded files and backups are excluded.

Fresh cutover recovery copies are in remote candidate folder `backup-cutover-20261116T105437Z/`. Matching downloaded copies are in local private backup folder as `cutover-database.sql` and `cutover-uploads.tar.gz`. Database: 732,685 bytes, SHA256 `d3bcb154b7106055b191b4a93a77d638c5aa385d240455f2d2ee27fecfe69c4a`. Uploads: 14,170,684 bytes, SHA256 `7d2fbad1043de193be547108b3648270f086c3eea0fc2c3bcd323950f211cdef`. Previous image and Compose file are retained alongside those remote backups. The earlier readiness evidence below records the rehearsal preceding this authorized cutover.

## Verified candidate

- Azure folder: `/home/azureuser/lubosmart-release-candidates/refund-20261116`.
- Image: `lubosmart-refund-candidate:20261116`.
- Image ID: `sha256:d34b0203b67e49082320cde12f1ed6441f670987b6757bdae7fa9ac0cd46a283`.
- Pinned runtime base ID: `sha256:5dea0606afdc0d23e5befcba0297745ef2a898c936b31dd1ab81bce10a204ab6`.
- Local and live `composer.lock` SHA256 matched: `cbb84e2a88474b007a9400f50704fd62ef498174bfdc6419a35227e53804afe2`.
- PHP 8.3.36; isolated MySQL 8.4.11. No development Composer packages were required.

The VM has limited memory, so the candidate used verified existing runtime dependencies and locally compiled assets through `docker/Dockerfile.prepared`. The original uploaded source archive was supplemented with the reviewed Docker ignore/cache fixes before building. The image ID identifies the tested result. Never reuse this build method after a dependency-lock change without installing and validating those dependencies.

Build contexts now exclude local tools, mobile sources and Laravel bootstrap caches. Prepared builds clear cached manifests before package discovery. PHP permits a 32 MB request with a 5 MB per-file limit, accommodating five return photos plus form overhead. Compose enables secure session cookies for both application and queue.

## Evidence

| Check                                                          | Result                                                                                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing full Laravel suite, before readiness additions        | 1,342 passed, 3 skipped; 11,777 assertions                                                                                                                            |
| Readiness command, refund workflow and populated upgrade tests | 26 passed; 315 assertions                                                                                                                                             |
| Existing independent database concurrency checks               | 3 passed                                                                                                                                                              |
| Existing rendered browser acceptance                           | 7 passed                                                                                                                                                              |
| Production asset build                                         | Passed; existing runtime asset URL warnings remain                                                                                                                    |
| PHP formatting and Compose formatting                          | Passed                                                                                                                                                                |
| Local migration rehearsal and application migration            | Passed; 69 original non-transient tables unchanged                                                                                                                    |
| Production-backup upgrade in isolated MySQL                    | All source migrations applied; 57 original non-transient tables unchanged                                                                                             |
| Candidate `returns:release-check --production`                 | Passed; zero pending migrations and zero uncredited historical cases in production copy                                                                               |
| Candidate runtime refund smoke test                            | Immediate credit, spending before collection, both handovers/proofs, seller receipt/restock, duplicate prevention, wallet failure rollback, no-return approval passed |
| Candidate HTTP `/up` and `/login`                              | Both HTTP 200 inside isolated container                                                                                                                               |

The smoke test used synthetic accounts, disabled outbound mail and an internal Docker network; synthetic database changes were rolled back. It did not exercise a real payment or message a customer. Automated checks do not establish full accessibility compliance; manual camera/device and accessibility limits remain in the [UI audit](../ui-audits/RETURN_REFUND_WORKFLOW_UI_AUDIT_2026_11_16.md).

Local historical approvals with incomplete terms remain for admin review; no amounts were inferred or credits applied. The production database copy had no such uncredited cases. Re-run the read-only reconciliation at actual cutover because live data can change.

## Recovery copies

With explicit user approval, a consistent live database dump and copies of private/public uploads were created and restored into separate staging volumes. No live volume was attached to staging. Copies were downloaded over SSH and their SHA256 hashes matched.

Remote directory: candidate folder `backup/`. Local private, Git-excluded directory: `storage/app/private/backups/azure-refund-20261116/`.

| File             | Bytes      | SHA256                                                             |
| ---------------- | ---------- | ------------------------------------------------------------------ |
| `database.sql`   | 743,296    | `e383ea355d6aecd8833479ac0a9b9ae281e0a8259f055a8f8f6a658da35969ca` |
| `uploads.tar.gz` | 14,170,684 | `7d2fbad1043de193be547108b3648270f086c3eea0fc2c3bcd323950f211cdef` |

These files contain customer data and must remain private. Refresh recovery copies at deployment after pausing writes. The staging web/database containers are stopped; staging volumes, image and recovery copies are retained. Live application, queue, Caddy and database containers remained running.

## Reviewed cutover sequence

1. Obtain explicit authorization to deploy this candidate. Verify its image ID and the current live Compose project, storage volumes and configuration. Preserve the previous runtime image and configuration. Do not include unrelated working-tree changes in publication.
2. Use the existing live Compose file at `/home/azureuser/lubosmart-app/docker-compose.yml` with a reviewed copy of `docker/refund-release.override.yml` as the second file, keeping the live application directory and project name. This preserves the existing `.env`, Caddy paths and named volumes while selecting the candidate and secure cookies for app/queue. Validate the resolved configuration privately without printing secrets. Do not use the candidate context's Compose file as the base: its relative `.env` is intentionally absent.
3. Enter maintenance mode, stop the live queue, drain in-flight writes, and refresh database/upload recovery copies. Keep maintenance active throughout schema and image changes.
4. Using the two Compose files and the live configuration, run the candidate's `php artisan migrate --force` in a one-off app container without starting dependencies. Never use `migrate:fresh`, database reset or destructive rollback.
5. Run candidate `php artisan returns:release-check --production` and `php artisan returns:reconcile-refund-credits` in default read-only mode. Resolve failures before opening traffic. Review any historical financial exceptions explicitly; never blindly apply reconciliation.
6. Recreate only app/queue with the candidate using `--no-build`; preserve database, Caddy and storage volumes. Clear stale optimization caches and rebuild production caches with the live environment. Confirm the release check again and bring the app out of maintenance when ready.
7. Verify HTTPS health/login, secure cookies, private proof access and all affected roles. Monitor application/queue errors and failed jobs. Preserve the refreshed backups and tested image identifiers in the deployment record.

The schema change is forward-only. Do not assume the previous app image is compatible after migration. On a failed cutover, retain maintenance and investigate; any database/upload restoration requires a deliberate recovery decision and handling of writes since the backup.

The readiness rehearsal itself did not change live production. The subsequent authorized deployment is recorded above. No merge into Git `main` is implied by deployment.
