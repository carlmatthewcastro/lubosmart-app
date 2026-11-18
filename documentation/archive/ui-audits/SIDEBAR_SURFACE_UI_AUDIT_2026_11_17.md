> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Sidebar surface — 2026-11-17

The shared workspace sidebar now uses a soft lavender surface, distinct from the
main content and white cards. Removed the card-background override so desktop,
collapsed and mobile sidebars use the sidebar token. Navigation hover and active
states use a deeper lavender sidebar accent. Dark mode uses a plum surface and
its own stronger accent. Routes, labels, permissions and layout are unchanged.

Validation: targeted ESLint, TypeScript, production build and AdminManagementTest
passed (35 tests, 516 assertions). Build warnings remain for existing catalog,
orders, returns banner and category atlas image references.

Browser visual comparison, actual color contrast measurement, mobile reflow,
keyboard review and zoom checks remain unverified. Automated checks do not
establish WCAG compliance.
