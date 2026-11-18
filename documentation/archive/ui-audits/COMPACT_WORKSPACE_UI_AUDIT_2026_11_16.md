> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Compact desktop workspace — 2026-11-16

## Scope

The user's 90% browser-zoom screenshot is the density reference. At screen widths
of at least 64rem (1024px with the default browser font setting), pages containing
the existing shared `.workspace-shell` use a 90% root font size. Existing rem-based
type, spacing, sidebar widths, controls and portalled dialogs scale together.
This is an approximation of the reference, not a browser zoom override: pixel
dimensions and responsive breakpoints retain their existing behavior.

Mobile/tablet layouts below that breakpoint, public storefront/authentication
layouts without the workspace shell, and print retain their previous sizing.
Relative font sizing respects the browser's configured default text size; native
browser zoom remains available. No routes, permissions or business logic changed.

## Validation

- Targeted ESLint on the shared shell and sidebar layout passed.
- TypeScript (`tsc --noEmit`) passed.
- Production build passed. Existing unresolved catalog, orders, returns banner
  and category atlas image-path warnings remain.
- Dashboard and Logistics workspace tests: 71 passed, 1,036 assertions.
- No interactive browser or screenshot comparison was performed for this batch.
  Visual confirmation at 100%, 200%/400% zoom, 320px reflow, light/dark themes,
  keyboard navigation and portalled dialogs remains outstanding. These checks do
  not establish WCAG compliance or guarantee every page is visually unchanged.
