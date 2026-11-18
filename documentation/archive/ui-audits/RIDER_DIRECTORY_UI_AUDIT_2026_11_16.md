> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Rider directory refinement — 2026-11-16

## Scope

Company riders now use a compact directory with identity, email, capability,
registration date and progress, account status, and the existing action menu.
Capability is readable text with an Edit capability dialog, the same three
capabilities, and Save Changes. The existing PATCH URL and payload, validation,
server flash feedback, search, status filters, and sorting remain intact.

The shared directory also presents Rider Applications, other registration queues,
and User Accounts. Application review still opens the existing registration
review dialog; account details, history, and access actions remain available.
Sidebars, purple banners, illustrations, typography, tabs, routes, permissions,
and backend business rules were not changed by this refinement.

Existing avatar URLs are used where account data supplies them, with initials as
the fallback. Company riders and application list payloads do not supply photos;
these use initials. The application list does not supply capability or registration
dates, so these fields are not invented. Counts use existing totals, without a
summary card strip.

## Accessibility and responsive behavior

Tables have captions, scoped column headings, and named, keyboard-focusable
horizontal scroll regions. Long emails wrap, and overflow stays inside the table.
Status text accompanies color, hover and keyboard focus receive subtle emphasis,
and semantic theme tokens retain light and dark support. The existing Radix dialog
provides focus containment, Escape dismissal, focus restoration, and viewport
scrolling. The capability dialog honors reduced motion.

## Validation

- Targeted ESLint, TypeScript, Prettier, and whitespace checks passed.
- Production build passed. Vite reported existing runtime-resolved image URL warnings.
- Existing LogisticsWorkspace, LogisticsRiderRegistration, and
  AdminRegistrationNotifications tests: 258 passed, one skipped, 2,194 assertions.
- Browser fixture checks use isolated temporary SQLite databases, not application
  records. Rider directories and capability dialogs were checked at 320, 768, and
  1440px in both themes, including one page heading, no document overflow, three
  capability options, Save Changes, Escape dismissal, and restored trigger focus.
- Screenshots are under `storage/app/rider-directory-ui-check/`.

Remaining manual checks: screen-reader output, measured contrast, 200%/400% zoom,
touch devices, and populated application review/approval dialogs across roles.
The browser modal checks dismiss without saving; existing backend tests cover
protected workflows. Automated checks do not establish WCAG compliance.
