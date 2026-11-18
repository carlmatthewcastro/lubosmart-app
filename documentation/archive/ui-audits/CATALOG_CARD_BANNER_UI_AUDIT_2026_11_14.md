> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Catalog card and banner review — 2026-11-14

Applied the supplied third screenshot as the decorative catalog banner background,
replacing the standalone logo artwork. The original brand logo elsewhere is unchanged.
The supplied image is copied unchanged to `public/images/marketplace/catalog-shopping-banner.png`.

List view uses a wider image column and stacks below 640px so the product image,
favorite action and details have room. Existing cart, wishlist and variant logic is unchanged.
The banner uses a translucent text surface on small screens and blends with the dark theme.

Validation: targeted ESLint and TypeScript passed; production build passed;
MarketplaceCatalogTest passed (11 tests, 221 assertions). Vite leaves the new public
banner URL to resolve at runtime; the asset is present at that path.

Visual matching, 320px/tablet/desktop reflow, zoom, dark-theme contrast and keyboard
checks still require browser verification. Automated checks do not establish WCAG compliance.

## Follow-up: card spacing, toolbar and banner

Replaced the raster banner background with native SVG shopping artwork for sharp
rendering at wide sizes. Reserved space above catalog photos for a bordered 44px
wishlist action. Widened the list details column, tightened footer spacing and kept
cart labels and rating counts together. Search, sort and view controls now share
44px sizing and bottom alignment, with labels above both search and sort.

Validation: targeted ESLint passed; production build passed; MarketplaceCatalogTest
passed (11 tests, 221 assertions). The public SVG exists; Vite leaves its URL for
runtime resolution. Browser visual checks, mobile/zoom, dark-theme contrast and
keyboard verification remain outstanding; automated checks do not certify WCAG.

## Follow-up: full artwork and responsive list width

Removed the shared 320px card maximum in catalog list view. List cards now use
one column until the results container itself reaches 560px, then show a 200px
photo beside flexible details. Product titles are readable without two-line
clamping in list mode; price stays together and cart text can wrap safely.
Grid/List controls now have visible labels and consistent touch targets.
The banner artwork has its own contained background layer and an inset SVG
viewBox so the bag handles and bottoms remain inside the illustration. Mobile
places the illustration below the heading. Product photos have explicit inset
bounds with object-fit contain to preserve the complete image.

Validation: targeted ESLint, TypeScript and production build passed. Catalog
feature tests passed (11 tests, 221 assertions). Actual browser rendering,
320px/zoom, keyboard and dark contrast checks remain unverified in this session.

## List-view rating placement

Moved the existing stars, average and review count below the product image only
in list view, using an explicit listView prop and a single shared rating fragment.
Grid and homepage rating placement remain unchanged. Wide list cards place details
beside the image/rating column; narrow cards keep image, rating and details in order.

Validation: targeted ESLint and TypeScript passed; production build passed;
MarketplaceCatalogTest passed (11 tests, 221 assertions). Browser visual verification
remains outstanding.
