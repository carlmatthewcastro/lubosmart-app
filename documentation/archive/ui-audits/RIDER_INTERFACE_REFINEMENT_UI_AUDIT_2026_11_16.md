> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

﻿# Rider interface refinement - 2026-11-16

## Scope and implementation

Applied the supplied rider brief and dashboard reference while preserving the existing sidebar, navbar, logo, theme tokens, Poppins setup, routes, permissions, and workflow forms. Existing pending changes were retained. No branch switch, commit, push, migration, or deployment was performed.

Files changed by this task (these files may also contain earlier pending work):

- `resources/views/components/rider/rider-parcel-records.tsx` (new): compact desktop parcel rows and mobile records, product previews, order/store references, work/status labels, recorded parcel COD, contextual scanner entry, proof downloads, and a Radix details dialog.
- `resources/views/components/rider/rider-navigation.tsx`: queue tabs, assigned-return link, server-backed tracking/store search, and a work-type selector replacing the duplicate workspace button strip. Existing queue and workspace URLs remain supported.
- `resources/views/pages/marketplace/deliveries.tsx`: Rider records replace expanded cards; shared live assignment metrics; existing scanner controls now require server-provided scan actions and exclude completed deliveries.
- `resources/views/pages/finance/rider-payments.tsx`: shared icon metrics for recorded task fees/payments/unpaid fees; separate weekly compensation; meaningful empty states instead of empty tables.
- `resources/views/pages/marketplace/reports.tsx`: compact toolbar/table, two-column financial summary, recorded tracking/delivery dates, and record-level COD aligned with the existing total calculation (cash due after original coin payment). No report calculation or date-filter query was changed.
- `app/Http/Controllers/DeliveryController.php`: additive Rider summary prop using the existing authenticated RiderWorkspace service.
- `app/Http/Controllers/ReportController.php`: eager-load the delivery date/tracking relation, retaining status fields required by the existing fulfillment-status accessor.
- This audit.

## Reused components and existing surfaces

Reused `Parcel` (the same details/actions implementation used by Logistics), `DashboardMetric`, `OrderProductImage`, `Badge`, shared financial records/tables, `Empty`, shared fields, Radix Dialog, tracking/COD stages, collapsible handling history, confirmation feedback, ParcelCamera and DeliveryProofCamera. The existing Rider dashboard already uses the shared Logistics dashboard system. Returns already use compact product records and the reusable Return/refund details dialog in `refund-workflow.tsx`; its physical collection/seller-delivery actions were preserved without introducing another return UI.

## Scanner findings

Existing `/deliveries/{id}` actions and server-provided `allowed_actions` govern rider pickup (`picked_up`), dispatch acceptance (`accept_dispatch`), and exception transfer (`accept_transfer`). The camera scanner captures the tracking reference; capture alone does not submit a checkpoint. Completed parcels expose details/proof actions. Final delivery uses the existing recipient/note/COD confirmation and private DeliveryProofCamera, not a fourth forward scan. Existing request keys, processing checks, backend locking/checkpoint validation, and mobile endpoints remain intact.

Reverse returns use the existing independent return-task workflow and TaskAction dialogs. No extra scan stage, endpoint, financial record, or return transition was introduced. Existing camera permission/invalid-code feedback and decoder fallback were reused, not rewritten.

## Validation and evidence

- Targeted ESLint, TypeScript (`tsc --noEmit`), changed-file Prettier, PHP Pint checks: passed.
- Production build: passed. Existing unresolved-at-build-time image-reference warnings remain for storefront banner/category assets; these are outside this task.
- RiderWorkspaceTest, SettlementAndReturnsTest and MobileRoleParityTest: 78 passed, 1,360 assertions.
- MarketplaceFlowTest: 22 passed, 428 assertions after correcting the report relation projection to include the serializer's required status. An earlier combined run caught that projection defect; it was fixed and the affected suite rerun successfully.
- Dedicated headless Chrome Rider smoke check: dashboard, deliveries, payments, reports and returns rendered at 320/768/1440px without document overflow; dark screenshots captured; one main heading per surface. Details opened with recorded tracking, completed parcel scanner remained hidden, Escape closed the dialog, and focus returned to its opener. No uncaught runtime exceptions.
- Evidence and disposable runner: `storage/app/rider-refinement-check/`. The runner reuses setup from the existing finance browser harness with temporary SQLite and synthetic records; no customer records were mutated.
- The original finance browser suite stopped at its Admin financial baseline comparison because the working tree's finance response contains fields absent from its saved baseline. That baseline was not updated or bypassed in the original suite. The dedicated Rider smoke check is separate evidence and does not establish that the full finance browser suite passes.

## Remaining verification limits

Physical QR labels, phone permission handling, live pickup/dispatch/transfer scans, actual POD capture/upload, and real cash handovers still need operator acceptance on the target device. Existing PHP regressions cover authorization/workflow/mobile boundaries; the browser smoke check does not physically perform those operations. Existing customer records were not used for mutation tests. Fixture returns and compensation availability limit populated-state visual coverage. No claim of complete WCAG, contrast, screen-reader, 200%/400% zoom, or physical-device certification is made.

## Follow-up: simplify details and parcel actions

Removed the Rider dialog footer's duplicate proof download and Close button; the shared top-right X, Escape handling and focus restoration remain. Kept the existing single in-content proof action. Suppressed the completed-parcel next-step banner, technical dispatch-manifest line and redundant COD summary in embedded Rider details. Pending COD handover forms/status remain visible whenever the existing permitted action or pending handover requires them. Tracking and COD financial timelines remain unchanged.

Parcel list actions now use a primary View details / Scan QR button and outlined Proof button, aligned in one row when space permits and wrapping on small screens. Removed the narrow action-width constraint that caused the screenshot's stacked buttons. Changes are limited to `rider-parcel-records.tsx` and presentation conditions in `marketplace/deliveries.tsx`.

Validation: targeted ESLint and TypeScript passed; production build passed with the existing image-reference warnings; RiderWorkspaceTest passed (8 tests, 230 assertions). Physical camera and complete accessibility acceptance remain outside this presentation-only follow-up.

## Follow-up: remove repeated queue navigation and metrics

Per user feedback, delivery queue pages now show only the selected queue title, search/work-type toolbar, and parcel results. The shared sidebar is the queue navigation, including on mobile through the existing sidebar toggle. Removed the repeated metric strip from deliveries and the duplicate queue-tab row from both deliveries and the Rider dashboard. Dashboard summary cards remain on the dashboard. Queue URLs, permissions, filters and actions remain supported. The page heading identifies the selected queue using the existing queue labels.

Removed this task's now-unused Rider summary prop from DeliveryController, avoiding the extra dashboard-data queries on each delivery-list visit. Changed files: rider-navigation.tsx, marketplace/deliveries.tsx, rider/dashboard.tsx, DeliveryController.php, and this audit. ESLint, TypeScript, PHP Pint, production build, and RiderWorkspaceTest (8 tests, 230 assertions) passed. Existing build image-reference warnings remain.
