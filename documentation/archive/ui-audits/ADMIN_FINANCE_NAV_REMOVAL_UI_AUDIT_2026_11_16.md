> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Admin finance navigation removal — 2026-11-16

Removed the Finance Center navigation strip from the admin Commission and Seller
settlements pages. Commission Reports remains a standalone page action. Seller
settlement navigation remains available for non-admin users. Shared navigation,
routes, permissions, commission settings and payout behavior are unchanged.

Validation: targeted ESLint, TypeScript, production build, and SettlementAndReturns
tests passed (53 tests, 989 assertions). Build reported runtime asset resolution
warnings for catalog, orders, category and returns artwork.

Live browser, mobile, theme, keyboard, zoom and assistive technology checks were
not performed. Automated checks do not establish WCAG compliance.
