> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Homepage delivery truck — 2026-11-14

Replaced the lower hero text marquee with one decorative, code-native SVG LubosMart truck. It uses the existing purple and orange brand tokens, a gentle body bounce, turning wheels, sparkles, and an 18-second trip across a clipped delivery lane. The upper text strip remains. Hero bottom padding reserves room for the truck at all breakpoints.

A keyboard-accessible Pause/Play toggle pauses every truck animation. Reduced motion disables truck movement and wheel rotation, centers the truck, and hides the unnecessary animation control. Decorative artwork is hidden from assistive technology. No dependencies, routes, data contracts, or business workflows changed.

Validation: targeted ESLint and TypeScript passed. HomepageProductsTest passed (8 tests, 89 assertions). Production build completed successfully; Vite reported runtime-resolved catalog banner and category atlas asset warnings. PowerShell reported a nonzero wrapper status when redirecting native stderr, despite Vite's successful completion message.

An isolated temporary SQLite/headless Chrome run confirmed no horizontal page overflow at 320, 768, and 1440px in light and dark themes, working Pause/Play, and no truck animations under reduced motion. Artifacts and the disposable check script are in storage/app/home-delivery-check and storage/app/home-delivery-check.cjs. The mobile light screenshot was visually reviewed. Full keyboard navigation, screen-reader reading order, touch testing, 200%/400% zoom, and desktop visual review remain outstanding. These checks do not establish WCAG compliance.
