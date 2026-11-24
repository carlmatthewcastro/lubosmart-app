# Compact product cards and consistent photo crops — 2026-11-21

The shared ProductCard grid previously expanded into at most four columns with square image areas. On wide screens this produced oversized cards, while contain fitting exposed different blank areas around portrait and landscape photos.

- Grid columns now stay at 200px, shrinking only when the entire container is narrower. Additional columns fit as space permits; incomplete rows do not enlarge cards.
- Photo frames have a fixed 144px height. Original photos fill the frame using a centered cover crop without stretching; some source edges are intentionally outside the thumbnail.
- Removed the four demo-only white-canvas substitutions so all product sources use the same rendering rule. Original files, generated assets and attribution records remain intact.
- Titles reserve two 20px lines. Product details, variants, wishlist and cart behavior remain intact.

## Validation

- Targeted ProductCard ESLint, TypeScript and production build passed. Existing runtime artwork URL build notices remain.
- HomepageProductsTest and MarketplaceCatalogTest passed: 20 tests, 324 assertions.
- Updated existing disposable browser regression with sixteen synthetic products and the labels, watering can and pots source photos from the reported screenshot. Homepage and shop passed at 320, 540, 800, 1100, 1440 and 1920px: no horizontal page overflow, image frames at most 200px wide and exactly 144px tall, cover fitting, aligned card heights/actions, and at least six columns on wide screens.
- Variant selection, loaded original photos, broken-image fallback, guest/detail destinations and list mode at 320/800/1440px passed.
- Desktop homepage, shop and first-row preview screenshots visually reviewed. Evidence is in `.tools/development-artifacts/storage-app/product-card-ui-check/`, including `compact-product-preview.png` and `results.json`.

## Limits

The preview uses isolated SQLite fixtures and source photos, not customer data. Center cropping aligns photo areas; it does not remove original backgrounds or infer a subject's boundaries. Dark-mode screenshot was captured but not visually reviewed in this batch. Screen-reader, physical touch and 200%/400% zoom reviews were not performed; these checks do not certify WCAG compliance. No deployment was performed.

## Follow-up: fill the available row width

The fixed 200px columns left unused space at the right edge at normal browser zoom. This follow-up supersedes the fixed-width grid described above: columns now use `repeat(auto-fill, minmax(min(100%, 180px), 1fr))`. More compact columns fit as space permits, and remaining width is shared evenly. Auto-fill retains column sizing for incomplete final rows. The 144px photo height and centered cover crop remain unchanged.

Validation: targeted ESLint, TypeScript, CSS formatting, production build and the same 20 Laravel tests (324 assertions) passed. Existing artwork URL build notices remain. The disposable browser regression passed separately in installed Chrome and Edge with clean profiles, default 100% zoom and device scale factor 1: homepage and shop at 320, 540, 800, 1100, 1440, 1536, 1916 and 1920px. Fully populated first rows leave less than 2px unused at the right, without horizontal page overflow; image height, compact desktop widths, card/action alignment, variants, original image loading, fallback, destinations and three list-view sizes also passed. Desktop Edge screenshots visually reviewed. New evidence is in the `chrome/` and `edge/` subdirectories of the existing artifact directory. Prior accessibility/zoom-review limits still apply.
