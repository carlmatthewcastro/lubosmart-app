> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Postal auto-fill consistency — 2026-11-14

The cart address form now reuses the saved-address location selectors and postal
suggestions while preserving the existing address request names. Changing a parent
location clears dependent selections and the previous ZIP. The general onboarding
application now consumes the same postal suggestion returned by LocationController.
Both forms require four postal digits and explain the editable fallback.

Registration already shares its form across roles, with postal suggestions in the
seller/logistics and buyer/rider address components. Sign-in shares its email and
password controls with the authentication forms. No authentication rules changed.

Missing or ambiguous official city matches remain manual; the dataset does not
provide a complete barangay postal mapping. Account settings uses its separate
PSGC mapping and retains its existing approval and matching validation.

Validation: targeted ESLint and TypeScript passed; 96 relevant postal, saved-address,
and shared registration tests passed (424 assertions); production build passed.
Build warning: category-atlas-v1.png resolves at runtime and was not found at build
time. Browser, keyboard, screen-reader, mobile, zoom and light/dark visual checks
were not performed in this batch; these remain unverified. Automated results do
not establish WCAG compliance.
