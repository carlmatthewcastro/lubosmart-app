> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Return product images — 2026-11-16

Return cards now receive the existing public product image URL for every authorized
role viewing a return, rather than only buyers. Existing record visibility and
private evidence permissions remain unchanged. The shared OrderProductImage
component already displays the photo with contained sizing, descriptive alt text,
lazy loading, and a package fallback when the photo is missing or fails to load.
No styles or layout changes were needed.

Validation: Targeted return-card tests passed, including
buyer and seller payload checks with and without product photos. Targeted ESLint,
TypeScript, PHP syntax, and production build passed. Build reported runtime image
URL resolution warnings for existing catalog, orders, category, and returns art.

Actual browser rendering and image availability for the screenshot's products
were not verified. Mobile, themes, zoom, keyboard, and screen-reader checks remain
manual verification items; automated checks do not establish WCAG compliance.
