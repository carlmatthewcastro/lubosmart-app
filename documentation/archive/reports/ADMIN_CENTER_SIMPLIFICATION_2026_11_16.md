> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Admin Center simplification — 16 November 2026

## Scope and baseline

Implemented in the existing working tree on `feat/platform-release-ui-onboarding`, preserving the extensive changes already present. Verified remote `main` at `dece73e`; that merge includes the active branch's committed baseline `20a30ad`. No branch switch, commit, push, merge, or deployment was performed. Remote references were fetched for comparison only.

This batch extends existing controllers, financial services, routes, and components. It does not create a second finance ledger or payment integration. Commission percentages and calculation functions are unchanged.

## Audit findings

- The Finance Center's transaction rows represent parcels, including parcels that have not reached collection. A null COD row previously always displayed “Awaiting collection.” It did not distinguish cancellation, ordinary pending delivery, or a delivered parcel needing investigation.
- A read-only audit of the local MySQL data found **11 parcels without COD rows**: 1 unassigned, 1 assigned, 5 picked up, 2 in transit, and 2 out for delivery. All had shipped parcel status; none was marked delivered. Their pending collections are legitimate. No financial records were synthesized to change these states.
- No local completed seller payout, Platform remittance, reconciled COD collection, or refunded return was missing its recorded timestamp. The shared detailed stepper displayed “Time not recorded” for future steps, causing pending activity to look like missing history.
- Remittances required the administrator to invent or locate a unique reference, although an internal receipt identifier can be generated safely by the server. Existing receipt evidence is a required notes field, not a separate remittance attachment/upload system.
- Refund credits already use exact offers, buyer consent where required, funding reservations, wallet services, transactions, and idempotent operation keys. The exceptional correction form nevertheless required a manually entered wallet transaction ID, and recovery funding required a manually entered return ID.
- Return exceptions used `updateOrInsert`, allowing the original exception reason and actor to be replaced. The standard return window was read from the current setting for every delivery, allowing later policy changes to change older eligibility.

## Backend changes

- Generate a unique `LMRC-` internal remittance reference only when actual receipt is confirmed. Preserve supplied external receipt evidence separately. Legacy `reference` input remains accepted as external evidence. Existing records are not rewritten. Parcel uniqueness, reference uniqueness, exact product-cash amounts, evidence requirements, locks, audit logging, and actual receipt dates remain enforced.
- Expose existing remittance evidence, recording administrator, actual receipt date, recording timestamp, tracking, retained shipping, and reconciliation timestamp for contextual review.
- Derive understandable transaction display states without new database statuses. Flag inconsistent recorded cash instead of suggesting it is ready for settlement. Add an existing-record timeline; absent historical times remain absent. Role-specific payout fields remain restricted.
- Serialize query-builder timestamps with their configured timezone offset so a browser does not interpret a database timestamp as an unrelated local time. Date-only receipt evidence stays distinct from the time Admin recorded it.
- Add product cash actually received by Platform, recorded cash held by Logistics, pending COD, and pending exact refund-offer figures. Logistics custody includes its retained shipping allocation; it is not all payable to Platform. These figures describe stages and must not be added together as independent revenue. Pending refund-offer amounts are current/all-time obligations, not bank balances.
- Add tracking and confirmed funding information to seller settlement details, retain exact net payouts and payout timestamps, and preserve all COD, Platform funding, store balance, return, and recovery holds. Load coin allocations with the settlement records.
- Resolve refund previews from the return, buyer, order, parcel, active offer, and related wallet records. Reads never issue credits. Show the approved default, existing refund value, remaining limit, coin equivalent, and responsible party. The existing workflow permits one finalized refund per return; it is not a partial-refund installment ledger.
- Coin-only execution can generate an internal `LCRF-` reference without pretending a bank payment occurred. Monetary refunds still require an actual external payment reference. Exact offers, consent, funding, immutable wallet entries, and duplicate/excess-refund protection remain server-authoritative.
- Wallet corrections are selected from their ledger entry; recovery receipts are selected from their return. Corrections additionally reject an entry linked to a different buyer or a conflicting recorded order. Legacy entries lacking an order reference remain supported when the buyer/return relationship is valid.
- Search delivered parcels by tracking, numeric order reference, buyer, seller, or shop. Show delivery time, deadline, current eligibility, existing return, and existing exception. Limit results to 20 and allow narrowing the search. Exceptions use the existing authorization and audit trail, and reject replays instead of overwriting evidence.
- Snapshot the configured window on actual delivery. Before changing policy, preserve the currently applicable setting on older delivered parcels that lack a snapshot. This preserves their current eligibility going forward; it does not claim to reconstruct unknown older policy history. Requests already approved are unaffected. Buyers' eligible-parcel lists and submission checks use the saved window and existing exceptions.

