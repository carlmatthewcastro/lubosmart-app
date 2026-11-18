> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Login spacing review — 2026-11-14

## Follow-up: content-sized actions and compact registration

The user's follow-up replaces the earlier 48px/full-width action design below.
Login, Google, role Continue, and registration action buttons now use intrinsic
content width with 16px horizontal padding, 14px labels, and a 44px minimum height.
Login and role-choice actions are centered. Inputs/selects use 44px height with
16px text. Role cards use 8px vertical padding and 32px icons; registration steps,
section spacing, and field row gaps are reduced. Reserved field feedback stays
in place. All fields, roles, and form behavior remain available.

The existing browser harness limitation below remains unresolved; these layout
changes still need manual visual, mobile, zoom, and keyboard review.

Follow-up validation: ESLint, TypeScript, Prettier, and production build passed.
The authentication suite passed: 705 tests, 4,480 assertions, 3 skipped. The
category-atlas runtime asset warning remains present in the build.

Applied a login-only compact layout: 440px desktop content width inside a 488px
card, 48px inputs and action buttons, 16px button text with a 24px line height,
20px action icons, and an 8px icon-to-label gap. Remember-me spacing and footer
spacing are reduced. The Google error container only renders when an error exists.
Button labels have explicit spans to align consistently with their icons.
Registration sizing, authentication routes, and request behavior are preserved.

Validation: targeted ESLint, TypeScript (`tsc --noEmit`), Prettier, production build,
and AuthenticationTest passed (5 tests, 30 assertions). The build still warns that
`/images/categories/category-atlas-v1.png` must resolve at runtime.

The existing auth browser harness started with an isolated database and headless
browser but failed on the homepage before reaching login: `getComputedStyle`
received a missing element. It does not establish visual verification of this
change. Manual checks of alignment, 320px reflow, light/dark appearance, keyboard
focus, zoom, and assistive technology remain outstanding. No WCAG certification
is claimed.
