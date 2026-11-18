# Documentation cleanup review - November 17, 2026

This is a documentation-only local batch. No application tests, builds, migrations, seeders, deployments, service restarts or production connections were run. Nothing was staged, committed, pushed, merged or published. Existing mobile/application changes remain separate and intact; the current branch was left unchanged. The working tree includes ongoing work from outside this documentation batch, so the full Git diff must not be attributed to this cleanup.

## Review groups

1. Navigation and current guidance: concise root README; setup, architecture, workflow and testing indexes; focused Laravel/Flutter/environment guides; finance, scanning/POD, order and voucher guidance. The broken README logo element was removed; website/mobile branding assets were untouched.
2. Historical relocation: dated audits, repairs, handoffs and implementation/verification reports under `archive/reports`, `archive/api`, `archive/deployment` and `archive/ui-audits`. Full finance/scanning composites preserve earlier unique material and results. The [archive inventory](archive/README.md) lists every historical record moved or retained at its original path.
3. Compatibility and corrections: relative links, image paths and source references after moves; corrected frontend paths and role dashboard trace; qualified outdated onboarding, return/refund and POD descriptions in current guides. Technical/role folders remain where useful. Script-referenced Android setup, requirements evidence, CSV templates, generated API contracts and their generator retain their paths/content except necessary Markdown navigation links.

No branch creation, commit or publication is part of these groups. If publication is requested later, `docs/documentation-cleanup` is a suitable focused branch name after reviewing the intended base and pending work. Existing automation may run or deploy after a future push/merge; this cleanup leaves everything local.

## Source checks and limits

- API implementation: `routes/api.php` and `routes/mobile.php` define versioned routes with Sanctum middleware; the new Mermaid diagram replaces the obsolete planned-API explanation. It does not assert live availability.
- Frontend paths: `resources/js/app.tsx`, `tsconfig.json`, `DashboardController` and actual component paths confirm pages/components/layouts under `resources/views` and dedicated role dashboards.
- Delivery: `DeliveryController` requires three forward checkpoints, private proof, recipient name and positive-COD confirmation. The November 14 report's earlier absence of recipient-name requirements remains historical.
- Registration: `RegisterAccount`, `EmailVerificationLinks`, `RegistrationEmailCodes` and `VerifyEmailController` confirm combined application capture and emailed registration codes; old verification links return 410. Buyer activation/legacy approval distinctions follow the existing Buyer/backend guides; onboarding was not exercised.
- Returns: `ReturnWorkflowController` creates version-3 requests and delegates approved credits; the current finance guide consolidates the November 16 contract. Old whole-parcel, consent and reserve gates are retained only as historical explanations. No financial calculations or migration outcomes were rerun.

Live infrastructure, provider configuration, external-service acceptance, full physical-device journeys, MySQL concurrency and accessibility remain unverified by this batch. Older evidence paths may be private/local-only; their availability and old source-line anchors are not recertified.

## Validation

Final read-only checks completed:

- 2,662 local Markdown link/asset targets checked: 2,661 exist; the sole unresolved historical model reference is identified below. No new broken targets remain.
- 14 Markdown heading anchors checked: all resolve. External URLs and historical source-code line anchors were not revalidated.
- All 143 archived records were compared with their tracked originals after normalizing link/path updates and the added historical-status note: no content differences. This includes the full finance/scanning composites.
- New/current/archive Markdown whitespace scan and `git diff --check` passed.
- Reviewed modified guide diffs and the archive inventory. Every write made by this batch targeted Markdown documentation; pre-existing non-documentation diffs belong to separate mobile work. No contracts, generators, CSV templates or branding assets were changed by this batch. Markdown checks cover repository guides and mobile docs, excluding dependency/cache directories and agent skill catalogs. External URLs are preserved without network requests.

One known unresolved historical target is `app/Models/SortingCenter.php#L18` in the October 13 account-creation audit. The absent file is retained as a clearly identified historical reference rather than silently redirected to a different model. Its original findings remain historical.

## Out-of-scope reference

The `.env.example` mail comment references the absent `documentation/accounts/local-email-setup.md`. The environment file was left untouched; the current replacement guidance is [environment and mail setup](setup/ENVIRONMENT.md). This is a pre-existing plain-text configuration comment, separate from the Markdown link check.
