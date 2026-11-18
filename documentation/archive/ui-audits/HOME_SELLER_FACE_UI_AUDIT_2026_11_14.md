> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Homepage seller face update — 2026-11-14

Changed only the seller banner image reference in the homepage. The edited asset
is `public/images/brand/home-seller-face-v3.jpg` (1400 × 467); earlier versions remain.
Existing dimensions, alternative text, lazy loading, and styles are preserved.

Revised with the built-in imagegen tool using the latest school-ID portrait as
the sole identity reference. Prompt: faithfully match the reference face shape,
forehead, eyes, nose, cheeks, jawline, toothy smile and center-parted black hair;
avoid beautification; preserve purple apron, white shirt, crossed arms, storefront,
lavender left side and wide banner layout.

ESLint and TypeScript checks passed. HomepageProductsTest passed (8 tests,
89 assertions). Generated artwork was visually inspected. Browser verification
of desktop/mobile and light/dark rendering remains outstanding; automated checks
do not establish WCAG compliance.
