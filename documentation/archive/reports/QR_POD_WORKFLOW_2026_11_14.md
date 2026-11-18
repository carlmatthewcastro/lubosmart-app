> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# QR checkpoints and proof of delivery, 14 November 2026

## Audit and resulting workflow

The existing system already provided unique parcel tracking/QR labels, one delivery per seller parcel, private delivery proof, center/rider authorization, parent-order and parcel row locks, idempotent event references, unique COD collections, notifications, and cash reconciliation. Web and Flutter mutations share DeliveryController. Seller waybill printing does not establish custody. Signature and GPS fields were not required by the inspected completion forms.

Previously, sorting, delivery assignment, and final completion also required tracking capture. The rider typed an actual COD amount and recipient name; the web proof control selected a file without a camera preview. Return receipt/retry cleared dispatch timestamps and forced fresh sorting/handover. Flutter had camera capture but no photo preview, contextual notes, explicit COD checkbox, or logistics workspace.

The resulting normal workflow is seller preparation/Ready for Pickup ? pickup QR checkpoint ? hub receipt QR checkpoint ? Mark as Sorted ? assign delivery rider ? rider handover QR checkpoint ? Start Delivery ? camera photo + explicitly selected note + full COD confirmation ? Delivered. There is no fourth forward scan. Failed delivery is a separate selected action with a required contextual reason and optional private photo, and creates no cash collection.

Each existing seller parcel represents one physical package. Existing waybill validation rejects multi-box labels; a purchase can contain multiple seller parcels, each with a distinct QR and checkpoint history. This change does not invent physical-package splitting within a seller parcel.

## Roles, custody, and status compatibility

- Seller confirms/prepares the order and generates/reprints its QR label; no seller scan.
- Assigned pickup rider scans the label; pickup requires an approved pickup and a Ready for Pickup seller parcel.
- Logistics within the parcel's operational center scans physical receipt; sorting and assignment are ordinary actions without tracking capture.
- Assigned delivery rider scans handover after receipt, sorting, and delivery assignment, then separately starts delivery.
- Delivery completion requires the assigned rider, Out for Delivery, all three checkpoint timestamps, a validated JPG/PNG photo up to 5 MB, an action-appropriate note (or nonblank custom text), and explicit COD confirmation.
- Logistics keeps the existing failed-attempt, hold, return request, return receipt and retry workflow. Return receipt preserves original scan timestamps and events. Retry is an explicit logistics confirmation of physical re-handover to the same assigned rider, without repeating forward checkpoints. Damaged parcels remain blocked for investigation. Separate post-delivery seller-return/refund records remain separate.

Existing stored status codes remain compatible with queues and finance. The added fulfillment_status projection distinguishes received_at_hub, sorted, delivery_rider_assigned and handover_confirmed from the underlying picked_up/in_transit codes. Web parcel badges and mobile parcel details use that projection. Hub custody is represented by received_at until handover, and returned_to_center overrides previous handover custody. Original timestamps are not rewritten on return.

## Database and API changes

Migration: database/migrations/2026_11_14_122930_add_forward_checkpoint_to_parcel_events.php.

- Adds nullable parcel_events.forward_checkpoint and unique (delivery_id, forward_checkpoint). Values are pickup, hub_receipt, handover. Other operations and historical events retain NULL.
- Adds nullable deliveries.delivery_notes for the latest delivery/exception notes. Full notes and additional remarks remain in the corresponding parcel event.
- Preserves existing rows and original QR identities. Legacy timestamps also prevent repeating already-completed checkpoints; historical events are not fabricated or deleted.
- Existing order/delivery locks serialize submissions; existing globally unique request references support retries and unique delivery_id on cod_collections prevents duplicate collections.
- Rollback drops the new fields and their stored information; prefer a forward fix on populated systems.

No new endpoints or tables. Existing POST /deliveries/{id} and POST /api/v1/deliveries/{id}/events enforce the same business rules. Forward checkpoint actions require tracking_reference and capture_method=scanner; manual lookup never confirms a forward checkpoint. Returns retain their separate controlled label validation.

Completion requires note and cod_confirmed (boolean or multipart 1). Other / Custom notes additionally requires nonblank reason. Optional remarks has a 500-character limit. Suggested text is validated against the selected action. The server computes the full COD from the parcel subtotal plus shipping fee; a rider-provided amount cannot change the collection. Recipient name is no longer required. No signature, coordinates or location permission is introduced.

API delivery resources expose contextual note_suggestions, allowed_actions, fulfillment_status, and handling history on detail/mutation responses. Parcel resources expose the latest delivery notes. Logistics mobile actions reuse the existing configuration and parcel-event endpoints. Images remain on the private local disk. The existing authenticated proof route accepts ?event={id} for a failure photo belonging to that parcel and audits access. Storage failure rolls back delivery completion; rejected transactions clean up uploaded files. A committed proof is preserved if a later queued-mail dispatch fails.

Deploy the migration before the new server code and update web/mobile clients together. Old mobile clients that omit the newly required note and COD confirmation receive validation errors and must be updated; server validation is intentionally not bypassed for old clients. Existing cash receipt, reconciliation, commission, salary and settlement calculations are retained.

## Files changed for this task

