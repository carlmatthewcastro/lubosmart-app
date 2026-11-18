> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Shopping bag reference layout — 2026-11-14

Applied the supplied reference to the existing shopping bag page. The page now
uses the same storefront Page banner and catalog artwork as Discover and Saved
products, rather than introducing a separate cart banner. Items and delivery
addresses share the main column; the order summary occupies the second column
when the available content width reaches 980px. Smaller layouts stack naturally.

Added contained product photos with an image-error fallback, lavender item rows,
section icons, selected address styling, provider warning cards and a purple
checkout action. Quantity controls retain 44px targets. Voucher feedback and
removal remain available, and existing checkout confirmation, shipping quote
refresh/retry, address creation, stock checks and request payloads are preserved.
The reference's item-selection and bulk-removal controls were not introduced:
the current checkout submits the whole bag and retains individual item removal.

Validation: targeted ESLint and TypeScript passed. Production build passed.
Checkout, MarketplaceFlow and MarketplaceExtensions tests passed: 59 tests,
572 assertions. Vite leaves the existing public image URLs to resolve at runtime.

Browser access was unavailable. Actual rendering at mobile/tablet/desktop widths,
zoom, light/dark contrast, keyboard paths, address forms and quote/error states
still need visual and interaction review. Automated checks do not certify WCAG.
