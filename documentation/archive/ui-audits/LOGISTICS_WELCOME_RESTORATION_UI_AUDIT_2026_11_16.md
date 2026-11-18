> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Logistics welcome banner restoration

Restored the shared DashboardWelcome hero at the user's request: lavender surface, delivery truck illustration, personalized greeting, company context and existing Scan parcel / Manage parcels actions. Compact metrics, routes, polling and permissions are preserved. The automatic page banner remains disabled to avoid duplication.

Validation: targeted ESLint, TypeScript noEmit, production build and dashboard tests passed (9 tests, 138 assertions). Existing build warnings reference unrelated marketplace and category image assets.

Manual screenshot comparison, light/dark rendering, mobile reflow, zoom, keyboard and screen-reader verification remain pending. Automated checks do not establish WCAG compliance.
