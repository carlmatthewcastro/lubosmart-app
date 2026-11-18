> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Role dashboard banners � 2026-11-16

Applied the rider banner approach to logistics, admin, and seller using the shared DashboardWelcome component. Seller now uses a store and parcel illustration; admin uses an analytics and review illustration. Both are decorative inline SVGs using existing Lucide icons and theme tokens. Logistics retains the delivery truck illustration and now suppresses the additional automatic page banner to keep one welcome banner. Admin now uses the same lavender gradient as the other dashboard banners. Existing actions, permissions, routes, metrics and polling are preserved.

Validation: targeted ESLint passed. DashboardTest and DashboardSummaryTest passed: 9 tests, 138 assertions. TypeScript and production build results are recorded below.

Manual browser verification remains pending for light/dark themes, 320px, tablet/desktop, zoom, keyboard and assistive technology. Artwork is decorative and hidden below the medium breakpoint; text/actions remain available. Automated checks do not establish WCAG compliance.

TypeScript noEmit and production build passed. Build retains unresolved runtime image-reference warnings for catalog, orders, returns, and category artwork outside these banner changes.
