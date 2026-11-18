> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Poppins system font

User requested Poppins across the web system. The shared Blade shell now loads
Poppins weights 400–900 through the existing Bunny Fonts provider, with swap and
system sans fallbacks. The Tailwind sans token, shared wordmark, storefront and
homepage overrides, and auth heading now use Poppins. Removed the redundant
homepage-only font stylesheet. Font sizes, colors, spacing, and workflows remain
unchanged. UI standards now record the user's typography preference.

Validation: targeted ESLint, TypeScript and production build passed. Homepage,
dashboard and authentication feature tests passed: 17 tests, 153 assertions.
The build retains the existing category-atlas-v1.png unresolved asset warning.
The existing homepage browser script loaded the page without runtime errors,
then stopped at the previously failing "featured photos stay compact" assertion.
Full page-by-page visual, mobile/zoom, keyboard and light/dark review, and external
font loading verification remain incomplete. Automated checks do not establish
WCAG compliance. This change covers the web UI; email-client fonts are unchanged.
