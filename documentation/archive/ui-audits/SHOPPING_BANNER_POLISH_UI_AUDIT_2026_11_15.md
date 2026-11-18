> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Shopping banner illustration polish — 2026-11-15

Improved the shared shopping illustration used by Cart, Marketplace and Saved
products in response to the supplied screenshots. The local SVG retains the
three purple/lavender bags and white cart mark, with dimensional side folds,
gradient surfaces, inset openings, rope handles, grounding shadows, subtle
sparkles and a small orange tag. The complete illustration fits inside its
480 × 256 viewBox with clearance above the main handle.

Shopping banners reserve proportionate artwork space on desktop and center the
artwork below the copy on mobile. Styling is scoped to `catalog-intro-shopping`.
The existing shared banner typography and purple identity are retained.

Validation:

- Targeted ESLint and TypeScript passed.
- Production build passed. Vite retains the existing runtime-resolution notices
  for public banner/category images; the shopping SVG is present locally.
- MarketplaceCatalogTest, CreateOrderFromCartTest and WishlistTest passed:
  42 tests, 362 assertions.
- Headless Chrome rendered the real Cart, Marketplace and Saved products pages
  against a disposable SQLite database with synthetic fixtures. All 36 route,
  viewport and theme combinations passed overflow and artwork-size checks;
  narrow layouts also passed text/artwork separation checks.
- Checked light/dark layouts at 1440, 768 and 320px widths, 844 × 390 landscape,
  plus 720 and 360px layouts as viewport-reflow proxies for zoom. These proxies
  do not establish actual browser zoom behavior.
- Visually reviewed captured Cart banners at desktop light, 320px light and
  tablet dark sizes. Handles, bag bottoms and shadows remain inside the banner.

Screenshots and results are in `storage/app/shopping-banner-ui-check/`. The
reusable local browser harness is `storage/app/shopping-banner-browser-check.cjs`.
Manual 200%/400% browser zoom, screen-reader verification and measured contrast
remain pending; automated checks and screenshots do not establish WCAG compliance.
