> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Homepage reference match � 2026-11-11

Implemented the supplied desktop light/dark and mobile direction on the existing Inertia homepage. Added the Shop Smarter hero using the existing phone/cart/van illustration, compact benefit strip, eight categories, four featured products, orange discovery panel, seller invitation, and purple footer. Mobile has a working navigation toggle, four benefit/category columns, two product columns, and native collapsible footer groups. Search, account destinations, live products, cart and wishlist permissions, and announcements retain existing workflows. How it works remains available as a disclosure.

The primary brand token remains unchanged. Homepage lavender/plum surface tokens and CSS are scoped to `.reference-home`. The shared public header enables the new mobile behavior only when called with `home`.

Reference differences: the discovery panel has no fictional Flash Deals countdown, discount or unsupported promo. Real inventory replaces the four explicitly marked sample previews. Actual ratings and purchasing permissions determine product actions; guests sign in to shop. The original brand wordmark is preserved. Seller photography and two sample products are newly generated approximations, rather than extracted from the supplied composite screenshot. Search and account links remain reachable. Full screen-reader, measured contrast, physical touch and zoom audits remain unverified; passing automation does not establish WCAG compliance.

Validation: targeted ESLint and TypeScript, Prettier, production build, and HomepageProductsTest (8 tests, 89 assertions). Browser evidence is recorded by tests/Frontend/home-reference-browser-check.cjs in storage/app/home-reference-match-check, using an isolated SQLite database. See results.json for the final browser outcome and PNG files for visual review.

No branch switch, commit, push or deployment. Existing unrelated work preserved.

## Generated assets

Built-in imagegen mode; output compressed/resized as JPEG for the website. Generated source files remain in the default Codex generated_images location. Product images are illustrative sample previews, not actual inventory.

- public/images/brand/home-seller-reference.jpg (1400 � 467; about 104 KB)
- public/images/products/samples/reference-backpack.jpg (480 � 480; about 35 KB)
- public/images/products/samples/reference-bottle.jpg (480 � 480; about 17 KB)

Final seller prompt:

> Create a website banner background asset, wide landscape aspect ratio 3:1. No text, no lettering, no logos. On the RIGHT HALF: a friendly smiling young adult Filipina small business owner wearing a white t-shirt and rich purple apron, arms comfortably crossed, waist up, realistic polished commercial photography. Behind her a charming small shop with lavender and white striped awning, shelves with small parcels, plants and boxes. Right side warm and inviting, soft lavender background. LEFT HALF mostly empty very pale lavender gradient fading from the store scene, completely clear space for website HTML headline overlay. Match a polished purple local ecommerce marketplace, rounded friendly 3D storefront environment blended with photorealistic woman, soft studio lighting. Main person at 78% horizontal position. Do not add any buttons or UI. Save generated asset for local website use.

Final backpack prompt:

> Single product ecommerce catalog photograph: a modern slate gray travel backpack with black zippers and black handle, upright three-quarter front view, centered, fully visible, soft pale lavender studio background, soft shadow, no text, no logos, square composition. Match clean premium ecommerce product thumbnail.

Final bottle prompt:

> Single product ecommerce catalog photograph: a blush pink insulated stainless steel water bottle with a rose gold metallic cap and small dark carrying loop, upright, centered, fully visible, soft pale lavender studio background, soft shadow, no text, no logos, square composition. Match clean premium ecommerce product thumbnail.

Final browser run: PASS at 1440�1000, 768�1000, 320�900, 360�900, and 844�390; no page overflow, one page heading, two mobile product columns, four mobile benefit/category columns, working navigation toggle, trimmed search navigation, footer disclosure, and no runtime exceptions. Light/dark screenshots captured and reviewed at desktop and 320px mobile. Remaining verification limits above still apply.
