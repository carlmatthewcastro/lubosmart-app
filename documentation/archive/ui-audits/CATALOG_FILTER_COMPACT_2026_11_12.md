> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Compact catalog filters — 2026-11-12

Reduced catalog/wishlist filter card padding to 12px, removed the shadow, and used the shared toolbar's bounded search width instead of stretching it across the page. Desktop card fits its controls; mobile fills the available width. Search and category controls remain 44px high, with existing labels, automatic filtering, category options, reset and active filter behavior preserved. Shortened the search placeholder and aligned its decorative icon to the control.

Validation: targeted ESLint, TypeScript, Prettier, production build and HomepageProductsTest (8 tests, 89 assertions) passed. Isolated browser check at 1920, 768 and 320px confirmed no page overflow and 44px search controls. Desktop panel measured 614 × 98px; tablet 550 × 98px; mobile 288 × 154px including its Filters toggle. Reviewed desktop light and mobile dark screenshots. Light/dark screenshots for all three widths are in storage/app/catalog-filter-compact-check. The disposable browser harness is storage/app/catalog-filter-browser-check.cjs, based on the existing homepage fixture runner. Full assistive technology, zoom and measured contrast audits remain unverified.

No branch changes, commits, pushes or deployment. Existing work preserved.
