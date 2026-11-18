> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Auth notification adjustment — 2026-11-14

Moved the shared auth notification from 16px to 32px below the viewport top. Error messages use the destructive red token for text and a translucent red border, with a red dismiss-button hover and visible keyboard focus. Success and warning presentation and notification behavior are preserved.

Validation: targeted ESLint, TypeScript, production build, and all 37 registration frontend tests passed. Relevant Laravel registration tests: 415 passed, 3 skipped (2,606 assertions). Build reports an unresolved category-atlas image reference, unrelated to this component. Frontend tests emit React mock warnings while passing.

Browser visual review, light/dark contrast measurement, mobile reflow, screen reader, keyboard, and zoom checks remain unverified for this adjustment. Automated checks do not establish WCAG compliance.
