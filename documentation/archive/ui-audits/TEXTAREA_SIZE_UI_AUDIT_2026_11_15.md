> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Textarea sizing — 2026-11-15

Removed native textarea resize handles system-wide at the user's request. The
global base style disables manual resizing and retains vertical scrolling.
Shared Textarea and the support conversation composer use matching resize-none
and overflow-y-auto utilities; no resize-y/x/both overrides remain in resources.
Existing per-field rows, minimum heights, responsive widths, labels, validation,
length limits and submission behavior remain intact.

Validation: targeted ESLint, TypeScript, production build and SupportMessaging
tests were run. Browser tools are unavailable; actual long-text scrolling,
mobile/zoom reflow and light/dark rendering still need manual verification.
