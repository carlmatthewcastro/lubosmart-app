> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Homepage delivery truck update

Replaced the delivery SVG with a purple and orange cargo truck, open cargo bay,
parcels, appliances, and animated wheels. Four exhaust puffs expand, drift behind
the truck and fade. Pause controls all truck motion; reduced motion disables it
and hides exhaust. Reserved hero space now accommodates the 240 by 100px artwork.

Targeted ESLint, TypeScript and production build passed. HomepageProductsTest:
8 tests passed, 89 assertions. Build warns about runtime-resolved references to
catalog-shopping-banner.svg and category-atlas-v1.png.

Attempted the existing home-reference browser check. The homepage loaded without
runtime errors, but the harness failed on a missing element (getBoundingClientRect
on null). Visual, light/dark, responsive, pause, smoke timing and reduced-motion
verification of this update remain pending; automated checks do not establish
WCAG compliance.

Follow-up: removed the cargo LUBOSMART label and Pause control as explicitly
requested. Motion loops continuously at 14 seconds per crossing (previously 18).
The operating-system reduced-motion preference remains respected. Removed unused
pause state and styles. Targeted ESLint, TypeScript, build and HomepageProductsTest
(8 tests, 89 assertions) passed. Browser visual verification remains pending.
Removing the pause control leaves continuous decorative motion without an in-page
stop mechanism; WCAG motion-control compliance has not been established.
