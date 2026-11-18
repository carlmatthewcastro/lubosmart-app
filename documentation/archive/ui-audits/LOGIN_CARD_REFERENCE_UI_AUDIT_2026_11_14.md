> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Sign-in reference card — 2026-11-14

Applied the supplied card layout to sign in, retaining LubosMart semantic purple
tokens and the existing homepage-backed dialog. Google remains the only social
provider. Email/password submissions, remember choice, recovery and registration
routes remain intact. Password supports a text Show/Hide control; recovery sits
beside its label. Sign-in and Google buttons fill the card width.

Validation: targeted ESLint, TypeScript and production build passed; authentication
and Google tests passed (22 tests, 180 assertions). The production build reports
an existing unresolved category-atlas image reference.

The existing browser harness stops on the homepage with a getComputedStyle error
before reaching sign in. Visual, keyboard, screen-reader, zoom and light/dark
verification remain pending; automated checks do not establish WCAG compliance.
