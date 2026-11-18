> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Buyer order tracking reference — 2026-11-15

Updated the buyer /orders page with a purple tracking banner, responsive status
navigation, search, compact parcel cards, connected progress indicators, COD totals,
and quick actions for details, handover history and eligible product reviews.
Existing shared navigation, branding, theme tokens, cancellation confirmation,
private proof links, return links and parcel messaging remain in use. Seller and
admin parcel summaries retain their previous presentation.

The reference is adapted to existing server queues: new orders and delivery issues
remain reachable. Per-stage counts, date filtering, product photos and buy-again
actions were not added because the current page payload and workflows do not
provide them. Package placeholders identify parcels without inventing product art.
Banner artwork uses decorative Lucide package, truck and location icons.

Validation: targeted ESLint and TypeScript passed. MarketplaceFlow and
MarketplaceExtensions passed: 35 tests, 478 assertions. Production build passed;
existing catalog image URL resolution warnings remain.

Browser rendering was not verified. Mobile/tablet/desktop reflow, 200%/400% zoom,
light/dark contrast, keyboard and screen reader interaction still need manual
review. Automated checks do not establish WCAG compliance or an exact visual match.

## Buyer dialogs follow-up

Track parcel, View details, and Leave/Edit review now open themed Radix dialogs.
The record header and action menu use the same dialogs for buyers; seller/admin
disclosures remain available. Dialogs include titles, descriptions, viewport-bound
scrolling, Escape/close handling and focus restoration to their invoking controls.
Tracking shows reverse-chronological handover stages, recorded dates and explicit
Not recorded labels; exception warnings and tracking references remain visible.
Details show item quantities, existing subtotal/discount/COD values, shipping
address and cash payment information. Product images remain package placeholders.

Reviews use native radio inputs styled as stars, existing 3–2000 character body
validation, server errors, moderation warnings and the original per-item endpoint.
The reference's 500-character counter was adapted to the existing 2000-character
limit. Multi-item parcels show a separate editor per product; single-item review
dialogs close after a successful save. Cancel does not submit a mutation.

Follow-up checks: targeted ESLint, TypeScript, production build and the same 35
MarketplaceFlow/MarketplaceExtensions tests (478 assertions) passed. Browser tools
were unavailable; actual focus, star keyboard navigation, mobile/zoom rendering,
contrast and precise reference matching still require manual verification.

## Shopping bag banner alignment

Replaced the buyer's separate dark-purple tracking banner with the same shared
Page storefront header, catalog styles and shopping-bag SVG artwork used by the
shopping bag page, following the latest supplied reference. The buyer heading
remains Orders & tracking with its order-specific description. Existing responsive
banner layout and dark theme styling are reused; order filters, cards and dialogs
retain their workflows. Seller/admin pages retain their operational headers.

Validation: targeted ESLint, TypeScript, production build and MarketplaceFlow
tests passed. Browser visual, theme, zoom and mobile checks remain unverified.

## Actual product photos

Buyer order cards now list each purchased item with its current product photo,
snapshot name/variant and quantity. Order Details uses the same image component.
Images have fixed thumbnail dimensions, contained presentation, lazy loading and
product-name alternatives; missing or failed images retain the package fallback.

The buyer index eager-loads only product id/image_path, exposes the existing public
image URL as product_image_url and removes the loaded product relation before
serialization. Seller/admin responses retain their previous shape. Photos come
from the current listing, including hidden purchased listings, rather than a
checkout-time image snapshot. No order, pricing or authorization rules changed.

Validation: ESLint, TypeScript and targeted Pint passed. MarketplaceExtensions and
MarketplaceFlow passed with 37 tests and 520 assertions, including current-photo
and no-photo payload cases. Production build passed with existing image URL
resolution warnings. Actual browser image loading, responsive rendering and dark
mode remain unverified because browser tools are unavailable.

## Buyer search removal

Removed the buyer Orders search label and field at the user's request. Status
navigation and parcel counts remain. Status links send only the selected stage,
so they clear any old search query. Seller filters and backend search support are
unchanged. Targeted ESLint, TypeScript, production build and MarketplaceFlow tests
were run for this batch; browser rendering remains unverified.
