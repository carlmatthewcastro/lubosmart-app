> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Sign-in and sign-up control spacing

Expanded the centered auth card to 640px and registration details to 960px.
Reduced desktop inner gutters to 24px, with 20px/16px on smaller screens.
Visible text fields and native selects fill their containers at 52px height,
with 16px input/placeholder text. Primary and Google buttons use matching 52px
minimum heights and 16px labels. Registration action buttons fill the available
width on the narrowest mobile layout. Existing icon padding, password visibility,
form fields, validation and registration steps remain intact.

Validation: targeted ESLint, TypeScript, Prettier and production build passed;
authentication/registration feature tests passed (39 tests, 253 assertions).
The isolated browser spacing check exercises login, role choice and seller
registration at desktop, tablet and 320px in light/dark mode, checking field and
button dimensions, no overflow, backdrop focus exclusion and registration role
navigation. Screenshots/results: storage/app/home-reference-match-check.
Full manual screen-reader/zoom and completed registration for every role remain
unverified. Existing unresolved category-atlas-v1.png build warning remains.
