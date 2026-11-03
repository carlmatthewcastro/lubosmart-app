# Frontend development handoff

Updated November 3, 2026 (Asia/Manila). Shared base branch:
`feat/platform-release-ui-onboarding`.

## Get the shared version

For a fresh checkout:

```powershell
git clone --branch feat/platform-release-ui-onboarding https://github.com/carlmatthewcastro/lubosmart-app.git
cd lubosmart-app
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
```

Configure your own database and mail settings, then run:

```powershell
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
composer run dev
```

Open http://localhost:8000. Use local credentials; environment files, uploaded
documents, database records and generated demo passwords are not shared in Git.
Existing installations must preserve their `.env` and application key, back up
their database before migrations, and install the updated Composer/npm dependencies.
Do not run `migrate:fresh` against an existing database.

Before editing, create a branch from the shared base, for example
`ui/buyer-catalog`. Keep existing work safe when switching branches and open pull
requests back to `feat/platform-release-ui-onboarding` for this collaboration.

## Where to edit

| Location | Purpose |
| --- | --- |
| `resources/views/pages/` | Inertia React pages by role and workflow |
| `resources/views/components/` | Shared UI, navigation, settings and role components |
| `resources/views/layouts/` | Application, authentication and settings layouts |
| `resources/css/app.css` | Shared styles and Tailwind theme tokens |
| `resources/css/storefront.css` | Public storefront styles |
| `resources/js/` | App entry, types, hooks, configuration and client helpers |
| `routes/web.php`, `routes/account.php` | Existing page and mutation contracts |

Read [UI/UX rules](standards/UI_UX_RULES.md) and
[Git workflow rules](standards/GIT_WORKFLOW_RULES.md) before editing.
Preserve LubosMart branding, role authorization, request fields, validation,
approval rules and COD workflows. Reuse the existing shared components.

For role-specific local demo setup, see [Rider demo](RIDER_DEMO.md) and
[Logistics demo](LOGISTICS_DEMO.md). These are local-only sample records.

## Checks before sharing changes

```powershell
npx tsc --noEmit
npx eslint .
npm run format:check
php vendor/bin/pint --test
php artisan test --compact
node --test tests/Frontend/registration-form.test.cjs
npm run build
```

Review mobile and desktop, light and dark themes, keyboard navigation and dialogs
for the pages you change. Builds and automated tests do not prove full accessibility
or production acceptance.

## Known verification limits

The November 3 handoff check reproduced **1,086 passing backend tests, 3 failures,
3 skipped, and 8,766 assertions**. TypeScript, ESLint, Prettier, PHP Pint,
all 37 registration component tests and the production build passed after formatting
cleanup. Browser journeys were not rerun for this handoff.

The [November 1 role audit](ROLE_FEATURE_AUDIT_2026_11_01.md) records three backend
failures: the Logistics dashboard metric count and two legacy Logistics profile
mutation expectations. It also identifies stale browser-script selectors/fixtures.
The registration component tests emit mock-related React warnings.

Physical scanners/printers, live mail and Google OAuth, MySQL contention, complete
accessibility and deployed acceptance remain separate checks. This branch is a
development handoff, not evidence of a production deployment.
