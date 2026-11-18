> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Logistics dashboard compact layout � 2026-11-16

Scope: resources/views/pages/logistics/dashboard.tsx only.

- Replaced the tall metric presentation with compact icon, label and count links; metric context remains available to screen readers.
- Removed the duplicate parcel-distribution chart, parcel navigation/search block, Center Management directory and separate dispatch shortcut strip.
- Consolidated counted follow-up queues into Needs attention. Preserved COD totals, return queue, recent parcels, scan action, existing routes and polling.
- Show only incomplete setup requirements; show the application panel when applications exist.
- Uses existing semantic theme colors, shared cards and finance component. No backend or permission changes.

Validation: targeted ESLint, TypeScript noEmit, production build and DashboardTest / DashboardSummaryTest passed (9 tests, 138 assertions). Build reports unresolved pre-existing image references for marketplace banners and category atlas; unrelated to this page.

Manual browser validation was not performed. Light/dark rendering, 320px/tablet/desktop reflow, landscape, keyboard/screen-reader navigation, contrast and 200%/400% zoom remain unverified. Automated checks do not establish WCAG compliance.

Follow-up: removed the illustrated welcome hero and retained a compact greeting with Scan parcel / Manage parcels actions. The logistics page banner stays disabled for this dashboard. ESLint, TypeScript, dashboard tests and production build passed; browser visual verification remains pending.
