> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Compact product cards — 2026-11-12

Adjusted Home and Shop product grids to fit narrower cards across the available
width, following the supplied marketplace reference. Desktop grids use a 200px
minimum with equal flexible columns and 16px gaps. Homepage images now use square,
edge-to-edge regions with `object-fit: contain`; Shop images also use square regions
and contain the entire photo. Homepage mobile text remains readable at 14px for
names and 12px for supporting details. Narrow screens retain a single column,
with two columns from 380px on Home and Shop.

Product data, navigation, wishlist, variant selection and cart logic are unchanged.

Follow-up: the reference also requires a bounded layout when zooming out. Public
Home and Shop now have a 1440px maximum width, aligned to the start of the page
as in the zoomed-out reference. The catalog grid has a 1376px maximum width,
including inside authenticated layouts. This prevents additional columns as the
effective viewport grows. Homepage hero and seller text scale against the
storefront container rather than the expanding viewport.

Validation:

- Targeted ESLint, TypeScript, CSS Prettier checks and production build passed.
- HomepageProductsTest, MarketplaceFlowTest and MarketplaceExtensionsTest:
  43 tests passed, 567 assertions.
- Isolated fixture browser harness: `storage/app/compact-products-check.cjs`.
  Homepage measurements confirmed six columns at 1440px, three at 768px, two at
  380px and one at 320px, with square image regions, contained photos and no page
  overflow. Screenshots are in `storage/app/compact-products-check/`.
- Shop browser checks passed at 1440px, 768px, 320px, 360px and landscape
  844×390px, covering reflow, mobile navigation, filters, empty results and the
  keyboard skip link. Home and Shop dark screenshots were also captured.
- Follow-up browser measurements at effective widths 1440px, 2880px and 5760px
  confirmed six columns throughout, storefront width at most 1440px and no page
  overflow on Home and Shop. At 2880px and 5760px, Home cards remain about 212px
  and Shop cards 216px. The 5760px screenshot was scaled to 25% and visually
  reviewed against the supplied zoom-out reference. Harness and evidence:
  `storage/app/zoom-products-check.cjs` and `storage/app/zoom-products-check/`.
  This simulates the effective viewport and screenshot scaling; native browser
  zoom controls were not exercised.

Physical touch, assistive technology, actual browser zoom and measured contrast
have not been manually reverified. Automated checks do not establish WCAG
compliance. The build reports an existing unresolved category atlas image URL.
