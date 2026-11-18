> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Sorting suggestions — 2026-11-12

Parcel sorting now selects the active, center-scoped service area matching the
order's delivery address. The bin / route field starts with the area's name as
an editable route suggestion, capped at the existing 80-character limit. It is
a destination-based route label, not an asserted physical shelf assignment; no
area-to-bin configuration exists in the current schema. Existing saved bin
values and staff edits are preserved. Changing the area updates an unchanged
suggestion while preserving a custom route.

The sorting selector contains matching destination areas rather than unrelated
areas in the same center. Missing coverage has an explicit message. Empty route
or missing destination disables confirmation. Suggestions do not mark a parcel
sorted: the existing staff confirmation, tracking capture, authorization, and
server destination validation still apply.

Validation:

- Targeted ESLint, TypeScript, Prettier and production build passed.
- Logistics feature tests: 53 passed, 864 assertions.
- Focused Chrome acceptance passed: receiving reveals populated sorting fields;
  the suggested route submits unchanged only after confirmation and appears in
  handling history; a custom bin override also persists. Dark 320px has no page
  overflow. No JavaScript runtime or console errors.
- Focused browser run: `node storage/app/run-sorting-browser-check.cjs`. Results
  and desktop/mobile screenshots: `storage/app/sorting-suggestions-ui-check/`.
  The runner extracts the sorting scenario from the existing logistics browser
  test and runs against its disposable SQLite fixtures.
- The full logistics browser runner stops earlier at an existing notification
  assertion querying the removed `Logistics notifications` button. Its sorting
  scenario was verified separately as described above.
- Build retains the existing unresolved `category-atlas-v1.png` asset warning.

Screen reader, measured contrast, landscape, and 200%/400% zoom verification
remain manual work. Automated checks do not certify WCAG conformance.
