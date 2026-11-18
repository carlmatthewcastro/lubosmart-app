> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Catalog automatic search

Removed the signed-in catalog/wishlist Search submit button. Search now runs after
350ms of inactivity, preserves other filter values and scroll/focus, replaces search
history entries, and cancels obsolete requests. Clearing the input restores results.
Enter submission remains available. Existing field labels and branding are preserved.

Validation: targeted ESLint, TypeScript, production build, and MarketplaceCatalogTest
(11 tests, 221 assertions) passed. Build reports unresolved image references for the
returns, catalog shopping and orders banners and category-atlas-v1.png.

Browser, keyboard, mobile, theme, zoom, and screen-reader verification were not run;
automated checks do not establish WCAG compliance.
