> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Finance Center Phase 2 UI audit — November 16, 2026

## Implemented presentation

The written Phase 2 request controls scope; the attached dashboards supply visual references only. Existing homepage branding, Poppins, semantic theme tokens, Logistics banners, authorization and finance workflows remain authoritative. Native mobile code is excluded; Rider phone layouts use responsive web pages.

Logistics now has one Finance Center sidebar destination with Overview, Transactions, Shipping & Remittances and Rider Payments navigation. Existing `/finance`, `/logistics-settlements` and `/rider-payments` URLs still render their original authorized data and actions. Overview/Transactions preserve supported filters when switching, and existing shipping/payment deep links activate the Finance Center sidebar item. Returns, reports, messages and other operational navigation remain accessible.

Added shared finance navigation, summary cards, status labels, explanatory disclosures, accessible table regions, reference-copy controls and Radix detail drawers. Financial references, shipping allocations, compensation agreements, task-fee history, completed work, settlements, seller costs and refund-funding entries use tables. Original breakdowns, actual timestamps, holds, progress and recording actions are retained inside drawers. Important settlement holds remain visible in table rows. Task fees and weekly compensation remain separate; compensation totals are not calculated from a paginated subset.

The overview groups every existing amount into cash custody, shipping, commission/proceeds, compensation, refunds/recoveries, and costs/coins/funding. Missing cash amounts display as unrecorded rather than zero. Exact reference matching and order-creation filters retain their existing meaning. Compensation and Logistics recovery totals are labeled all time, and current funding balances are distinguished from parcel-filtered metrics. Overlapping financial stages are not summed.

Delivery reports retain delivered-date filters, existing totals and CSV endpoints, with a compact completed-deliveries table and record drawers. Admin commission/reports/refunds and Seller reports/costs share finance navigation. Buyer order details now include existing Coins redemption alongside COD due; Buyer refunds retain their established workflow, with the malformed cash/coins separator corrected. The existing Buyer wallet retains its recent design and gains copyable ledger references.

Existing `RecordAction` forms retain their request fields, server validation, processing safeguards and endpoints. Payment confirmation descriptions identify the existing amount, party and reference where supplied. Refund-funding and cost actions use the existing confirmation dialog option. Removed a duplicate Return ID control from the refund-funding form; its submitted key and validation remain unchanged. Drawers close after successful recording, and remain open through background GET refreshes and validation failures.

## Modified files and reused components

- New shared components: `resources/views/components/finance/finance-ui.tsx`.
- Finance pages: `overview.tsx`, `logistics-settlements.tsx`, `rider-payments.tsx`, `settlements.tsx`, `seller-costs.tsx`, `refund-funding.tsx`, and `returns.tsx` under `resources/views/pages/finance/`.
- Reports and commission: `resources/views/pages/logistics/reports.tsx`, `resources/views/pages/marketplace/reports.tsx`, and `resources/views/pages/admin/commission.tsx`.
- Navigation: `resources/views/components/navigation/app-sidebar.tsx` and `nav-main.tsx`.
- Buyer presentation: `resources/views/components/marketplace/buyer-order-dialog.tsx`, `buyer-return-card.tsx`, and `resources/views/pages/marketplace/wallet.tsx`.
- Acceptance harnesses: `tests/Frontend/finance-browser-check.cjs` and `tests/Frontend/logistics-consolidation-browser-check.cjs` (the latter only gains isolated built assets).

Reused `Page`, `Card`, `money`, `Field`, `Select`, `Pager`, `RecordAction`, `ProgressStepper`, existing filter components, Radix Sheet/Dialog, installed icons and Inertia forms. No dependency, schema, financial service, controller, route, API payload or calculation changes were made in this phase. The existing `placed_at` response field is now typed and displayed in the frontend. Existing pending work was retained; no Git operations that change state or deployment were performed.

## Verification

- Before presentation edits, TypeScript and all seven existing finance browser check groups passed against the existing build and a disposable SQLite database.
- Captured synthetic pre-change totals, discrepancies, missing-rate counts and representative transaction states for Admin, Logistics, Seller and Rider in `storage/app/finance-ui-check/phase2-baseline.json`. Stable fixture amounts include COD collected/expected/received of PHP 980.00, shipping allocation PHP 80.00, product sales PHP 900.00, and commission PHP 90.00. The Admin receipt action then records PHP 900.00 in the isolated fixture; subsequent role snapshots reflect that existing workflow.
- Targeted ESLint, TypeScript and Prettier checks passed. Production Vite build passed with existing runtime image-resolution warnings for storefront/category assets.
- Relevant Laravel regression suites passed: **131 tests, 2,002 assertions**, covering SettlementAndReturns, FinalizationUpgrade, LogisticsWorkspace, RiderWorkspace, MobileRoleParity and MoneyAllocation. Test configuration uses isolated SQLite, never the working database.
- Expanded finance browser verification passed **eight check groups** across all five roles: responsive finance and report surfaces, exactly four Logistics finance destinations, preserved legacy-route sidebar activity, exact-reference filters and filter submission, retained transaction-tab selection, empty results, drawer Escape/focus restoration, unchanged delivery CSV values, real isolated receipt/refund/Coins workflows, Buyer wallet navigation and the financial baseline. Zero uncaught browser exceptions were recorded.
- Logistics consolidation browser regression passed **84 page/theme/width checks**: 60 Logistics checks and 24 Rider checks, covering 320/768/1440px in light/dark themes. This includes prior dashboards, parcels, scan, rider management, coverage/rates, delivery reports and Rider delivery stages.
- Visually inspected the desktop Logistics overview, mobile transaction drawer and rider-compensation layout, and Seller dark overview. Screenshot capture now waits for theme/button transitions to settle. Evidence: `storage/app/finance-ui-check/results.json`, `phase2-baseline.json`, role screenshots, and `storage/app/logistics-consolidation-ui-check/results.json`.

Early expanded attempts exposed a query-order assumption in the harness and a disappearing shared build manifest. The harness now compares query parameters independent of ordering and copies built assets into its isolated temporary public directory, following existing repository browser-test patterns. A body-CSS-zoom experiment was replaced with effective viewport checks because CSS zoom does not update responsive media queries like browser zoom.

## Limitations

- Current transaction props represent parcel financial references, not a universal timestamped accounting-event ledger. No fabricated transaction classifications, product evidence, trends or growth percentages were added.
- Store identity, completed-work rider/leg timestamps, separate sender-remittance events and other missing drawer fields are shown only where existing authorized props supply them. Platform receipt is never inferred from COD reconciliation or a shipping entitlement.
- No new role selector, payment gateway, transfer, export endpoint, wallet behavior or financial business rule was introduced. Existing mobile API behavior remains unchanged.
- Effective 640px/320px report viewports cover reflow corresponding to a 1280px display at 200%/400% zoom. Actual browser zoom controls, full screen-reader operation, measured contrast, physical-device touch behavior and production performance still require manual acceptance. Automated checks and screenshot inspection do not establish WCAG compliance.
