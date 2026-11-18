> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Notification UI verification — 2026-11-10

This audit is separate from the pre-existing pending `UI_UX_AUDIT.md` edits.

## Implemented surfaces

All five operational role headers use the shared persistent notification bell. At the user's request, redundant work-queue dropdowns and checklist icons were removed from all role toolbars, including their menu-specific state and polling. Dashboard counts, backend queue endpoints, sidebar navigation, and the notification bell remain. The shared preview and full history preserve LubosMart tokens, typography, rounded surfaces, existing role layouts, and theme preference.

The preview is constrained to viewport width and a scrollable 70dvh height. Focusable controls use installed shared buttons and Headless UI popover behavior. Content uses text plus icons for unread/action state, readable timestamps, explicit empty/loading/error text, and nullable authorized links. Polite count/toast announcements and error alerts are implemented.

Normal success feedback dismisses after four seconds, with close controls. Duplicate identical toast events within four seconds are suppressed. Desktop feedback sits below the header at the upper right; mobile feedback sits above bottom navigation. Toast layering leaves the open notification panel above feedback.

## Validation status

- Full backend suite during implementation: 1,161 passed, 3 skipped, 9,301 assertions; before final inbox-test additions/refinements.
- Final standalone inbox suite: 17 passed, 104 assertions.
- Final focused backend regression: 123 passed, 1,465 assertions, covering inbox, settlements/returns, logistics workspace, mobile role parity, and transactional mail.
- Final TypeScript, targeted ESLint, targeted Prettier, Pint, production Vite build, and Git whitespace checks passed.
- Initial isolated Chrome acceptance run passed all five roles: preview, Escape focus restoration, category switching, pagination, mark-all-read, and 320px/768px reflow. Runtime exception list was empty.
- Browser work found and corrected a desktop toast overlapping the bell. The acceptance test also exposed harness-only timing/session-switch issues, corrected by waiting for fetched category data and explicitly logging out synthetic accounts between role runs.
- Final acceptance passed all five roles and additionally verified a new database notification appearing through live polling without navigation/refresh, plus one toast for repeated identical events. Zero uncaught browser exceptions. Results and screenshots are stored under `storage/app/notification-ui-check/`.
- Desktop preview and narrow light/dark screenshots were visually inspected. The screenshot harness waits for fetched preview rows and theme color transitions before capture. These checks do not measure contrast.
- The additive table migration was applied only after verifying `APP_ENV=local`, a local database host/path, and no configured remote connection URL. No production migration or deployment occurred.

## Remaining manual verification

Follow-up after removing the redundant header queues: targeted ESLint, TypeScript, Prettier, production build, and 26 relevant backend tests (270 assertions) passed. The existing isolated notification browser check passed across all five roles, including live polling, keyboard focus restoration, read controls, and 320px/768px reflow, with no uncaught runtime exceptions.

Screen-reader behavior, actual contrast ratios, physical-device touch/landscape, and 200%/400% zoom remain manual checks. Automated reflow/focus assertions and screenshots do not establish WCAG compliance or measured Core Web Vitals. See [the full implementation report and role testing guide](../reports/ROLE_NOTIFICATIONS.md).
