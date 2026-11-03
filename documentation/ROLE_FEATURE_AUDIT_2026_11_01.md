# Role feature audit

Audit date: 2026-11-01, Asia/Manila. Evaluated the current local working tree on
`feat/platform-release-ui-onboarding`, including existing uncommitted and untracked
implementation. This is local evidence, not deployed acceptance or proof that all
111 checklist items work under every condition. No application code or existing
tests were changed by this audit. No commits, pushes, deployments, or migrations
against the configured application database were performed.

## Result

The main workflows across Admin, Seller, Buyer, Logistics and Rider have substantial
passing automated and real-browser evidence. The project cannot be declared fully
verified: the backend suite has three failures, several browser scripts have stale
expectations, and external/physical acceptance remains outstanding.

| Role | Evidence from this audit | Remaining qualification |
| --- | --- | --- |
| Admin | Backend management, role boundaries, application review, moderation, reports/commission and finance coverage; browser registration alerts, change-request review, review moderation, seller payout and return/refund actions passed | General dashboard browser script stopped in Logistics before reaching its Admin segment; not every Admin UI action was clicked |
| Seller | Browser dashboard/tasks, order search/preparation, inventory stock/weight, variants, vouchers, waybill/print request, reports/messages/settings, settlement and returned-goods receipt passed | Physical printed label and live account acceptance remain |
| Buyer | Browser purchase search/tracking, cart options, voucher checkout, review, return request, live messages with draft preserved, and responsive themes passed | General dashboard script has an outdated cart-success message expectation; diagnostic continuation verified the cart action |
| Logistics | Browser protected settings, address proposal/Admin review and registration notifications passed; diagnostic operational run passed receipt, sorting, scanning fallbacks, pickup and dispatch assignment | Original operational script expects old notification totals/menu size; general dashboard fixture lacks an approved company application and uses an obsolete menu selector |
| Rider | Browser signup/OTP, Logistics approval, own dashboard, delivery workflow/settings, return collection and payment visibility journey passed | Actual camera/scanner, delivery proof from a physical device and cash handover require field acceptance |

## Checks run

