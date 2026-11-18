> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Account role selection motion — 2026-11-14

Added registration-role-picker-only staggered fade/slide entrances, hover lift,
press feedback, smooth selected colors, and a finite selected-icon animation.
Existing layout, native radio controls, branding, routes and registration behavior
remain intact. No new dependencies. Motion runs only under
`prefers-reduced-motion: no-preference`; keyboard focus reveals all role cards
immediately. Heading focus and shared dialog positioning remain unchanged.

Validation: targeted ESLint and TypeScript passed; production build passed;
registration screen rendering test passed (1 test, 1 assertion). Build reported
the existing runtime-resolved category-atlas-v1.png warning.

Browser visual verification was not performed. Light/dark, 320px/tablet/desktop,
landscape, 200%/400% zoom, keyboard, screen-reader, touch and live reduced-motion
verification remain outstanding. Automated checks do not establish WCAG compliance.
