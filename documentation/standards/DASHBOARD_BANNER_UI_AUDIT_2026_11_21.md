# Dashboard welcome banner review — 2026-11-21

Implemented one role-aware `DashboardBanner` for Admin, Buyer, Seller, Logistics,
and Rider. Uses the existing logo asset through `AppLogoIcon`, existing
`AppWordmark`, Poppins font token, shared button styles, and Inertia navigation.
The prior generic welcome component remains available to the seller vouchers page.

Each dashboard now has the requested welcome copy, a 12px badge with a 14px
Lucide icon, muted role accents, and a secondary two-tone SVG scene. Desktop
banners measure approximately 260px tall. Illustrations hide below 768px; mobile
content wraps naturally. Dark mode follows the current theme. Admin account
navigation remains conditional on the server-provided accounts permission.

CTA destinations were checked against existing routes: `/accounts`, `/shop`,
`/inventory`, and `/deliveries`. Seller uses inventory as the existing store
management destination. Names come from the authenticated user's name, using its
first whitespace-separated word, consistent with the existing dashboards.

## Validation

- Targeted ESLint, Prettier checks, TypeScript, and `git diff --check` passed.
- Production Vite build passed. Existing unresolved asset warnings remain for
  catalog, orders, returns, and category artwork outside this change.
- Dashboard feature tests: 9 passed, 138 assertions.
- Existing isolated Chrome/SQLite dashboard browser harness passed for all five
  roles at 1440px, 768px, and 320px, plus dark mode at 320px. Checked one banner,
  personalized greeting, real logo URL, CTA labels and destinations, desktop
  height, one page h1, preserved summary sections, and no document overflow.
- No browser runtime exceptions or console errors were reported.
- Extended the existing dashboard browser check and corrected its omitted
  Rider summary selector.
- Screenshots and results are under the ignored
  `.tools/development-artifacts/dashboard-banner/` directory. Reviewed buyer
  desktop/mobile dark and rider/admin desktop screenshots.

## Remaining verification limits

Native links retain the shared focus-visible treatment, decorative SVGs are
hidden from assistive technology, and CTA controls retain a 44px minimum height.
Manual screen-reader, keyboard traversal, 200%/400% browser zoom, landscape,
font-download availability, and measured contrast checks were not completed.
Automated checks do not establish WCAG compliance or real-user performance.

Existing pending changes were preserved. No packages, backend code, navigation
layouts, APIs, or dashboard data workflows were changed by this banner task.