- `php artisan test --compact`: **1,074 passed, 3 failed, 3 skipped; 8,603 assertions**.
- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd eslint .`: passed, without automatic fixes.
- `npm.cmd run build`: passed.
- `node --test tests/Frontend/registration-form.test.cjs`: **37 passed**. The
  mocked component harness also emits React invalid-element warnings; this passing
  result alone does not prove real rendering.
- Seller/Buyer workspace browser script: **14 scenarios passed**, including the
  cross-role payout/payment/return/refund journey.
- Account-settings browser script: **9 scenarios passed**, including Admin review
  and registration notification navigation.
- Original Logistics operations, authentication and general dashboard scripts
  failed at the stale expectations described below. They must not be reported as
  passing unchanged.

Browser scripts used disposable SQLite databases, local PHP servers, synthetic
accounts, fake mail and location responses. Production-built assets were used.
Production MySQL locking, real email and Google authorization were not exercised.
The existing scripts retain diagnostic profiles/databases in temporary storage and
screenshots/results under `storage/app`; these contain synthetic test records.

## Confirmed test and acceptance defects

1. **Logistics dashboard expectation is stale.**
   `tests/Feature/Auth/RoleAccessTest.php:21` expects eight metrics; the response
   contains eleven. The response succeeds, but the assertion fails. Update the
   contract test to check meaningful metric values/keys for the current queues.

2. **Two Logistics tests still call the blocked legacy mutation endpoint.**
   `tests/Feature/LogisticsApprovalChainTest.php:92` and `:108` expect profile
   mutations to redirect, but receive 403. `ProfileUpdateRequest::authorize()`
   deliberately rejects Logistics; the supported company change flow is
   `/api/account/reverification` and the account settings/change-request APIs.
   Separate API tests and the settings browser journey passed. Migrate these
   scenarios to the supported flow and retain assertions that linked Riders lose
   operational access until approval; do not remove the legacy endpoint guard.

3. **Logistics browser notification assertions predate new queues.**
   `tests/Frontend/logistics-operations-browser-check.cjs:256` expects three
   attention items and five menu entries. Current fixtures display four attention
   items and the UI has eight queue entries. A temporary in-memory diagnostic
   changed only those expectations: **19 operational scenarios passed**. Source
   files were preserved. Evidence: `storage/app/audit-logistics-diagnostic/results.json`.

4. **Authentication browser script assumes the old home-page button placement.**
   `tests/Frontend/auth-browser-check.cjs:231` looks for a button inside
   `.storefront__seller-action`; the current button is `.storefront__seller-button`
   in the seller copy. This produces a null-element exception before signup tests.
   A diagnostic run bypassed the home-page checks and passed the subsequent
   authentication scenarios, including Buyer/Seller/Logistics registration, Rider
   signup/approval/login, actual password masking, password-code actions and recovery.
   This does not validate the bypassed homepage visual assertions.
   Evidence: `storage/app/audit-auth-diagnostic/results.json`.

5. **General dashboard browser script has multiple stale assumptions.**
   `tests/Frontend/dashboard-browser-check.cjs:257` waits for `Cart updated`; the
   card now displays `Added to cart`. A diagnostic continuation corrected only
   that message and verified the product-card/cart/wishlist journey, Buyer/Seller
   responsive navigation and Rider workflow/settings. It later stopped at line
   312 looking for `Open logistics queues`, replaced by the Logistics notifications
   control. The Logistics settings request also returns 403 because its fixture
   creates a company without an approved registration application, required by
   `ChangeRequestPolicy::create()`. Repair the fixture and selector, then rerun;
   do not weaken authorization. Evidence:
   `storage/app/audit-dashboard-diagnostic/results.json`.

6. **Three backend cases remain skipped.**
   Buyer/Seller/Logistics password-visibility cases are explicitly skipped as
   browser-only. The diagnostic authentication run did verify password reveal and
   rehide, but the skipped backend cases remain skipped in the reported totals.

The pre-existing feature checklist reports 1,067 passes and two failures. Those
historical totals are superseded by this audit's run. Diagnostic results are
separate from original-script results; no tests were deleted or rewritten.

## Required acceptance before claiming everything works

1. Repair and rerun the stale tests/fixtures above, including the unvisited Admin
   general-dashboard segment and bypassed home-page checks.
2. Verify configured live mail/OTP/password recovery, real Google OAuth callbacks,
   private storage access, queue processing, HTTPS/session behavior and failure
   feedback in the intended deployment environment.
3. Perform a fresh-account journey: Admin approves Seller/Logistics; Logistics
   approves Rider; Buyer checks out; Seller prepares/prints; Rider collects;
   Logistics receives/sorts/dispatches; Rider delivers with proof/full COD;
   Logistics receives cash; Admin reconciles and records seller payment. Exercise
   failed delivery, cancellation and return/refund on physical test parcels too.
4. Test physical phone cameras, USB/Bluetooth scanners and printed barcode labels.
   Browser synthetic camera and barcode decoding checks do not establish this.
5. Verify concurrent checkout, stock, custody and finance operations using the
   intended MySQL environment; exercise backup restoration and release migrations
   against a disposable database before separately authorized deployment.
6. Complete keyboard/screen-reader, contrast, zoom and device acceptance. The
   sampled responsive/browser checks are not WCAG certification or load testing.

Online payments and automatic bank transfers are not established features: the
current flow is COD with manually recorded payouts/refunds/Rider payments. Their
absence should not be described as a failed implemented online-payment system.

Audit scope was inspection and verification. Existing business logic, permissions,
branding and unrelated work were preserved. The next implementation batch should
repair the verification suite first and investigate any behavior failures exposed
by the completed reruns.
