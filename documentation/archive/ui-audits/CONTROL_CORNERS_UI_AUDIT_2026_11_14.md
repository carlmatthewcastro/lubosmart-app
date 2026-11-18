> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Subtle control corners — 2026-11-14

Shared Button, Input, Select and marketplace Field/Select/Textarea styles use a
12px `rounded-control` token. Authentication fields, primary/Google actions and
upload buttons use the same radius. Existing component class overrides remain
available. Cards and public homepage layout retain their existing shapes.

Validation: targeted ESLint and TypeScript checks passed. Authentication and
homepage tests passed (13 tests, 119 assertions). Production build passed with
the existing unresolved `/images/categories/category-atlas-v1.png` warning.

Visual browser checks remain outstanding for light/dark themes, mobile, zoom,
keyboard focus and individual page overrides. Automated checks do not establish
WCAG compliance.
