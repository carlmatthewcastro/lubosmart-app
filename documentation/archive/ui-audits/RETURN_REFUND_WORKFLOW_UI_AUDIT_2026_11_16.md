> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Return/refund workflow verification — November 16, 2026

See the [implementation and rollout report](../reports/RETURN_REFUND_REPAIR_2026_11_16.md) for causes, file inventory, migration/reconciliation commands and exact demonstration steps.

## Verified behavior

- Buyer partial request, combined admin decision, immediate coin history/balance, Logistics assignment, same-rider collection and seller delivery through actual facility receipt, seller confirmation and discrepancy all exercised through rendered Inertia pages.
- Browser proof is captured through the existing camera component using a simulated Chrome camera, then persisted through actual multipart requests. No hardware camera acceptance is claimed.
- Buyer balance remains unchanged after assignment, delivery, seller receipt and discrepancy. The Laravel feature test separately spends the credited balance through the real checkout endpoint before collection.
- Browser field validation is visible, loading/upload text is provided, inputs survive recoverable failures, optional empty proof does not block assignment/receipt, and server success precedes closing the form.
- Light/dark screenshots and horizontal-reflow assertions at 320, 768 and 1440 pixels cover approval, wallet, Logistics, seller receipt and final buyer details. Long forms scroll inside shared dialogs and include a footer Cancel action.
- The final keyboard run checks Tab containment, Escape close/focus restoration and Enter reopening of the buyer request dialog.

## Results and artifacts

| Check | Actual result |
| --- | --- |
| Full Laravel regression suite | **1,342 passed, 3 skipped; 11,777 assertions** |
| Final return/finance/API/populated-upgrade checks | **94 passed; 1,420 assertions** |
| Independent MariaDB race checks | **3 passed** |
| Rendered browser acceptance | **7 checks passed**, zero uncaught browser exceptions |
| Targeted ESLint | Passed |
| TypeScript `tsc --noEmit` | Passed |
| Targeted Prettier check | Passed |
| PHP Pint checks | Passed |
| Production build | Passed; warnings remain for runtime-resolved marketplace/category asset URLs |

The three skipped suite cases are existing manual password-masking workbook checks: TC-BUY-020, TC-SEL-018 and TC-LOG-018. No passing result is claimed for those checks.

Verified MySQL/MariaDB concurrency scenarios: repeated simultaneous approval posts one wallet credit and one task; simultaneous reconciliation posts one credit; competing partial requests reserve the last eligible unit once. Generated race schemas were removed after the isolated runs. The independent temporary MariaDB server was shut down after verifying its data directory.

Browser evidence is under `storage/app/refund-ui-check/`, including `results.json`, approval-dialog, wallet-before-collection, Logistics, seller-receipt and buyer-after-receipt screenshots. These artifacts contain synthetic records. Full-suite JUnit output is under `storage/app/refund-full-tests.xml`.

## Remaining verification limits

Automated checks do not establish WCAG 2.2 AA compliance. Screen-reader behavior, comprehensive contrast measurement, actual device camera/location behavior, true 200%/400% text zoom and real-user performance measurements remain manual verification. Narrow viewport reflow is verified, not a substitute for those checks.

Current browser acceptance uses `refund-browser-check.cjs`. The older finance browser harness includes retired offer/consent scenarios and was not treated as validation of the replacement return workflow.

The local application database is now backed up and migrated. Production migration rehearsal and candidate runtime checks passed against an isolated Azure copy; live activation remains pending authorized deployment. See the [release readiness record](../deployment/REFUND_RELEASE_READINESS_2026_11_16.md). Historical local approvals with incomplete or contradictory financial terms require admin review; the production copy had zero uncredited cases. The shared local MariaDB disconnected during the first race attempt; its generated disposable schema may remain, as identified in the implementation report. Later database race verification uses an independent temporary server.
