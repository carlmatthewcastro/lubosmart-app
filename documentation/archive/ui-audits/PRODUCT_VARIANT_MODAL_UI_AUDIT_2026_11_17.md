> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Product variant modal UI audit

Date: 2026-11-17

- Replaced the product card's inline size/color dropdown with a compact trigger beside stock. The existing dropdown now lives inside the shared Radix dialog, reducing the extra card height for products with variants.
- Kept variant identifiers, unavailable-option restrictions, cart requests, authentication links, branding, and prices intact. Add to Cart opens the selector when an option is required; variant validation errors are visible.
- The shared dialog supplies a title, description, close control, focus containment, Escape handling, and viewport scrolling.
- Validation: targeted ESLint, TypeScript, production build, and relevant marketplace/homepage feature tests. Feature tests: 41 passed (644 assertions). Build passed with unresolved image URL warnings for existing catalog/orders/returns banners and category atlas.
- Browser visual review was not performed. Mobile wrapping, side-by-side card alignment, light/dark appearance, keyboard focus restoration, screen reader behavior, and zoom remain unverified. Automated checks do not establish WCAG compliance.
