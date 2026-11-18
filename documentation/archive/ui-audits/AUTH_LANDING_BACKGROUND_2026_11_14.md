> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Landing background for account access

Sign In and Sign Up now show the current landing component behind a centered,
solid auth panel. Background opacity is 25%; it is fixed, clipped to the viewport,
inert, hidden from assistive technology and has animations disabled. The previous
intro panel is hidden on these pages. Registration details use a wider card and
retain normal page scrolling. Recovery and verification layouts remain unchanged.

The shared homepage's backdrop option omits its document title/meta, skip link
and main-content ID so the auth page keeps its own title and focus target. No auth
routes, form fields, validation, Google sign-in or registration logic changed.

Validation: targeted ESLint, TypeScript, formatting and production build passed;
39 authentication/registration feature tests passed (253 assertions). Isolated
browser checks passed for /login, /register and /register?role=seller at 1920,
768 and 320px, including light/dark screenshots, inert background, opacity,
document title, one main target, no horizontal overflow and keyboard focus outside
the backdrop. The account-type Continue link still opens buyer registration.
Screenshots/results: storage/app/home-reference-match-check. Desktop login
screenshot visually inspected. Full screen-reader/zoom review and every role's
completed registration submission remain outside this visual check; automated
checks do not establish WCAG compliance. Existing category-atlas-v1.png build
warning remains.
