> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Landing page hero accents

Scope: uppercase text strips with star separators sit inside the hero box at its
top and bottom. The top scrolls right to left; the bottom scrolls left to right.
Duplicated tracks create continuous loops. Hover no longer pauses motion, per the
user's follow-up; focus within the hero still pauses it, and reduced-motion
preferences disable animation. Hero padding reserves space
for both strips, including mobile. The landing header wordmark uses bold Instrument
Sans initially. The user's subsequent revision replaces this with mixed-case
"LubosMart" in plain Poppins 700, scoped to the landing header. The bubble stroke
and shadow were removed at the user's request. Poppins now loads globally through Bunny Fonts (see POPPINS_SYSTEM_FONT_2026_11_14.md);
visual rendering and external font loading remain unverified in a browser.
Theme button styling remains scoped to the landing header.

Validation: targeted ESLint, TypeScript, Prettier, production build and
HomepageProductsTest passed (8 tests, 89 assertions). The build reported an
existing unresolved category-atlas-v1.png reference.

The earlier home-reference browser script loaded the page without
runtime errors, then failed its unrelated "featured photos stay compact"
assertion. Full visual matching, light/dark review, mobile/zoom and keyboard
verification remain incomplete, including the revised animation in a browser;
automated checks do not establish WCAG compliance.
