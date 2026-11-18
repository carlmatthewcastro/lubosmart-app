> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Forgot-password reference — 2026-11-14

Applied the supplied rounded card composition, larger email control, full-width
reset action and centered sign-in footer. Retained LubosMart semantic theme tokens
and the existing six-digit email code recovery flow; wording accurately says
“Send reset code” rather than promising a reset link.

Targeted ESLint and TypeScript passed. Production build passed with the existing
unresolved category-atlas image warning. Password reset tests passed: 4 tests,
10 assertions.

The browser harness captured the updated desktop light recovery screen, but the
full matrix stopped on an unrelated registration page with a missing Vite manifest.
Complete mobile/dark, keyboard, screen-reader and zoom verification remains pending.
Automated checks do not establish WCAG compliance.
