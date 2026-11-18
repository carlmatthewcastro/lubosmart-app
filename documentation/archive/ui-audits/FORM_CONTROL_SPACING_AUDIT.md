> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Form control spacing — 2026-11-11

Applied consistent 16px horizontal padding, 8px vertical padding, 24px line height
and a 44px minimum height to shared marketplace controls and UI inputs/select
triggers. Shared field wrappers use content-start and min-w-0 to prevent grid
stretching and allow narrow layouts to shrink. Validation feedback reservation
remains in forms; the application-status filter no longer reserves unused error
space.

Native single-select controls now reserve 44px on the right for a 16px chevron
inset by 16px. This also covers native selects outside the shared component.
Multiple and listbox selects retain native rendering. Forced-colors mode restores
the browser's own arrow. Radix trigger arrows cannot shrink beside long labels.

Validation: targeted ESLint, Prettier, TypeScript and the production build passed.
AdminRegistrationNotificationsTest: four passed, one failed (127 assertions).
The failure occurs when approving a buyer without an identity document; the
controller rejects that approval. No backend code was changed for this task.

Browser visual verification, light/dark appearance, mobile reflow, actual zoom,
keyboard and screen-reader checks remain unperformed. These automated results
do not establish WCAG compliance. Existing working-tree changes were preserved.
No commit, push or deployment was performed.
