# Wordmark reference adjustment — 2026-11-21

The user clarified that the existing homepage navbar is the typography source for the sidebar shown in their screenshot. The shared wordmark now displays LubosMart using the original homepage Poppins family, weight 700, and -0.025em letter spacing. The earlier uppercase, heavier weight, and underline interpretation has been removed. The homepage and sidebar reuse the same component; the sidebar explicitly uses its white inverse variant as requested.

Validation: targeted ESLint for the shared wordmark, sidebar, and public header, TypeScript, production build, and HomepageProductsTest passed (9 tests, 103 assertions). The build retains four existing artwork URL notices.

Limits: no browser visual comparison, mobile reflow, zoom, keyboard, or screen-reader review was performed in this batch. White sidebar text is explicitly requested; contrast on the light sidebar is not verified.

## Follow-up: theme contrast and service-card motion

The user's subsequent screenshot identified white sidebar lettering on the light lavender surface as a problem. The sidebar now uses the shared wordmark's default theme colors: black in light mode and white in dark mode. This supersedes the earlier inverse-color request above; the font and size remain unchanged.

The homepage benefits (including Help & Support) retain their entrance reveal. Hover now moves only the icon upward by 2px and scales it to 1.04, with a 240ms transition. Removing the whole-card lift and shadow keeps text and separators stationary; the previous 8-degree tilt and 1.12 scale have been removed. Hover remains restricted to a fine pointer with hover support and no reduced-motion preference.

Validation: targeted ESLint, Prettier, TypeScript, production build, and HomepageProductsTest (9 tests, 103 assertions) passed. The build retains four existing artwork URL notices. Isolated headless Chrome checks and screenshots are stored in `.tools/development-artifacts/wordmark-service-motion/`. These cover service hover, reduced motion, and the admin sidebar's light/dark text colors. Full mobile, zoom, keyboard, and screen-reader review remains outside this focused check.
