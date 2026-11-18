> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Public home and account access polish - 2026-11-11

Refined the existing public home, sign-in layout, registration page and public
header while retaining the purple/lavender identity, orange brand accent, logo,
existing artwork, semantic theme tokens and Instrument Sans typography.

- Home: clearer hero hierarchy, product search using the existing `/shop?search=`
  contract (100-character limit), quieter benefits, readable section links and
  more consistent spacing. Empty search opens the complete catalog.
- Sign-in: focused form card with one page heading; removed duplicate branding
  within the card. The promotional panel no longer pushes the form below the
  fold on mobile. Existing validation, password visibility, Google sign-in,
  remember-me and recovery behavior remain intact.
- Sign-up: spacious two-column role choices that become a single column at
  narrow widths, actions immediately after the choices, and full-width mobile
  actions. Sidebar steps now reflect the actual personal, role-specific and
  review stages, including the selected/previewed role's document requirements.
  All existing fields, private uploads and approval/verification flows remain.
- Header: consistent appearance across the three pages, selected destination
  semantics, and a Categories link to the actual home category section.

Validation:

- Targeted ESLint and Prettier checks, TypeScript `--noEmit`, production build
  and Git whitespace check passed.
- Relevant Laravel tests: 52 passed, 385 assertions (homepage products,
  authentication, registration and PDF registration requirements).
- Existing isolated Chrome browser harness expanded to cover 1440px, 768px,
  320px, 360px and 844x390 landscape layouts, one page heading, no horizontal
  page overflow, mobile login reachability, light/dark screenshots, selected
  role navigation, trimmed/empty product search, email feedback, password
  visibility, keyboard skip-link focus and native radio arrow-key navigation.
- Browser fixtures use a disposable SQLite database and fake notifications and
  locations. Screenshots and results are in
  `storage/app/reference-design-ui-check/`; build output is in
  `storage/app/public-polish-build.log`.

Desktop, tablet and mobile screenshots were visually inspected. Narrow 360px
reflow represents the available width of a 1440px viewport at 400%; actual browser
zoom was not exercised. Screen readers, physical touch devices, measured contrast,
production network behavior, real Google OAuth and full end-to-end registration
submission were not manually reverified. Automated checks do not establish WCAG
compliance. No deployment, commit, push or branch switch was performed. Existing
working-tree changes were preserved.

## Follow-up: compact featured products

Limited homepage cards to 200px wide instead of stretching them according to
the number of products. Images are 120px high on desktop and 96px on mobile.
Mobile keeps two products per row, including at 320px. Reduced body padding and
price size while retaining product names, prices, stock, ratings, favorites and
44px primary actions. Catalog cards and purchasing behavior are unchanged.

Targeted ESLint, TypeScript, Prettier, production build and homepage tests passed
(8 tests, 89 assertions). The existing browser harness now supports a focused
featured-products run; it verifies compact card/image bounds and mobile columns
at 1440, 768, 320, 360 and 844x390, captures dark mode, and checks page overflow
and runtime exceptions. Results and screenshots:
`storage/app/featured-products-compact-check/`. Actual browser zoom, screen-reader
and physical touch-device verification remain outstanding.

## Follow-up: remove shopping guide disclosure

Removed the homepage's “How shopping with LubosMart works” disclosure and its
footer anchor link at the user's request. Product discovery and seller signup
remain available. Removed unused imports and updated existing browser assertions
to expect the guide and its anchor link to be absent. ESLint, TypeScript,
production build and homepage tests passed (8 tests, 89 assertions).
The homepage browser check passed across desktop, tablet, mobile and landscape,
including assertions that the disclosure and footer anchor are absent.

## Follow-up: keep hero search visible

