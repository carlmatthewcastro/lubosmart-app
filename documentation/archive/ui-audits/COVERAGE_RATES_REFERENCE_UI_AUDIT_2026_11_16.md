> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Coverage & Rates reference implementation - 2026-11-16

The two user-supplied images are the visual targets. Existing server contracts, authorized center scope, geographic validation, rider eligibility, publication review, shipping calculations, and recorded order fees remain the functional source of truth. Reference records and counts were not copied into production pages.

## Presentation

- Shipping rates use compact published/draft summaries, search and publication filters, a single aligned table, grouped barangay/municipality/province details, weight allowance under the base price, status badges, and a three-dot action menu.
- The Add Shipping Rates dialog docks on the right on wide screens. The workspace makes room for it, and the existing illustration and purple banner remain visible. It uses geographic dropdowns, searchable barangays, select/deselect all, disabled existing records, a two-column fee/weight grid, a compact publication checkbox, assignment preview, Cancel, and Apply Rates.
- The rider directory uses actual rider initials, company names, complete per-rider coverage counts, expandable barangay tables, and compact statuses. The first rider expands initially. Assignment opens a Radix modal with the existing approved-rider and dependent-location fields, geographic icons, Cancel and Save Coverage.
- Local workspace CSS keeps these changes scoped. Existing sidebar/navbar/logo assets, Poppins, semantic colors, light/dark themes, shared primitives and routes are reused. Shared Page accepts a separate optional logistics banner title so the Rider Coverage banner and Coverage & Rates navbar agree with the reference.
- The extra parcel-quote demonstration was removed from the rate editor presentation. Actual shipping calculations and publication review remain unchanged. The existing draft default is preserved rather than silently publishing new records.

## Bulk persistence

The shipping endpoint accepts barangay_codes for atomic bulk creation and preserves individual editing through an explicit rate_id. Every location uses the existing PhilippineLocations resolver. Every operation rechecks the authorized operational center while locking actor/center rows. Any duplicate rejects the complete creation batch with no overwritten fees. Invalid geography and database failures leave no partial batch. Each saved rate retains independent service-area identity and audit history. Creating rates does not assign riders.

## Verification

- Targeted ESLint, TypeScript, Prettier and Git whitespace checks passed.
- ShippingRateControllerTest and LogisticsWorkspaceTest: 80 tests passed, 1,032 assertions.
- PHP Pint checks passed for the controller and new rate tests.
- Final production build passed. Existing storefront/category static-asset runtime-resolution warnings remain.
- Browser harness: 20 checks passed. Sixteen page/theme/viewport cases cover both pages at 320, 768, 1440 and 1672 pixels, light and dark themes, a single main heading, no document overflow, expansion, dialog focus containment, Escape/focus restoration and desktop dialog visibility. Four workflow cases cover bulk creation, individual editing, publication/pause, and rider assignment. No uncaught JavaScript or console errors were recorded.
- Filled desktop screenshots were inspected at 1672 x 941, device scale 1 and default 100% browser zoom, alongside the supplied reference images. Inspection corrected independent Tailwind translation offsets, grouped location columns, panel density, footer visibility and form icon spacing. A dedicated assertion verifies that Apply Rates is visible without scrolling at this size.
- Final review artifacts: storage/app/coverage-rates-reference-check/shipping-rates-desktop.png, rider-coverage-desktop.png, shipping-rates-mobile-dark.png, rider-coverage-mobile-dark.png, and results.json.

## Recovery and limitations

C: ran out of space during verification and a concurrent worker's edit left resources/css/app.css empty. The user paused that worker. The stylesheet was recovered from a recorded full-file read, with the later coin token and scanner-animation changes replayed. Existing pending workflow-motion, shared-button and textarea changes were preserved. No Git reset or replacement with an older committed stylesheet was used. The other worker's interrupted admin-style proposals were not applied by this task. Final tests use an isolated temporary SQLite database and D: temporary browser storage; production records were not changed.

The current shared sidebar/navbar dimensions were preserved, so their proportions differ slightly from the reference artwork. Real database records and authorized counts naturally differ from the example images. This is a close implementation of the supplied layout, not a claim of pixel identity. Physical-device, screen-reader and 200%/400% zoom checks remain manual work; automated checks do not certify WCAG compliance. No branch changes, commits, pushes, merges or deployment were performed.
