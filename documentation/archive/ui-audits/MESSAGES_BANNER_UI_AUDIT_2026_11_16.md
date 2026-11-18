> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Messages banner cleanup — 2026-11-16

Removed the duplicate logistics Messages banner using a Page opt-out. The navbar
retains the page heading and the existing support hero and messaging workflow remain.
Sheet close buttons now show their focus ring with focus-visible, preserving
keyboard feedback without the box on ordinary pointer focus.

Validation: targeted ESLint, TypeScript, production build and SupportMessagingTest
passed (6 tests, 49 assertions). Build reported unresolved runtime image references
for catalog shopping, orders, returns and category atlas assets.
Browser visual, keyboard, screen reader, theme and zoom verification remains pending;
automated checks do not establish WCAG compliance.