Replaced the collapsed product-search disclosure with a permanently visible,
associated Search products label and search form above Shop Now and Become a
Seller, matching the user's supplied crop. Mobile search and actions stay in
document flow instead of overlaying the artwork. Search request and destination
URLs are unchanged. ESLint, TypeScript, formatting, production build and homepage
tests passed (8 tests, 89 assertions). The browser harness checks visibility and
separation between the search and actions at every tested viewport.
The homepage browser run passed at desktop, tablet, 320px/360px mobile and
landscape widths, including search submission and the visible-search assertion.
Physical-device, screen-reader and actual zoom limitations remain as noted above.

## Follow-up: continuously floating hero artwork

Added a gentle five-second looping float to the homepage marketplace artwork.
The animation uses the individual translate property so the existing mobile
scale and image dimensions remain intact. A labeled pause/play button holds and
resumes the current frame. Reduced-motion preference disables both the animation
and its control. ESLint, TypeScript, formatting, production build and homepage
tests passed (8 tests, 89 assertions). The browser harness now exercises automatic
movement, pause/resume and reduced-motion behavior in addition to existing reflow
checks. Build log: `storage/app/home-art-motion-build.log`.

## Follow-up: remove Discover Great Finds banner

Removed the homepage Discover Great Finds promotional banner, its Explore the
shop button and decorative bag at the user's request. Categories now lead
directly into Featured Products. ESLint, TypeScript, formatting, production build
and homepage tests passed (8 tests, 89 assertions). Build log:
`storage/app/remove-discover-banner-build.log`.

## Follow-up: seller banner refinement

Adjusted the seller banner to preserve the top of the owner's photo, use more
balanced desktop spacing and a 48px purple primary action. On mobile, the complete
description and action appear above a separate 220px photo instead of overlaying
small text on the owner's face. Dark surfaces and text use semantic theme tokens.
The original image and seller registration URL remain intact.

ESLint, TypeScript, formatting, production build and homepage tests passed
(8 tests, 89 assertions). Existing browser coverage checks the signup destination,
touch target and separation of mobile copy/photo, with dedicated screenshots in
`storage/app/home-reference-match-check/seller-{width}.png`. Build log:
`storage/app/seller-banner-refinement-build.log`.
Desktop and 320px banner crops were visually inspected. The final homepage
browser run passed across desktop/tablet/mobile/landscape and light/dark states.
The harness now snapshots public build/images in its temporary stage, as the
first attempt was interrupted by a concurrent build removing the manifest.
Physical devices, screen readers and actual zoom remain unverified.

## Follow-up: hide the search heading

Removed the visible Search products heading/icon above the homepage search bar.
The input retains its associated screen-reader label; the search bar, search
icon inside the input area, Search button and shopping actions remain visible.
Mobile spacing preserves separation from the floating illustration. ESLint,
TypeScript, formatting, production build and homepage tests passed (8 tests,
89 assertions). Build log: `storage/app/home-search-label-build.log`.

## Follow-up: compact search and cleaner hero buttons

Removed the Shop Now arrow. Reduced the homepage search from a 650px maximum
width and 52px controls to a 440px maximum with 44px controls and tighter padding.
Kept 16px input text and the existing search request. Shortened the placeholder
to Search products. Hero actions use consistent corners, balanced mobile columns,
a solid purple primary action and a quieter outlined seller action. Added hover
and focus feedback with transitions limited to normal-motion preferences.

ESLint, TypeScript, formatting, production build and homepage tests passed
(8 tests, 89 assertions). Build log: `storage/app/hero-controls-polish-build.log`.

## Follow-up: eight featured products

Expanded the homepage preview collection to eight products using existing public
images. Available server products remain first; sample cards fill the remaining
positions up to eight, including when there are no available products. Samples
retain the existing Sample preview label and do not become database products.
The existing four-column desktop and two-column mobile grid provides two desktop
rows and four mobile rows. Server selection, catalog, cart and stock rules are
unchanged. No deployment was performed.

ESLint, TypeScript, formatting, production build and homepage tests passed
(8 tests, 89 assertions). The homepage browser assertion now expects eight cards.
Build log: `storage/app/eight-featured-products-build.log`.
