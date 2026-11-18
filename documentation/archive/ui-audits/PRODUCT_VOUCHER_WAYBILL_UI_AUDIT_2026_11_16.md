> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Product, voucher, and waybill refinement

Implemented against the supplied composite reference and pasted requirements on
2026-11-16. Existing pending workspace changes were retained. No migrations,
controller, route, financial calculation, checkout, or mobile API changes were made.

## Implementation

- `resources/views/components/seller/product-form.tsx`: extracted the existing
  shared Add/Edit form; responsive media and information columns, local image
  replacement preview with object URL cleanup, grouped numeric fields, compact
  feedback spacing, and one right-aligned Cancel/Save action group. Existing
  payload, stock concurrency field, variants, categories, validation constraints,
  confirmation, upload progress, and visibility values remain intact.
- `resources/views/pages/marketplace/inventory.tsx`: consumes the shared form.
- `resources/views/pages/seller/vouchers.tsx`: compact template cards, shared Radix
  creation dialog, confirmation before activation, live maximum budget, status
  badges, usage details, responsive management cards and existing history/filters.
  Pause/resume is omitted for expired/exhausted vouchers. No edit/delete added.
  Summary metrics explicitly describe the current paginated page, not store-wide
  totals; the existing controller only supplies paginated voucher records.
- `resources/views/pages/marketplace/waybill.tsx` and
  `resources/css/waybill.css`: existing wordmark in monochrome, QR and facts before
  barcode, 38 mm printed SVG QR including its original four-module quiet zone,
  compact black/white sections, existing A5 paper/margins and COD expression.
- `resources/views/components/logistics/parcel-barcode.tsx`: parse JsBarcode's
  CSS-length width/height into unitless SVG viewBox dimensions. This corrects
  scaling without changing CODE128 data, barcode identity, or quiet zones.

## Verification

- Targeted ESLint, TypeScript `--noEmit`, Prettier and production Vite build.
- `php artisan test --compact tests/Feature/MarketplaceFlowTest.php
  tests/Feature/MarketplaceExtensionsTest.php`: 42 passed, 718 assertions.
  Existing coverage includes inventory upload/update/ownership, voucher eligibility,
  limits, cancellation release, public visibility, financial snapshots and waybill
  permissions. These tests do not establish physical printer compatibility.
- `node tests/Frontend/product-voucher-waybill-browser-check.cjs` uses an isolated
  temporary SQLite database, existing synthetic acceptance fixtures and headless
  Chrome/Edge. It checks product reflow at 320/768/1440 pixels; voucher dialog
  reflow, dark capture, Escape, template filling, live 20 x 5 budget, confirmed
  creation, visibility update, pausing and active/paused filters. Both rendered
  SVGs are rasterized at 300 DPI and decoded with the installed ZXing library;
  decoded values must equal the actual test parcel tracking reference. A5 PDF
  generation checks one page for the fixture parcel.
- Screenshots, rendered code images, PDF and results are under
  `storage/app/product-voucher-waybill-ui-check/` (local acceptance artifacts).

## Limits and remaining verification

- Physical printer output and scans using actual rider/logistics devices remain
  unverified. Software raster decoding is evidence, not a physical scanning test.
- Browser acceptance exercises the Add form visually; existing backend tests
  exercise creation/editing and uploads. Interactive replacement-file selection,
  every product update field, sidebar collapse, 200%/400% zoom, screen readers,
  contrast measurement and unusually long printed contents still need manual review.
- The waybill fixture has no line items or pickup address, so its empty contents
  and missing-address fallback are real fixture states, not production sample data.
  Unbounded content may require additional printed pages to remain readable; no
  truncation or financial/data changes were introduced to force it onto one page.
- Existing waybill payment presentation remains COD, matching the current order
  contract; no unsupported payment fields or alternate calculations were invented.
- Existing Vite warnings about runtime-resolved image URLs remain. Automated
  checks do not establish WCAG compliance or real-user performance metrics.
