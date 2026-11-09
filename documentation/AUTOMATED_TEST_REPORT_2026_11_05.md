  # Automated verification report

Run date: November 5, 2026, Asia/Manila. Local working tree on `feat/platform-release-ui-onboarding`; existing documentation work preserved. No application business logic, production accounts, configured MySQL data, deployment, commit or push was changed.

## Results

| Check | Result | Evidence / qualification |
| --- | --- | --- |
| Full Laravel backend suite | **1,089 passed; 3 skipped; 0 failures; 8,798 assertions** | Isolated SQLite in-memory database; captured JUnit and console output |
| Registration component tests | **37 passed** | Mocked component harness emits React invalid-element warnings; real browser run is separate evidence |
| Seller/Buyer browser suite | **17 scenarios passed** | Includes checkout, inventory, vouchers, live messages, finance, returns and stale stock protection |
| Account-settings browser suite | **9 scenarios passed** | Includes protected changes, CSRF, keyboard focus, Admin review and registration alerts |
| Logistics browser suite | **19 scenarios passed after stale assertion repairs** | Includes actual form submissions, receipt/sort, assignment, camera fallbacks, simulated barcode decoding and print request |
| Authentication browser suite | **42 scenarios passed after stale selector repairs** | Includes homepage, role registration, OTP, Rider approval/login, password recovery and actual password masking/reveal |
| General dashboard browser suite | **45 scenarios passed after fixture/assertion repairs** | All five roles, navigation, responsive themes and Admin actions; final runtime/console assertions passed |
| TypeScript | Passed | `npx.cmd tsc --noEmit` |
| ESLint | Passed | Full-tree `npx.cmd eslint .`; changed browser scripts checked again after edits |
| Production build | Passed | `npm.cmd run build`; completed before browser suites started |
| Changed-script formatting | Passed | Prettier on the three changed browser scripts; PHP Pint and PHP syntax check on the fixture |

All five browser suites completed successfully: **132 recorded scenarios passed, zero failed in their final runs**. These are scenario counts, not 132 independent requirements or coverage of every possible input. Final JSON snapshots and `browser-summary.csv` were preserved in the dated evidence folder.

The backend's three skipped cases explicitly defer Buyer/Seller/Logistics password-visibility checks to a browser. They remain skipped in backend totals. The authentication browser suite separately verifies real password masking and reveal/rehide; it does not change the backend skip count.

The November 1 report's three backend failures no longer reproduce: the current role dashboard contract and Logistics approval-chain tests already cover the supported behavior. No backend test assertions were changed during this run to achieve the passing backend result.

## Isolation and commands

Before execution, `phpunit.xml`, test bootstrap and browser fixture code were inspected. No cached application configuration was present. The backend process explicitly set `APP_ENV=testing`, a nonexisting temporary config-cache path, empty `DB_URL`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, array mail/cache/session and synchronous queues. The browser harnesses create separate temporary SQLite databases, synthetic accounts and local PHP/headless-browser processes, with fake notifications and external location/OAuth responses.

```powershell
php artisan test --compact --log-junit storage/app/automated-verification-2026-11-05/backend-junit.xml
node --test tests/Frontend/registration-form.test.cjs
npx.cmd tsc --noEmit
npx.cmd eslint .
npm.cmd run build
node tests/Frontend/seller-workspace-browser-check.cjs
node tests/Frontend/account-settings-browser-check.cjs
node tests/Frontend/logistics-operations-browser-check.cjs
node tests/Frontend/auth-browser-check.cjs
node tests/Frontend/dashboard-browser-check.cjs
```

The PHP command above requires the isolated environment described here; do not copy it into a production environment without verifying database configuration.

Raw backend output, JUnit, browser logs and preserved baseline failures are under `storage/app/automated-verification-2026-11-05/`. Browser screenshots/PDFs remain in the respective `storage/app/*-ui-check/` folders. Date fields hard-coded inside older browser JSON may show October dates; this report and captured run logs identify the November 5 execution. These local artifacts are not committed or publicly hosted evidence.

The Seller/Buyer browser log includes one HTTP 401 for `/workspace/status`. Its final runtime/console assertions and process exit passed. This report does not claim every background HTTP response was successful; verify any reproducible unexpected session loss separately.

## Test harness repairs

Initial original-script failures were retained in baseline logs. Repairs made only to tests/fixtures:

- Logistics expected three notifications and five menu entries. Current fixture/UI has four attention items and eight queue entries; corresponding count/icon checks were corrected.
- Homepage seller CTA moved into `.storefront__seller-button`. The test now checks the existing button, nonoverlap with the illustration, compact size and minimum touch height across all sampled widths. Its existing dark-mode text-color check was retained against the current button.
- Dashboard cart confirmation changed from `Cart updated` to `Added to cart`; the Logistics queue control is now the notifications button. Admin notifications contain five destinations.
- The dashboard's synthetic Logistics account lacked the approved registration application required by the account policy. The fixture now creates it, preserving application authorization rather than bypassing the policy.
- Prettier normalized the modified authentication script.

These repairs permit the current behavior to be tested. They are not application feature fixes and do not establish complete coverage of every action.

## What the results mean for the manual guide

Automated evidence now supports checkout/stock, role boundaries, ordered custody, finance/returns and account verification in the covered local paths. The [36-case black-box sheet](BLACK_BOX_TEST_RESULTS.csv) remains a manual acceptance register: its rows still start Not Run. A browser scenario or backend test does not necessarily execute every step/negative variant in a manual row, so cases were not automatically marked Pass.

Use [the guide](BLACK_BOX_TESTING_GUIDE.md) for your own fresh-account test, particularly:

1. Run one complete five-role journey using separate browser profiles: approvals, purchase, preparation, pickup, receipt/sort, dispatch acceptance, delivery/COD, cash receipt and seller settlement. Confirm each role's view after reload.
2. Print and attach an actual label. Test the phone camera and available scanner against that label; confirm the physical package matches the displayed parcel. A generated PDF and synthetic camera cannot establish this.
3. Confirm actual test proof capture/upload and parcel/cash/return handovers. Use synthetic records and no real payment unless separately arranged.
4. Verify real email/OTP/reset delivery, configured Google callbacks, private storage, queue processing and HTTPS sessions in the intended environment. Fake notifications and OAuth responses cannot establish this.
5. Have the developer perform dedicated concurrent MySQL checkout/custody/finance and rollback tests, plus backup restoration into a disposable database. This run used SQLite; it did not exercise simultaneous production MySQL locking or load.
6. Complete screen-reader, keyboard, touch, contrast and 200%/400% zoom acceptance. Sampled responsive/keyboard checks do not certify accessibility compliance.

There is strong passing local evidence for the covered core logic. Production and physical acceptance remain incomplete. Passing counts are not a project-completion percentage or permission to deploy.

## API readiness

Historical scope: the paragraph below describes the state at this verification run. Subsequent November 5 work implemented the versioned mobile API and Flutter client; see the [later verification report](api/MOBILE_COMPLETION_2026_11_05.md) and [current API guide](api/README.md). The earlier results above are preserved and have not been rerun by the documentation organization task.

Sanctum and account JSON endpoints are already implemented; the API overview was corrected to reflect this. A complete versioned marketplace/mobile API is still planned. See [the incremental API plan](api/INCREMENTAL_API_PLAN.md) for concrete batches and their acceptance criteria. No API routes, token-login behavior or architecture were changed by this testing task.
