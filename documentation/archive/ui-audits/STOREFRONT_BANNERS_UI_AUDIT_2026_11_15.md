> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Storefront banners — 2026-11-15

Updated the shared storefront heading used by Marketplace, Saved products and
buyer Orders with a rounded purple gradient, white text, subtle circular detail,
more breathing room and a quiet shadow inspired by Returns and Contact us.
Orders uses a local decorative parcel/cart/tracking illustration instead of the
generic shopping bags. Returns keeps its existing illustration and scoped styling.
The approved homepage, navbar, routes and workflows remain intact.

Small screens stack text above the decorative artwork. Artwork uses CSS pseudo
elements and introduces no extra accessible content or requests to external hosts.
The shared Page component accepts an optional shopping/orders banner variant.

Targeted ESLint, TypeScript and production build passed. WishlistTest and
SettlementAndReturnsTest passed (43 tests, 714 assertions).
Browser rendering, light/dark contrast, 320px reflow,
200%/400% zoom and assistive technology verification remain pending; no WCAG
compliance claim is made. Production build keeps public-image runtime resolution
warnings; all referenced banner SVGs are present locally.
