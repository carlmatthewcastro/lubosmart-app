> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Parcel details reference refinement � 2026-11-16

The fourth user image guides the parcel content layout. The existing modal, navigation, brand tokens, typography, routes, form payloads, lifecycle, rider filtering, proof handling, and financial mutations remain in place.

## Changed surfaces

- `resources/views/pages/marketplace/deliveries.tsx`: shared Logistics/Rider/Admin parcel presentation; grouped information, container-responsive columns and address cards, accessible compact copy control, compact COD status summary with actual timestamps, expandable optional handling notes, and operational milestones disclosure. Required exception notes and notes with server errors expand automatically. Removed the duplicate center-receipt scanner link. Existing activity history and proof downloads remain available.
- `resources/views/components/shared/progress-stepper.tsx`: reusable parcel variant with compact timestamps and no repeated waiting/timestamp-placeholder copy. Existing stage evidence and other timeline variants are preserved.
- `resources/views/components/logistics/parcel-next-step.tsx`: prominent contextual next-step surface with a single center-receipt scan link.
- `resources/views/pages/logistics/parcels.tsx`: clearer modal heading.
- `resources/views/pages/marketplace/orders.tsx`: Seller parcel handover history uses the shared compact parcel timeline.

The product cash settlement link remains available after rider COD reconciliation because product remittance to Admin is a separate settlement workflow. Its label now says �Review product cash settlement�; it navigates to the existing authorized workspace rather than creating a financial transaction. No finance rules were changed.

## Validation

- Targeted ESLint passed for all five changed TSX files.
- TypeScript `tsc --noEmit` passed.
- Production build passed. Vite reported unresolved runtime image references for catalog-shopping-banner.svg, orders-banner.svg, category-atlas-v1.png, and returns-banner.svg.
- Existing LogisticsWorkspaceTest and LogisticsApprovalChainTest: 85 tests passed, 1,182 assertions. These include approval, eligibility, checkpoint duplication, delivery/COD confirmation, cash discrepancies, and reconciliation checks.
- Existing logistics operations browser script was attempted against isolated test fixtures. It timed out at login, displaying the public homepage, before reaching the modal. This run does not establish any parcel visual or interaction result.

## Remaining verification

Manual review of the reference match, light/dark themes, 320px/mobile/tablet/desktop layouts, landscape, 200%/400% zoom, keyboard/focus restoration, copy feedback, and actual camera hardware remains outstanding. Cross-role and return/refund end-to-end browser checks remain outstanding. Seller retains its existing order details interface; only its parcel handover history was standardized. This batch does not certify WCAG compliance or establish a complete visual match across all role interfaces.

## Product photo follow-up

DeliveryController now eager-loads only the product ID and image path and supplies the existing `product_image_url` field for Logistics, Rider, Admin, and available pickup records. Full related product records are removed before serialization. The existing image component renders the uploaded photo and retains its fallback when missing or broken. RecordHeader now supports an optional hidden icon; parcel details and Logistics queue cards use it to avoid repeating a box icon beside the product preview. Other record headers retain their existing icons.

Validation: six feature cases passed (78 assertions), covering photo/no-photo responses across Logistics, Rider, and Admin. Targeted ESLint, TypeScript, Pint, and production build passed. The same four runtime image-reference warnings remain. Actual local product photo availability and browser appearance remain unverified; no photos were fabricated or attached to existing products.