## UI changes

- Keep existing Finance Center navigation, tabs, filters, routes, pagination, reference details, and shared money formatting.
- Show populated receipt and payout previews with clear internal/external reference wording; keep actual amounts and evidence visible before confirmation.
- Separate routine refund processing from exceptional wallet corrections and actual liability recoveries. Technical IDs are submitted from selected records rather than typed.
- Add the policy summary and a deliberate Edit Policy action; move exception handling into searchable record selection.
- Present Admin return history in a compact table with details drawers, buyer/shop, tracking, reason, status, responsibility, and recorded refund value. Existing return actions and event history remain available inside details.
- Pending timeline steps describe what is awaited. Completed steps without historical evidence explicitly say their historical timestamp is unavailable.
- Use the existing Radix dialog, drawer, form, button, and feedback components. Add cancellation to confirmation dialogs and retain processing guards and backend validation feedback. Long tracking references wrap within mobile receipt previews.
- Apply flat main/welcome surfaces through an Admin-only shell class, covering dashboards, review/account pages, marketplace administration, reports, support, platform settings, and account settings. Preserve Poppins, purple branding, dark preference, existing navigation, and focused form widths. Shared component compatibility with other roles was checked; their pages were not independently redesigned.

## Database change

`database/migrations/2026_11_16_033811_add_admin_finance_context_fields.php` adds:

- Nullable `deliveries.return_window_days` for delivery policy snapshots.
- Nullable, unique `logistics_remittances.external_reference` for actual external receipt evidence.

The migration adds fields only; it does not reset/reseed data, remove records, change amounts, fabricate dates, or rewrite receipt references. Its rollback intentionally refuses to discard recorded context; use a reviewed forward migration. It passed isolated SQLite migrations and was applied successfully to the verified **local MySQL** application database. No production database was migrated.

## Files changed in this batch

Backend:

- `app/Http/Controllers/FinanceController.php`
- `app/Http/Controllers/LogisticsSettlementController.php`
- `app/Http/Controllers/SellerSettlementController.php`
- `app/Http/Controllers/ParcelReturnController.php`
- `app/Http/Controllers/RefundFundingController.php`
- `app/Http/Controllers/DeliveryController.php`
- `app/Models/Delivery.php`
- `app/Models/LogisticsRemittance.php`
- `app/Services/LubosCoins.php`
- `database/migrations/2026_11_16_033811_add_admin_finance_context_fields.php`

Presentation:

- `resources/css/app.css`
- `resources/views/components/shell/app-shell.tsx`
- `resources/views/components/finance/finance-ui.tsx`
- `resources/views/components/finance/return-policy.tsx`
- `resources/views/components/shared/record-action.tsx`
- `resources/views/components/shared/progress-stepper.tsx`
- `resources/views/pages/finance/overview.tsx`
- `resources/views/pages/finance/logistics-settlements.tsx`
- `resources/views/pages/finance/settlements.tsx`
- `resources/views/pages/finance/returns.tsx`
- `resources/views/pages/finance/refund-funding.tsx`

Verification and handoff:

- `tests/Feature/SettlementAndReturnsTest.php`
- `tests/Frontend/finance-browser-check.cjs`
- This document.

Some listed files were already modified or untracked before this request; the list identifies this batch's touched files, not ownership of their entire diff. The full-disk interruption temporarily emptied `app.css`; its preceding content was recovered from recorded file content and subsequent edits, including existing workflow motion, coin color, scanner animation, flat buttons, and textarea rules.

## Verification

