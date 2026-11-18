> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Marketplace theme alignment - 2026-11-11

Aligned the public `/shop` catalog with the existing LubosMart homepage. Reused
PublicHeader, including selected Shop navigation, theme toggle and mobile menu.
The Page component opts into this treatment through its storefront prop; existing
authenticated layouts continue to supply their own navigation.

Added a lavender introduction, a full-width search field with a decorative icon,
consistent filter-card padding and clearer result counts. Catalog products use
smaller desktop cards and 4:3 image regions, with existing responsive mobile
columns. Styling also applies to saved-product results. Product data, prices,
stock, ratings, variants, wishlist and cart actions retain their existing logic.
Homepage header selectors now share their existing styling with the catalog;
homepage product styling remains scoped to the homepage.

Validation:

- Targeted ESLint, TypeScript `--noEmit`, Prettier and production build passed.
- MarketplaceFlowTest, MarketplaceExtensionsTest and HomepageProductsTest passed:
  43 tests, 567 assertions.
- Browser verification uses a disposable SQLite database and synthetic products,
  with fake notifications and location requests. Evidence and the local harness
  are in `storage/app/catalog-theme-check/` and
  `storage/app/catalog-theme-check.cjs`.
- Reflow checked at 1440px, 768px, 320px, 360px and 844x390 landscape, including
  one page heading and no horizontal page overflow. Public Shop selection,
  mobile navigation/account reachability, category control reachability, search
  empty results and the keyboard skip link are exercised. Light and dark
  screenshots are captured for visual review.

Actual browser zoom, screen-reader behavior, physical touch devices, measured
contrast and authenticated shopping mutations were not manually reverified.
These checks do not establish WCAG compliance. No deployment, commit, push or
branch change was performed; existing unrelated changes were preserved.
