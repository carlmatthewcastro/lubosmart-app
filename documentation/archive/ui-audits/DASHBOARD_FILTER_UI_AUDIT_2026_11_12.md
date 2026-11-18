> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Dashboard filter refinement — 2026-11-12

Removed the separate Reset control from every shared FilterToolbar consumer:
accounts, activity history, compliance, seller inventory/orders, catalog/wishlist,
marketplace reports, logistics reports, company riders, and Messages.

Filter changes continue to apply automatically. Combined filters remain available
within a tab; switching Messages or account-role tabs clears the previous search
and other filters. Ordinary page navigation uses the destination's filters.
Individual chips remain removable, and dropdowns retain their all/default options.
The contextual Clear Filters action in the empty Messages inbox remains available.

Chips now use a compact rounded pill, distinguish the field label from its value,
and display the dropdown's visible option text instead of internal values such as
`message`, `complaint`, or `in_review`. Search terms retain their exact text.
Existing keyboard focus restoration and mobile filter disclosure are preserved.

Validation:

- Targeted application ESLint and TypeScript passed.
- Production build passed; Vite reported an existing unresolved category atlas
  image reference, unrelated to filter controls.
- SupportMessagingTest and WorkspaceStatusTest passed: 14 tests, 117 assertions.
- Admin Messages browser checks passed: tab switching clears the old search,
  readable topic chips appear, Reset is absent, and existing creation/reply flows
  still work. Checks include 320/768px reflow and light/dark screenshots.
- Compact activity-filter and automatic account-filter browser checks passed:
  combined filters, chip removal, default-option clearing, 320px reflow, and
  light/dark screenshots. Visually inspected the desktop topic chip and mobile
  dark activity filters.
- Focused dashboard browser run passed, including account-role tab search reset,
  with zero browser runtime exceptions or console errors.

The broad dashboard browser run stopped at an unrelated existing product-card
image-fit assertion before reaching the filter checks. An account-actions run
passed the filter checks but later stopped at an unrelated account-modal selector.
Focused browser runs use
temporary SQLite fixtures and do not modify customer records. Full manual screen
reader, real-device, and 200%/400% zoom checks remain unverified; automated checks
do not establish WCAG compliance.
