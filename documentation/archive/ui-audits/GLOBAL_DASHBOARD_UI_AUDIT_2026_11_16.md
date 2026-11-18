> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Global dashboard content refresh — 2026-11-16

Scope: Admin, Seller, Rider, Logistics, and Buyer dashboard content. Existing welcome/banner markup, illustrations, sidebar, navbar, branding, routes, and business workflows are retained. Existing unrelated working-tree changes were preserved. No migration, commit, push, or deployment was performed.

## Presentation and data

The shared `DashboardMetric` supports formatted monetary values and quiet semantic purple borders. New `DashboardOverview` and `DashboardFinance` components share chart and financial presentation. Charts use the project's existing SVG approach; no dependency was added. Buyer retains its shopping presentation and has no analytics chart. Recent seller and rider records occupy the full content width.

| Role | Database sources and meaning |
| --- | --- |
| Admin | Total `orders`; completed `seller_orders.commission_amount` minus recorded `parcel_returns.commission_reversal_cents`; approved stores with approved verified owners; requested/approved return cases. Existing seven-day analytics, review queues, and audit activity remain. Summary queries respect existing admin permissions. Commission represents recorded net commission, not gross sales or a cash receipt total. |
| Seller | Authenticated seller's store only: completed parcel subtotals, pending orders, active unblocked products, recorded return requests, actual seller payout ledger entries, and completed proceeds before refund deductions. Seven-day sales use actual `deliveries.delivered_at`, grouped by day, with missing days represented as zero. |
| Rider | Existing rider-scoped pickup, dispatch, delivery and completion queues; existing pending COD query. Compensation comes from rider-owned task-fee and weekly-payment ledgers, with marked-paid amounts separate. Return count uses assigned physical return tasks. COD is never included in compensation. |
| Logistics | Operational centers belonging to the authenticated company only: pickup approval queue, received parcels awaiting dispatch acceptance, out-for-delivery parcels, today's delivery completions, actual recorded `cod_collections.received_amount`, and active physical return tasks. Existing assignment, exception, cash and setup queues remain. |
| Buyer | Authenticated buyer only: orders with pending/processing seller parcels, orders with shipped seller parcels, completed parent orders, and wallet balance in coins. A multi-store order may belong to both shipping queues. Recent orders retain existing detail/tracking destinations. |

Dashboard data refreshes through Inertia polling every 30 seconds, with its default inactive-tab throttling. This is periodic refresh, not instantaneous server push. Calendar periods and today's delivery cutoff use the configured application timezone; seller charts display that timezone.

## Changed implementation files

- `app/Http/Controllers/DashboardController.php`
- `app/Services/DashboardSummary.php`
- `resources/views/components/workspace/dashboard-panels.tsx`
- `resources/views/components/workspace/dashboard-overview.tsx`
- `resources/views/components/workspace/dashboard.tsx` (Buyer presentation)
- `resources/views/pages/admin/dashboard.tsx`
- `resources/views/pages/seller/dashboard.tsx`
- `resources/views/pages/rider/dashboard.tsx`
- `resources/views/pages/logistics/dashboard.tsx`
- `tests/Feature/DashboardSummaryTest.php`
- `tests/Frontend/dashboard-browser-check.cjs`
- `tests/Frontend/dashboard-redesign-check.cjs`

## Validation

- Targeted ESLint, TypeScript, Prettier and PHP Pint checks pass.
- 101 existing dashboard, rider, logistics and marketplace flow tests pass (1,694 assertions).
- Five added feature tests pass (104 assertions), covering seller isolation and payout refresh, shipped buyer parcels under processing parent orders, wallet isolation, empty logistics centers, commission reversals, and rider compensation isolation/refresh.
- Production build passes. Vite retains existing runtime-resolved image warnings for catalog/orders/returns banners and category atlas.
- Isolated browser checks cover all five roles at 1440px, 768px and 320px, plus 320px dark mode. They verify welcome content, one page heading, metric rendering, role-specific content, no document overflow, and no runtime/console errors. Screenshots and the browser report are under `storage/app/dashboard-redesign-check/`.
- Repository-wide whitespace inspection found pre-existing trailing whitespace in `tests/Fixtures/logistics-operations-seed.php`; this unrelated file was preserved.

## Limits and remaining verification

Pending settlement eligibility and admin remittance totals remain in their existing detailed finance destinations. The dashboard deliberately does not approximate them by subtracting unrelated financial balances. Seller proceeds are explicitly shown before refund deductions; actual received payouts are a distinct ledger total. Rider activity is a current assignment overview plus all-time completions, not a fabricated daily history. Logistics pickup summary describes requests awaiting approval, not every assigned pickup.

Manual screen-reader testing, a full keyboard-path audit, contrast measurement, browser zoom at 200%/400%, and live production performance measurements remain unverified. Automated reflow checks do not establish WCAG conformance. No production data was created or changed during verification; test fixtures use disposable SQLite databases.
