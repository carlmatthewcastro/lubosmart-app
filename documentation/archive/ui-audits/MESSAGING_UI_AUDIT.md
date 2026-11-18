> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

﻿# Messaging UI and functionality audit

Reviewed 2026-11-10. Scope: the existing `/support` inbox, conversation page,
shared New Conversation dialog, and their controller. Existing unrelated working
changes, including shared controls and notification infrastructure, were retained.

## Existing implementation inspected

- React 19, Inertia v2, Tailwind v4, shared marketplace controls and Radix Dialog.
- `SupportCaseController`, `SupportCase`, `SupportCaseMessage`,
  `SupportCasePolicy`, `LogisticsContacts`, and `AdminWorkspace`.
- Web support routes, mobile support endpoints and `RoleDataController`.
- Support case/participant/message migrations and the per-user
  `support_case_reads` table in the admin foundation migration.
- Support inbox/thread, shared New Conversation, floating messages, InfoModal,
  shared feedback, filters, form controls and action dropdown patterns.
- Existing support authorization, evidence, admin read tracking, logistics center
  isolation, API parity, and notification feature tests.

The existing kinds are `message` and `complaint`; statuses are `open`,
`in_review`, and `resolved`. Order context is an optional seller parcel reference,
not a separate case kind. Formal complaints already share the support-case module,
including admin-only status changes, resolution notes and audit history. No second
case workflow or unsupported status was added. Case management uses its existing
confirmation flow; a new action menu is unnecessary for these actions.

Buyer, seller and rider accounts can contact support and provide an authorized
parcel reference. Admin can choose approved, verified non-admin accounts or order
participants. Logistics uses the existing center-scoped contact/parcel queries.
The policy protects conversation/evidence access; order participation is checked
on creation. Private JPG/PNG/PDF evidence and existing upload limits are retained.

There was already bounded pagination (15 conversations, 30 messages), a protected
attachment download route, per-admin read cursors, notification integration, and a
30-second polling quick-message panel. No WebSockets or delivery/read receipts
were present. Existing notifications and the floating panel remain in place.

## Implemented improvements

- Responsive inbox and inline thread, with mobile inbox-first navigation and
  keyboard focus on the selected thread and return to inbox.
- Participant roles, initials, message preview/time, case and parcel references,
  status badges and backend unread counts.
- Latest-message activity sorting, scoped subject/participant/parcel search,
  kind/status/unread filters, automatic filter requests and Clear Filters.
  Native selects retain shared purple focus/border styles and keyboard behavior.
- Separate empty inbox and no-matching-results states, thread loading and retry,
  explicit Refresh, periodic inbox updates and visible-tab/focused-thread polling.
  Earlier message pages are not replaced by polling.
- Filter requests use debounced current field state, including after a successful
  conversation-creation redirect. Refresh failures retain the loaded composer
  and draft alongside the retry message.
- Conversation context before recipient selection; conditional account/parcel
  controls; compact header and field spacing; optional attachment disclosure;
  viewport-bounded body and reachable footer.
- Recipient searches cancel obsolete requests. Switching selection method clears
  incompatible values and reloads options. Logistics can use its existing scoped
  recipient-selection methods from the main inbox as well as quick messages.
- Required topic/body/recipient checks and processing guards before submit.
  Successful creation refreshes the inbox after server confirmation. Existing
  Inertia errors retain drafts; message text clears only after successful sends.
- Incoming/outgoing bubbles based on the current sender, date grouping, role
  details, timestamps, descriptive evidence links, empty message history and
  initial scroll to the latest message.
- Enter-to-send, Shift+Enter for a newline, and composition-event protection.
- Per-user read tracking reuses the existing table; only opening the latest
  history page advances its cursor. Inbox retrieval alone does not mark read.
  Admin unread semantics continue to exclude messages from other admins.
- Fixed an eligibility bypass: admin creation now requires the same approved,
  verified recipient eligibility enforced by recipient search. A crafted email
  can no longer contact a pending/unverified account through this endpoint.

No dependency, migration, route, permission policy, status, historical message,
or attachment storage changes were needed. Existing notification work was not
replaced. This work is uncommitted and has not been deployed.

## Verification

- Combined Laravel run: **118 tests passed, 1,511 assertions** across
  `SupportMessagingTest`, `AdminManagementTest`, `LogisticsWorkspaceTest`,
  `MobileRoleParityTest` and `NotificationInboxTest`.
- Targeted ESLint, TypeScript (`tsc --noEmit`), Prettier and PHP Pint: passed.
- Production Vite build: passed.
- Dependency-free Chrome/Edge CDP checks use only a disposable SQLite database
  and synthetic accounts. Run `node tests/Frontend/messaging-browser-check.cjs`.
  Screenshots and machine-readable results are written to
  `storage/app/messaging-ui-check/`.
- Browser checks cover all five roles: desktop inbox/thread, Enter-to-send with
  confirmed message display, 320px/768px reflow, modal bounds at 320/768/1440px,
  disabled invalid submit, Escape close, no-match search and clearing filters.
  Light and dark screenshots were captured; representative screenshots reviewed.
- The final browser run passed all 16 checks, including confirmed conversation
  creation and filtering immediately afterward for every role. Expected 401s
  from background workspace polling during test logout are session teardown,
  not uncaught application exceptions.
- Initial script quoting failures were corrected before the passing browser run.
  A missing pagination type caught by TypeScript was also corrected.

## Remaining verification and recommendations

These checks do not certify WCAG compliance. Full screen-reader navigation,
contrast measurement, 200%/400% zoom, landscape, IME behavior on real devices,
file-picker interactions, network failure recovery and real-device touch testing
remain manual verification items. Polling cadence/background behavior and
simultaneous cross-tab read races were not stress-tested. Production query plans,
Core Web Vitals and large-dataset timings were not measured.

Use the existing Refresh action if polling is paused or the browser is inactive.
No delivery/read receipt or real-time transport guarantee is displayed. Processing
guards prevent routine duplicate clicks; durable idempotency across explicit
network retries would be a separate backend enhancement. Prioritize the manual
accessibility/device checks and production query measurements before adding new
messaging infrastructure.

## Files changed for this task

- `app/Http/Controllers/SupportCaseController.php`
- `resources/views/pages/support/index.tsx` (preserved its existing working changes)
- `resources/views/pages/support/show.tsx`
- `resources/views/components/support/new-conversation.tsx`
- `tests/Feature/SupportMessagingTest.php`
- `tests/Fixtures/messaging-browser-seed.php`
- `tests/Frontend/messaging-browser-check.cjs`
- `documentation/archive/ui-audits/MESSAGING_UI_AUDIT.md`

## Modal visual refinement (2026-11-10)

Following screenshot feedback, the admin/logistics dialog now has two focused
steps: Recipient and Message. Recipient search and account-role filters share a
row on desktop; account/parcel selection uses quiet segmented buttons. The message
step shows the selected recipient with a Change action, context/topic controls in
a responsive row, a grouped composer with character count, and a compact attachment
action. The footer provides Back/Continue/Send actions and drafts remain intact
between steps. Buyer/seller/rider support retains a single compose view.

This refinement changes only the existing modal, browser checks, and this audit.
Recipient/order authorization, request payloads, file limits, and server validation
are retained. ESLint, TypeScript, production build and 49 targeted Laravel tests
(764 assertions) passed. Browser coverage now also checks draft retention between
steps and captures each compose step plus the order-recipient view. Full manual
screen-reader and real-device checks remain as noted above.
