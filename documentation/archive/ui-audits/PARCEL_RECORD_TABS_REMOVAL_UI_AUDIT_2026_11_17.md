> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Parcel records tab removal — 2026-11-17

Removed the screenshot's All records & history, Completed deliveries, and Returns & exceptions tab bar from logistics parcel records and delivery reports. Removed the unused records variant from LogisticsWorkspaceTabs. Existing routes, parcel queue navigation, filters, and workflows remain intact.

Validation: targeted ESLint, TypeScript, production build, and LogisticsWorkspaceTest passed (67 tests, 1002 assertions). The build reported unresolved image references for catalog-shopping-banner.svg, orders-banner.svg, category-atlas-v1.png, and returns-banner.svg; these assets were outside this change.

Browser visual, light/dark, mobile, zoom, and assistive technology checks were not performed. Automated checks do not establish WCAG compliance.