- Isolated Laravel regression run: **185 tests, 2,727 assertions passed**, covering SettlementAndReturns, FinalizationUpgrade, Checkout/CreateOrderFromCart, RiderWorkspace, LogisticsWorkspace, MarketplaceFlow, and MobileRoleParity.
- After the final receipt/reference changes, finance and exact money-allocation checks: **52 tests, 970 assertions passed**. No customer data was used by tests.
- Frontend workflow and registration tests: **49 passed**. Their existing mocked component loader emits React warnings; these do not establish browser defects or accessibility compliance.
- Targeted ESLint, TypeScript, PHP formatting checks, and production Vite builds passed. Existing storefront/category image resolution warnings remain build-time warnings; asset requests are checked by the browser harness where exercised.
- Chrome acceptance passed **nine groups**, including **168 page/theme/width assertions** across 28 operational surfaces at 320/768/1440px in light/dark mode. Admin coverage includes finance, returns, commission, reports, dashboard, accounts, registration reviews, compliance, product reviews, platform settings, audit history, profile/password/appearance, company change requests, orders, and support. Seller, Logistics, and Rider finance/report surfaces also passed.
- Browser flows exercised actual synthetic remittance confirmation, exact refund funding, buyer coin consent, one-time credit issuance, buyer wallet updates, exception search/selection, and a contextual wallet-correction preview followed by cancellation. Drawer Escape/focus restoration, exact-reference filters, no-results states, report reflow at zoom-equivalent widths, and collapsed sidebars also passed. No uncaught browser exceptions were recorded.
- Manually inspected screenshots of the repaired 320px receipt dialog, return selector, signed wallet-correction preview, and dark Admin profile. The receipt check now also asserts the contents fit the dialog width. Evidence: `storage/app/finance-ui-check/results.json` and screenshots in that directory.
- The return-window query also executed successfully against local MySQL after the additive migration. No financial mutation was used for that SQL compatibility check.

## Local reproduction and defense walkthrough

The local additive migration is already applied. On another development checkout, install the existing project dependencies/configuration, apply the normal prerequisite migrations, and run `php artisan migrate` after reviewing the new migration. Start the existing Laravel application using the project's normal local setup; build assets with `npm.cmd run build` (or the equivalent npm command on other shells).

Repeat targeted tests:

```powershell
php artisan test --compact tests/Feature/SettlementAndReturnsTest.php tests/Unit/MoneyAllocationTest.php
npx.cmd tsc --noEmit
node tests/Frontend/finance-browser-check.cjs --admin-refinement
```

The browser check requires installed Chrome or Edge and the production build. It creates synthetic, isolated records. Use synthetic records or a separate test environment for the following demonstration:

1. Show a pending parcel in Transaction History and explain expected COD versus actual received funds; open its timeline.
2. Show rider collection, Logistics receipt and Admin reconciliation as separate stages.
3. Select a reconciled parcel, review populated remittance/shipping amounts, enter real test receipt evidence, and confirm. Show the generated internal reference and recording time; demonstrate replay rejection through the tests.
4. Open Seller Settlements, explain funding/return holds, and record an eligible exact payout. Show the preserved amount, commission, deductions, and recorded time.
5. Open a received return; review the buyer, original purchase, responsibility, exact offer, refund limit, and coin equivalent. Demonstrate required buyer consent and available backing before issuing credit once.
6. Show the buyer wallet and linked refund history. Open an exceptional correction preview without confirming an unnecessary change.
7. Show the current return policy, search a delivered parcel for an exception, and explain that an exception permits a request rather than approving or paying a refund.
8. Show the same Admin pages on mobile, with the sidebar collapsed, and in dark mode.

## Limits

- Historical missing timestamps are not backfilled. A completed record without evidence requires investigation, not an invented date. The local aggregate audit found no such timestamp gaps in the financial tables checked.
- Actual bank transfers, financial-provider verification, and attachment-based remittance evidence are not introduced. Notes remain the existing receipt evidence requirement; rider cash evidence is not reused as proof of a different Platform receipt.
- Actual browser zoom controls, comprehensive screen-reader operation, physical touch devices, measured contrast, and production performance require manual acceptance. Automated checks do not establish WCAG conformance.
- Financial and return mutations were exercised with synthetic data. No live customer refund, payout, policy change, or exception was recorded during verification.
