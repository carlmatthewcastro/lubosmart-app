# Logistics / Rider connection verification

Checked locally on 2026-10-22 (Asia/Manila), on the existing working tree.
This is local verification; no deployment was performed.

## Connection findings

The operational flow is connected: company approval and Rider coverage govern
assignment; the assigned Rider confirms pickup; Logistics receives and sorts;
Logistics prepares dispatch; the Rider accepts custody and completes delivery
with private proof and full COD; Logistics verifies cash and Admin reconciles.
Reasoned failed attempts, hold/retry and return-to-center decisions retain history.
Reports, tracking lookup, notifications and conversations apply role/center scope.
Rates, sorting, application decisions and company administration belong to
Logistics; they are not actions a Rider should be able to perform.

Demo fixes made in this review:

- New out-for-delivery samples now include synthetic prepared/accepted dispatch
  evidence. Without it, the return-to-center action incorrectly treated a seeded
  sample as being in center custody. A feature test now exercises Rider failure,
  Logistics return request and scanned return receipt on command-generated data.
- The dedicated seeder now privately saves newly created company credentials,
  alongside its existing Rider credentials. It warns when an older company has
  no saved owner login. It never resets existing passwords. A feature test checks
  the saved login against the password hash and confirms preservation on rerun.
- Demo command output includes exact tracking references. The walkthrough now
  includes dispatch acceptance, actual proof/COD requirements, cash discrepancy,
  exceptions, coverage, rates, account management, messages and reports.

## Validation

- Initial broad PHP regression: **301 passed, 1 skipped, 2 failed**, 2,562
  assertions. This includes Logistics, Rider workspace, approval-chain,
  marketplace, registration and Rider settings tests.
- Changed demo/workspace tests after the functional fixes: **11 passed**, 229
  assertions.
- Final operational regression after the fixes (Logistics, Rider workspace,
  marketplace, Logistics/Rider registration and Rider settings): **280 passed,
  1 skipped**, 2,346 assertions. The skipped registration case requires separate
  browser verification. This run excludes the legacy approval-chain file below.
- Current account settings and Rider settings suite: **40 passed**, 168 assertions.
- Logistics operations browser run: **14 checks passed**, including actual
  receipt/sorting submissions, tracking lookup, notifications, scanner navigation,
  manual evidence, mobile reflow, camera fallbacks/capture, offline feedback and
  waybill print request.
- Rider-only dashboard browser run: **9 checks passed**, including workflow
  navigation, settings save, mobile/tablet/landscape, dark mode, account menu,
  validation and no browser runtime/console errors.
- TypeScript, targeted logistics/rider ESLint, PHP Pint for the four changed PHP
  files, and the production build passed.
- The configured local demo command for account 35 / center 2 succeeded,
  preserving its five existing parcels and their progress. No demo deliveries or
  cash collections were completed in the configured database during this audit.

The two broad-suite failures are existing tests in
`tests/Feature/LogisticsApprovalChainTest.php`:

1. `logistics business changes block linked riders and reapproval reuses the same center`
2. `replacing an approved partner ID creates private documents and requests the correct re-review` (Logistics case)

Both attempt Logistics changes through `/settings/profile`. The current
`ProfileUpdateRequest::authorize()` intentionally rejects that route for Logistics
to enforce the account API/OTP boundary; both receive HTTP 403. The newer
account settings suite passes. The legacy tests were left intact; do not describe
the entire repository suite as green.

The combined Rider/Logistics dashboard browser run also remains unsuccessful:
its company settings fixture lacks an approved registration application and
receives HTTP 403 from `/api/account/settings`; it later expects the removed
`Open logistics queues` control. The dedicated Logistics operations and Rider-only
browser runs above pass. No application access check was weakened to satisfy
these older fixtures.

Browser evidence is under `storage/app/logistics-operations-ui-check/` and
`storage/app/dashboard-ui-check/`. The scripts hard-code an older `date` metadata
value in their JSON output; the verification date for this run is 2026-10-22.
Browser fixtures use disposable SQLite data and fake notifications. Actual
printer/scanner hardware, phone cameras, simultaneous MySQL devices and full
accessibility acceptance remain unverified.

## Demo and scope limits

Use [the demonstration guide](LOGISTICS_DEMO.md) for sample IDs, private login
locations, function-by-function steps and expected results. GPS routing, automated
pickup claiming, batch manifests, payouts and complete return-to-seller/refund/
restocking remain outside implemented functionality. See the
[implementation acceptance report](standards/LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md).
