> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Email verification alignment — 2026-11-12

The email verification page now uses the existing registration account-access
layout: lavender split shell, brand artwork, inset panel, shared primary action,
and theme control. Registration progress stays inside the panel in two columns
so labels fit smaller screens. Log out remains available; resend is a secondary
action, and the email correction toggle exposes its expanded state.

OTP submission, polling, resend cooldown, email correction requests, routes,
authentication and approval behavior retain their existing implementations.

Validation:

- Targeted ESLint, Prettier and TypeScript checks passed.
- EmailVerificationTest and RegistrationEmailCodeTest: 28 passed, 169 assertions.
- Production build passed. Vite reported an existing unresolved category image
  reference, `/images/categories/category-atlas-v1.png`, unrelated to these changes.
- Disposable browser checks use temporary SQLite and fake email delivery.
  Screenshots and results are in
  `storage/app/verification-registration-ui-check/`; the targeted check script
  is `storage/app/verification-registration-browser-check.cjs`.
- Light/dark layouts at 1440, 768, 320, 360 and 844px landscape widths have one
  page heading and no document overflow. Desktop dark and mobile light
  screenshots were visually inspected. Invalid-code focus and the email
  correction toggle were exercised.
- Resend, six-digit OTP paste and successful verification passed in the browser
  with no runtime exceptions or console errors. An initial harness attempt
  clicked before resend finished; waiting for the request to finish resolved
  that test timing issue.
- Screen readers, actual browser zoom, real touch devices, measured contrast,
  and real email delivery remain unverified. These checks do not certify WCAG
  compliance.

No Git operations or deployment were performed.
