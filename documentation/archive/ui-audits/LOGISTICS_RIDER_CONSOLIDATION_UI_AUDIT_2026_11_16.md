> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Logistics and Rider consolidation audit — 2026-11-16

## Implemented presentation changes

- Logistics sidebar Operations now contains Dashboard, Parcel Management, Scan Parcel, Delivery Management, and Parcel Records. Existing endpoints and bookmarked queue URLs remain available. Cash, returns, finance, reports, messages, and settings retain their existing entry points.
- Parcel Management reuses the existing paginated parcel page and server queue filters. Queue links, active states, tracking/store search, result counts, and existing pagination are available in the workspace itself.
- Delivery Management reuses dispatch, monitoring, and exception queues. The existing dispatch endpoint combines ready and assigned parcels, so its tab is honestly labelled “Ready / assigned.” Completed deliveries open the existing report.
- Parcel Records reuses the same authorized parcel response with a presentation-only `view=records` query. Cross-links expose existing completed-delivery reports and returns/exception records. Individual handling history remains on each parcel, with readable event labels, original actors/timestamps, evidence links, and bounded scrolling.
- Rider Management links company riders and rider applications as workspace tabs. Coverage & Rates links rider coverage and shipping rates as workspace tabs. These are navigation tabs across existing pages, retaining their separate server contracts and permissions.
- Logistics dashboard uses six existing metrics, compact welcome/actions, existing attention queues, exceptions/COD follow-up links, and recent parcels. Repetitive charts and the additional resource metric strip were removed.
- Rider dashboard uses a compact welcome and the existing capability-filtered queues, parcel list, COD responsibility, and finance links. Repetitive charts were removed.
- Shared parcel presentation used by Logistics, Rider, and the scanner includes the existing product-image component, item quantities, additional-product counts, tracking copy feedback, responsive information columns, and a human-readable history timeline.
- Parcel dialog expands to the existing `max-w-5xl` token (approximately 1024px), removes the nested card border/padding, and uses a more compact mobile progress tracker. Existing Radix focus containment, Escape handling, focus restoration, and scrolling remain.
- Receipt scanner links are suppressed after receipt or during an exception. Sorting and assignment forms keep their existing eligibility conditions and request bodies.
- Rider area matching safely handles fields omitted by existing recipient privacy filtering, fixing a browser render failure without broadening visibility. Rider workspace links wrap on narrow screens.
- Scanner surfaces use a quieter neutral treatment. Camera, hardware/manual input, capture-method information, manual-entry reasons, explicit confirmation, and existing validation remain intact.

## Modified files

Components:

- `resources/views/components/navigation/app-sidebar.tsx`
- `resources/views/components/navigation/nav-main.tsx`
- `resources/views/components/logistics/parcel-navigation.tsx`
- `resources/views/components/rider/rider-navigation.tsx`

Pages:

- `resources/views/pages/logistics/dashboard.tsx`
- `resources/views/pages/logistics/parcels.tsx`
- `resources/views/pages/logistics/scan.tsx`
- `resources/views/pages/logistics/reports.tsx`
- `resources/views/pages/logistics/riders/index.tsx`
- `resources/views/pages/logistics/rider-coverage.tsx`
- `resources/views/pages/logistics/shipping-rates.tsx`
- `resources/views/pages/management/registrations/index.tsx`
- `resources/views/pages/marketplace/deliveries.tsx`
- `resources/views/pages/rider/dashboard.tsx`

Verification:

- `tests/Frontend/logistics-consolidation-browser-check.cjs`
- This audit.

Reused: Page, Card, Badge, Pager, RecordHeader, RecordDisclosure, OrderProductImage, ProgressStepper, ParcelNextStep, shared money/button helpers, ParcelCamera, Radix Dialog, existing parcel forms and confirmation feedback. No dependencies were added.

## Protected behavior

This task changes no PHP, routes, database schema, application records, status definitions, transition services, financial calculations, permissions, QR decoder/generation, proof upload, or scan confirmation logic. Existing working-tree changes in these areas belong to earlier work and were preserved. No branch changes, commits, pushes, or deployments were performed.

The existing three normal scan checkpoints remain pickup, facility receipt, and delivery-rider acceptance. Opening or finding a parcel cannot itself confirm physical custody. Existing sorting and assignment mutations remain scan-free.

## Verification

- Targeted ESLint: passed.
- TypeScript `tsc --noEmit`: passed.
- Production Vite build: passed. Existing static asset references for storefront banners/category artwork produce runtime-resolution warnings.
- LogisticsWorkspaceTest and RiderWorkspaceTest: 68 passed, 1,081 assertions. Tests use the configured isolated SQLite test database.
- Dedicated browser verification passed all 84 cases: 60 Logistics and 24 Rider cases across 320px, 768px, and 1440px, in light/dark themes. Checks cover page reflow, one main heading, parcel-dialog width, Escape dismissal, and focus restoration where applicable. No uncaught runtime or console errors were recorded. The harness uses a disposable SQLite stage. Final results are in `storage/app/logistics-consolidation-ui-check/results.json`; screenshots are in the same directory.
- Earlier browser attempts were interrupted by obsolete assertions in the older scanner harness and by a concurrent rebuild temporarily removing its manifest. The new consolidation harness checks the final built assets sequentially.

## Data and acceptance limitations

- DeliveryController currently loads order items without supplying `product_image_url`. The frontend consumes that existing optional order-item field when present and falls back to the shared parcel illustration. Enabling actual product thumbnails for current delivery responses requires a separate presentation-data change to the backend. No product images, packing photos, or proof were fabricated; previews are labelled as product previews.
- No actual packing-photo field or separate pickup/delivery-rider names are exposed by this page contract. The current assigned rider is retained; historical assignment evidence remains in existing events.
- Logistics has no independent completed, assigned-only, or out-for-delivery queue parameters. Existing combined queues and completed reports are reused; frontend filtering of one paginated page is not presented as a complete database result.
- No global scan-history dataset or scan event/date/person filter endpoint is supplied. Existing parcel timelines expose available history; existing completed reports retain date filters. A dedicated global scan-history tab and global audit filters remain unavailable under the frontend-only constraint.
- Dashboard props provide recent parcels and aggregate operational counts, not a dedicated prioritized parcel queue or a global activity feed. Existing trustworthy data is retained without inferred timestamps or invented activity.
- No separate screenshots/mockups or identifiable latest master-prompt file were found among the provided attachment and repository filenames. The supplied request, Homepage/Buyer components, current services, and repository standards informed this implementation.
- Browser reflow/focus checks do not certify WCAG compliance. Screen-reader testing, 200%/400% zoom, physical phones/scanners, real camera permissions, and end-to-end physical handover acceptance remain manual verification tasks. Financial and proof-of-delivery screens retain their existing logic; this browser check does not re-certify every financial mutation.