Backend:
- app/Http/Controllers/DeliveryController.php
- app/Http/Resources/Api/DeliveryResource.php
- app/Http/Resources/Api/ParcelResource.php
- app/Models/Delivery.php
- app/Services/DeliveryNotes.php
- database/migrations/2026_11_14_122930_add_forward_checkpoint_to_parcel_events.php

Web:
- resources/views/components/logistics/delivery-proof-camera.tsx
- resources/views/components/logistics/parcel-next-step.tsx
- resources/views/pages/marketplace/deliveries.tsx
- resources/views/pages/marketplace/orders.tsx
- resources/views/pages/logistics/scan.tsx

Flutter:
- apps/mobile/lib/features/work.dart
- apps/mobile/lib/main.dart
- apps/mobile/lib/ui/common.dart
- apps/mobile/test/widget_test.dart

Verification:
- tests/Feature/Logistics/LogisticsWorkspaceTest.php
- tests/Feature/Logistics/CreateLogisticsDemoTest.php
- tests/Feature/RiderWorkspaceTest.php
- tests/Feature/Api/MobileApiTest.php
- tests/Feature/MarketplaceFlowTest.php
- tests/Feature/Notifications/NotificationInboxTest.php
- tests/Frontend/qr-pod-browser-check.cjs
- documentation/archive/reports/QR_POD_WORKFLOW_2026_11_14.md
- documentation/archive/ui-audits/QR_POD_UI_AUDIT_2026_11_14.md

Several listed files already contained unrelated pending work; that work was preserved. No branch switch, commit, push, production migration, or deployment was performed.

## Verification

- Targeted Laravel regression run: 178 tests passed (2097 assertions), followed by 60 logistics tests passed (907 assertions) including new failure-photo privacy and multi-parcel order completion coverage.
- TypeScript, targeted ESLint, targeted Prettier and production Vite build passed. Build retains warnings about existing marketplace/category image paths.
- Flutter: 14 tests passed, including the logistics workspace; analyzer reports no issues.
- Headless Chrome POD acceptance: four checks passed for explicit outcome/no fourth scan, permission denial, capture/retake/validation gating, and completed upload with saved notes. Screenshots cover light/dark 320/768/1280px without document overflow. The test substitutes a canvas MediaStream; production uses actual getUserMedia, and Flutter uses ImagePicker camera capture.
- Browser results/screenshots: storage/app/qr-pod-ui-check/. The dark 320px screenshot was visually inspected. Automated reflow and screenshots do not establish WCAG compliance; full keyboard, screen-reader, zoom, and physical touch review remain open.
- Full Laravel suite: 1262 passed, 3 skipped, 5 failed (10545 assertions). The remaining failures are the three BuyerOnboardingTest browse/verification redirect cases and two SettlementAndReturnsTest Inertia-response checks (foreign logistics/rider access and unreconciled COD/refund access). Those modules were not changed for this task. They remain unresolved; the suite is not fully green. Full output: storage/app/qr-pod-full-tests.txt.

## Local testing and release checklist

1. Review pending migrations on the intended local database. Run php artisan migrate for a disposable development database, or apply the new migration only after its existing dependencies are installed. No application database was migrated during this task; test/browser databases are isolated SQLite.
2. Run npm run build and the Laravel application. Use HTTPS or localhost for web camera access. A physical phone cannot use camera APIs through an insecure LAN HTTP origin.
3. Use approved seller, logistics, pickup rider, delivery rider, and buyer accounts with matching center/service-area coverage. On a local demo database, RiderDemoSeeder can prepare synthetic rider work; it must not run on production.
4. Prepare a seller parcel and print its waybill. Assign a pickup rider, scan pickup, then scan logistics receipt. Confirm sorting and assign an eligible delivery rider without scanning. Scan rider handover and choose Start Delivery.
5. Select Successful delivery. Deny then allow camera permission, capture and retake a photo, select a suggested note or enter custom notes, and check the full COD confirmation. Verify completion is unavailable before all required fields exist. Submit; inspect Delivered status, private proof, saved notes, buyer/seller/logistics notifications and exactly one cash collection.
6. Repeat a scan and delivery request with the same request key (safe replay), then with a new key (conflict). Try a different rider, an unknown label, an unsorted parcel, missing proof, invalid note, and absent COD confirmation; no extra scan/cash records should appear.
7. For a separate parcel, select Failed delivery and a matching reason. Optionally capture safe supporting evidence. Verify no Delivered status or cash collection; use logistics return handling and explicit re-handover/retry without clearing scan history. Review multiple seller parcels under one order; only the final completion completes the parent.
8. Run php artisan test --compact; node tests/Frontend/qr-pod-browser-check.cjs; npx tsc --noEmit; and, under apps/mobile, flutter test --no-pub and dart analyze lib. The browser script creates an isolated temporary SQLite database and uses installed Chrome/Edge.
9. Test a real Android/iOS camera, retake/cancel/permission denial, reconnect/retry, upload interruption, and actual scanning with printed labels. These physical-device checks were not performed. Exercise simultaneous requests against MySQL before production: SQLite tests verify constraints/replays but do not demonstrate MySQL row-lock concurrency.

The single required deployment change is the additive migration, plus coordinated server/web/mobile rollout. Existing queue workers and private storage must be available. Investigate the full-suite failures before any release. No deployment is authorized by this implementation.
