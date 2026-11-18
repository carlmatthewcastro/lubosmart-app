> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Shared product card image presentation — 2026-11-17

## Follow-up: unused space beside the grid

The current workspace had compact 200px fixed grid columns and 160px image frames. Replaced the fixed column maximum with flexible tracks and auto-fit, capped at five columns. This fills the available row width while retaining the current compact photo height. The browser check now asserts the first row's rightmost card reaches the grid edge within 2px at every tested width; it no longer asserts cards must stay under 201px wide. Earlier square-image notes below describe the initial implementation, not the current 160px photo-frame choice.

Implemented in the existing ProductCard with shared `resources/css/product-cards.css`.
No photos, links, product data, authentication rules, cart requests or wishlist requests were replaced.

- Square white image surfaces use 16px padding. The follow-up removes the separate toolbar allowance so photos fill the available square; favorites use a raised circular control in the top-right corner.
- Images use full width/height, contain and center; shared styles override earlier fixed heights, lavender image surfaces and hover enlargement.
- Discovery and catalog grids use auto-fit to fill incomplete rows and available container width, a 240px minimum (or the full width on narrower containers), 16px gaps and at most five columns. Existing list-view column rules remain intact.
- Two 22px title lines with 18px bold text and a 24px variant area keep rows aligned. Prices use 22px bold text; details use tighter 4px gaps, and actions use solid purple with 12px corners. Variant selection remains in the existing dialog, directly beneath the title, with the chosen option visible on the trigger.
- Poppins, purple controls, real imagery, stock, ratings and existing actions remain in use.

## Verification

- Targeted ESLint, TypeScript, Prettier and production build passed. Vite retains existing runtime image URL resolution notices for storefront banners and category artwork.
- MarketplaceFlowTest and MarketplaceExtensionsTest: 44 tests, 762 assertions passed.
- `node tests/Frontend/product-card-browser-check.cjs` passed: homepage and shop at 320, 540, 800, 1100, 1440 and 1920px, no page overflow, white square image areas, contain styling, two-line title heights, matching card heights and action alignment within rows, maximum five grid columns.
- Browser variant check opens the dialog, chooses Small / purple, confirms Done and verifies selection retained beneath the title. Disposable SQLite fixtures are used; customer data is untouched.
- Desktop and mobile screenshots visually inspected. Evidence: `storage/app/product-card-ui-check/`, including results.json and home/shop screenshots at 320/1440px.

## Source limitations and remaining verification

Inspected original `database/demo/assets/photos/earphones.jpg` and `grip.jpg`.
Earphones have a wood tabletop baked into the photo. The grip source includes substantial white space and the phone case extends beyond the source edges. Contain displays the entire file; CSS cannot remove baked-in backgrounds/space or recover product content missing from the original photograph. Originals were preserved.

Browser evidence uses the four unchanged source photos shown in the user comparison (grip, gadget pouch, earphones and tablet stand), rather than every seller-uploaded image. Full authenticated cart/wishlist end-to-end flows, list-mode visual review, dark-theme visual review, physical touch, screen-reader and 200%/400% zoom audits were not performed for this batch. Automated checks do not establish WCAG conformance.

Follow-up reference correction: enlarged photos by removing the 60px top inset, removed the card gradient, increased title/price weight, tightened vertical gaps, restored circular favorite controls, changed the variant trigger to ?Options available?, and changed stock wording to match the reference. The four originals remain visibly different from the reference cutouts; no background removal or image generation was performed. The updated browser run passed all 12 viewport/page combinations and variant selection.
