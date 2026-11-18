> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Button interaction update — 2026-11-14

Shared Button and marketplace button class exports now use rounded corners,
token-based depth, hover/focus lift, and pressed feedback. Quiet/link variants
avoid hover lift. Disabled, aria-disabled and busy buttons do not receive the
shared movement. Existing authentication primary buttons receive matching depth.
Existing handlers, routes, form submission and loading labels are preserved.
Reduced-motion preferences retain color and focus feedback without movement.

Validation: targeted Button ESLint, TypeScript no-emit check, production build,
and authentication tests passed (7 tests, 38 assertions). The build reports an
unresolved category-atlas-v1.png reference that requires runtime verification.

Manual browser verification remains outstanding: light/dark appearance, touch,
keyboard focus, reduced motion, 320px reflow and zoom. This batch does not establish
WCAG compliance or verify every page action. Custom buttons outside the shared
styles retain their existing appearance.
