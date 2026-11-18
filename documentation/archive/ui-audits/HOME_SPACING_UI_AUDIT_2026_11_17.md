> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Homepage spacing — 2026-11-17

Reduced the homepage and shared public navbar desktop gutters from 3% to 32px;
the homepage keeps 16px mobile gutters. Featured products use four desktop
columns, two tablet columns, two mobile columns from 380px, and one column on
narrower screens. This fills the desktop row with the four products currently
returned by the homepage without changing the product query.

Homepage cards use their content height instead of stretching to the tallest
variant card. Images are bounded at 224px on desktop and 160px on mobile.
Product variant selectors no longer reserve an empty validation feedback block;
their labels, selection state and cart behavior remain intact.

Validation: targeted ESLint and Prettier, TypeScript, production build, and
HomepageProductsTest passed (8 tests, 89 assertions). The build still reports
existing unresolved catalog, orders, returns banner and category atlas references.
An isolated SQLite browser run with four synthetic products, including one with
a variant selector, checks 320, 390, 768, 1024, 1440 and 1920px in light/dark mode.
It verifies no horizontal overflow, 16px/32px homepage gutters, four desktop cards
filling their row, and bounded image/card heights. Screenshots are saved under
`storage/app/home-spacing-check/`; the 1920px light screenshot was inspected.

Keyboard, screen reader, actual 200%/400% browser zoom and touch-device testing
remain unverified. Automated geometry checks do not establish WCAG compliance.
