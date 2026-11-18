> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Sidebar account settings removal — 2026-11-16

Removed Account settings from the seller and rider sidebar lists and Settings
from the fallback sidebar list. No role's sidebar now links to /settings/profile.
Removed the unused Settings icon import. Platform Settings remains an admin
operation, and existing account menu access and settings routes are preserved.

Validation: targeted ESLint, TypeScript, production build, and four shared settings
tests (127 assertions) passed. Build retains runtime asset resolution warnings
for catalog, orders, category, and returns artwork.

Live browser, mobile, theme, keyboard, zoom, and assistive technology checks were
not performed. Automated checks do not establish WCAG compliance.
