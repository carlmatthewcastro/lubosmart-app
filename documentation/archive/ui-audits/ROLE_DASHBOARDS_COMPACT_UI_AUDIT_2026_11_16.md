> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Buyer, seller and admin dashboard compact layout � 2026-11-16

Scope: admin and seller dashboard pages, buyer rendering in the shared workspace dashboard, and optional compact presentation in shared dashboard components.

- Added opt-in compact welcome and metric variants; defaults preserve other roles.
- Admin: replaced illustrated hero with a compact greeting; removed the Platform Management shortcut directory; placed review queues and recent activity before business analytics. Registration queue follows the existing server-provided registration permission.
- Seller: compact greeting and summary, removed duplicate SellerNavigation, moved actionable order/stock/exception queues above the sales chart, bounded sales chart height. Kept settlement totals, periods, recent orders and store approval feedback.
- Buyer: compact greeting and metrics, removed the duplicate quick-action directory and generic tutorial steps, made recent orders full width. Retained discovery, account, wallet and order links and existing empty-state action.
- Preserved data definitions, polling, routes, calculations, authentication and backend authorization. Compact metric context remains available to screen readers.

Validation:
- Targeted ESLint and TypeScript noEmit passed.
- DashboardTest and DashboardSummaryTest: 9 passed, 138 assertions.
- Production build passed, with existing unresolved marketplace banner/category image references.
- Existing isolated headless Chrome harness passed for buyer, seller and admin at 1440px, 768px and 320px, plus dark mode at 320px; no document overflow or runtime errors. Updated its obsolete metric CSS-class assertion to check accessible summary regions.
- Inspected screenshots for admin desktop, seller desktop and buyer mobile.
- Evidence: storage/app/compact-role-dashboard-check/results.json and corresponding screenshots.

Remaining manual verification: keyboard/screen-reader paths, contrast measurement, landscape, zoom at 200%/400%, and populated admin review queues in browser. Existing feature tests cover registration queue data. These checks do not establish WCAG compliance.
