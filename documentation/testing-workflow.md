# Testing branches and local workflow

The development changes are organized as a **stack** of focused branches. Each branch inherits the preceding changes; they are not independent branches from `main`. Existing branch tips and `main` were left unchanged. These branches and commits are local until explicitly pushed.

| Branch | Parent | Focus |
| --- | --- | --- |
| `feat/registration-logistics-schema` | `docs/deployment-guide` | Registration, logistics, COD storage and store department relationship |
| `feat/erp-category-taxonomy` | `feat/registration-logistics-schema` | Hierarchical category import, category checks and tests |
| `feat/checkout-commission` | `feat/erp-category-taxonomy` | Configurable commission snapshots, correct centavo formatting and tests |
| `docs/project-handbook` | `feat/checkout-commission` | Organized guides/schema diagrams, then branded README in a separate commit |

## Test the complete website version

Use the final branch to test all changes together:

```powershell
git switch docs/project-handbook
git status --short
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
composer run dev
```

Open **http://localhost:8000**. Keep your local MySQL server running. Existing local migrations/category imports may already be applied; these commands safely use the migration log and repeatable taxonomy import. For a new installation, follow the root [README](../README.md) first.

Do not regenerate the existing app key, overwrite the populated `.env`, or rebuild the database with `migrate:fresh`. Switching an older code branch does not reverse database changes; test older schema versions in a separate disposable database rather than rolling back your current data.

## Verification commands

```powershell
php artisan test
php vendor/bin/pint --test
npm run build
```

Manual acceptance should cover password and Google authentication, validation errors, logout, mobile layouts and the roles supported by current screens. The checkout action has automated coverage, but a public checkout endpoint/UI is still implementation work. Approval, dispatch, reconciliation and settlement tables do not yet provide operational screens/actions. Follow [release readiness](release-readiness.md) before claiming those workflows are complete.

## Review and merge order

Review the database foundation first, taxonomy second, commission third, documentation last. Compare each branch with its listed parent so a review shows only its focused change. If remote pull requests are created later, use those same bases initially and update them as earlier changes merge. This organization does not deploy or merge anything into `main` automatically.
