> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Public page width — 2026-11-17

Removed the 1440px maximum width from the shared `.reference-home` and
`.reference-catalog` wrapper. Public storefront pages now fill the available
viewport with their existing inner gutters. Removed the redundant homepage-only
override. Shared operational pages already use full-width wrappers; focused
authentication and form widths remain appropriate to their content.

Validation: CSS Prettier check, shared Page ESLint, TypeScript, production build,
and MarketplaceCatalogTest / HomepageProductsTest passed (19 tests, 310 assertions).
The build retains existing unresolved banner and category-atlas asset warnings.
An isolated SQLite browser run checked home, shop and product pages at 320, 375,
768, 1024, 1440 and 1920px without document overflow or runtime errors. Inspected
the 1920px shop screenshot: header and page surface extend to the viewport edge
and the banner keeps balanced gutters. Artifacts: `storage/app/public-width-check/`.

Authenticated routes, dark mode, keyboard/screen reader paths and actual browser
zoom were not manually rechecked for this CSS-only change. These checks do not
establish WCAG compliance.
