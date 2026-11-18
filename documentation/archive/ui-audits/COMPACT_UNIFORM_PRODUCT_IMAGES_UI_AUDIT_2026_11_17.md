> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Compact uniform product images � 2026-11-17

Follow-up to PRODUCT_CARD_IMAGES_UI_AUDIT_2026_11_17.md; supersedes its expanding grid and square frame sizing.

- Shared homepage/shop grids reserve 200px columns with auto-fill so incomplete rows cannot stretch cards. Columns shrink only if the container is narrower than 200px.
- Every product image frame has a fixed 160px height with the same 16px inset. Contain preserves source proportions without cropping.
- Existing product data, navigation and actions remain intact.

Validation: targeted ProductCard ESLint, TypeScript, production build, and 19 HomepageProducts/MarketplaceCatalog tests (310 assertions) passed. Existing runtime artwork URL build notices remain. Browser regression passed homepage and shop at 320, 540, 800, 1100, 1440 and 1920px: image frames at 160px tall and at most 200px wide, no page overflow, aligned cards/actions, plus variant selection. Evidence: storage/app/product-card-ui-check.

Limitations: source photos retain embedded whitespace and backgrounds. Browser geometry checks do not establish equal apparent subject sizes or WCAG compliance. Dark theme, screen reader and zoom review were not performed in this follow-up.
