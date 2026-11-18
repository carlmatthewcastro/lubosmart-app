> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Landing page width and live products

Removed the landing page's 1440px width cap so it fills the available viewport
instead of leaving a blank column on the right. Existing internal gutters remain.
The catalog width is unchanged.

Removed the hardcoded sample product array and automatic filler cards from
HomeDiscovery. Featured Products now renders only live products supplied by the
server, preserving the Sentient Magazine shown in the user's screenshot. No
database products were deleted or hidden by name; future live products can appear.

Validation: targeted ESLint, TypeScript, Prettier and production build passed.
HomepageProductsTest passed (8 tests, 89 assertions). The build still warns about
the existing unresolved category-atlas-v1.png reference. An isolated browser check
checks full viewport width, no horizontal overflow and no sample cards at 1920,
1440, 768 and 320px in light/dark mode. Screenshots and results are under
storage/app/home-reference-match-check. Fixture data is isolated from actual store
products, so the live Sentient Magazine inventory itself is not verified by this
browser run. Keyboard, screen-reader and zoom review remain incomplete; automated
checks do not establish WCAG compliance.
