# Project organization and testing roadmap

Documentation organization batch: November 5, 2026 (Asia/Manila).

## Architecture and changes

Laravel remains at the repository root, with its integrated React/Inertia website. Flutter remains under `apps/mobile`. API v1 remains part of Laravel: `routes/api.php` includes `routes/mobile.php`; controllers, validation, authorization, services and database data are shared where implemented. No framework roots, application code, public interfaces, schemas, build configuration or deployment settings were changed by this batch.

The [root guide](../README.md#repository-map) maps the source and setup commands. `documentation` is the canonical guide root; executable tests stay under root `tests` and `apps/mobile/test`. Existing frontend aliases deliberately resolve pages/components/layouts under `resources/views`.

| Previous path | Current path | Treatment |
| --- | --- | --- |
| `docs/requirements/ACCOUNT_CREATION_AUDIT.md` | `documentation/requirements/ACCOUNT_CREATION_AUDIT.md` | Move; retain historical findings |
| `docs/requirements/ACCOUNT_CREATION_TRACEABILITY.md` | `documentation/requirements/ACCOUNT_CREATION_TRACEABILITY.md` | Move; repair path mentions |
| `docs/requirements/ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md` | `documentation/requirements/ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md` | Move; repair path mentions |
| `docs/requirements/ACCOUNT_CREATION_FINAL_REPORT.md` | `documentation/requirements/ACCOUNT_CREATION_FINAL_REPORT.md` | Move; repair path mentions |
| `docs/requirements/evidence/` (eight files) | `documentation/requirements/evidence/` | Move with identical bytes |

Both requirements locations are two directories below the repository root, so existing `../../app`, `../../tests` and other root-relative document links retain their targets. Historical evidence contents, embedded execution paths and original hashes remain unchanged. The UI audit's inbound reference is updated. Empty `docs` is removed only after the move.

The earlier [automated report](AUTOMATED_TEST_REPORT_2026_11_05.md) now identifies its API-readiness paragraph as historical. The [Android report](api/ANDROID_SETUP_2026_11_05.md) records the retained successful debug build log and existing APK. These documentation corrections are not newly executed application checks.

## Preservation and verification

Before the move, 763 tracked/untracked source files were copied with SHA-256 hashes into the ignored local checkpoint `storage/app/organization-checkpoint-2026-11-05-1793836621786`. It contains `source/`, `manifest.json`, `movement-manifest.json`, the original Git status and baseline link findings. The checkpoint includes pending source work without staging, stashing, switching branches or committing. It is a local recovery copy, not an off-machine backup; databases, populated environment files, private uploads, SDKs and build caches are outside its scope and were not modified.

Verification compares all moved evidence against the pre-move hashes and checks every other inventoried source file for unintended changes. Local Markdown targets and new whitespace errors are checked. The pre-move link baseline found one unresolved historical link: the account-creation audit references `app/Models/SortingCenter.php`, which is absent. It remains an explicitly documented historical reference rather than being silently redirected to a different model. Line anchors in historical reports may refer to older code and are not re-certified by path validation.

Application tests and builds are not required for this documentation-only batch under the repository Git workflow rules. No fresh application pass is claimed. A later application-testing phase must first inspect process environment, cached configuration, fixtures and database/storage isolation; use synthetic records and fake external services. Do not treat this checkpoint as a database backup.

Executed batch checks: all 12 files reached their mapped destinations; all eight evidence files matched the pre-move SHA-256 hashes; comparison of the 763-file source inventory found no unintended changes. Of 2,059 local Markdown links checked, no new broken targets were found; the one historical model reference above remains unresolved. New-line whitespace validation and `git diff --check` passed. Git emitted a CRLF-to-LF normalization notice for the edited UI audit. Machine-readable results are retained as `verification.json` beside the checkpoint manifest.

For rollback, compare against the checkpoint first and restore only this batch's changed documentation; move `documentation/requirements` back to `docs/requirements` only after checking neither destination contains newer work. Do not restore the full source checkpoint over subsequent application changes. Retain the evidence-hash verification results with the checkpoint.

## Testing order and acceptance

| Order | Area | Required scenarios |
| --- | --- | --- |
| 1 | Isolated baseline | Disposable database/uploads; no live mail or production writes; record revision, environment and fixtures |
| 2 | Web identity/access | Registration fields, verification, approval, login/logout, recovery, ownership/role denial and suspension |
| 3 | Web commerce | Catalog/search, wishlist, inventory/variants, cart, addresses, shipping, vouchers, COD checkout, stock conflict and duplicate submission |
| 4 | Web fulfillment/finance | Waybills, pickup/sort/dispatch, proof, COD handovers, settlements, returns and explicit restocking |
| 5 | Supporting web modules | Protected profile changes, support/evidence, reports, notifications and administration |
| 6 | API | Route/contract agreement, bearer/onboarding boundaries, revocation, role/ownership denial, validation/errors, pagination/uploads and web parity |
| 7 | Flutter automation | Analysis, transport/session tests, widgets and native debug build |
| 8 | Physical/environment acceptance | Reachable HTTPS/assets, offline/retry behavior, secure storage, camera/scanner/files/printing, real mail/OAuth and web/mobile consistency |

Use existing Pest, Node and Flutter tooling. Run non-writing lint/format checks and relevant tests/builds for application changes. SQLite results do not establish MySQL locking: use disposable MySQL concurrency tests for checkout stock, custody and financial transitions. Test backup restoration separately. Physical and accessibility acceptance require actual execution, not build success.

Each functional case must record implementation state, steps, expected/actual results, environment/build, evidence, defect and recommended fix. Preserve skipped-test reasons separately.

| Status | Meaning |
| --- | --- |
| Passed | Executed and matched expectations |
| Failed | Executed and contradicted expectations |
| Blocked | A named prerequisite prevented execution |
| Not Tested | No qualifying execution |
| Not Implemented | Confirmed missing capability |

Existing CSVs remain historical working templates: map `Not Run` to `Not Tested`; map device/external-service pending to `Blocked` only when a named prerequisite actually prevents a scheduled test, otherwise `Not Tested`. Do not infer acceptance from source presence or copy aggregate test counts into manual case results.

## Remaining approvals and review groups

Review navigation/status documentation and requirements/evidence relocation as two logical groups. Existing API/Flutter/application changes belong to prior work and remain intact. No generated-file cleanup, application refactoring, database changes or deployment is part of this batch. A future documentation branch such as `docs/project-organization` can be considered when publishing is requested; this batch does not change the current branch or create commits.

Further web acceptance, application fixes, API changes and mobile integration remain separate phases requiring approval. Git publication and deployment require their own explicit instructions. See [Git workflow rules](standards/GIT_WORKFLOW_RULES.md).
