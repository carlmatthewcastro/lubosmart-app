# Logistics implementation and acceptance

Updated: 2026-10-16 (Asia/Manila). Scope: the user's request to implement missing Logistics features from [core workflows](CORE_WORKFLOWS_AND_SCANNING_REQUIREMENTS.md). This records local implementation and verification, not deployment or physical shipment certification.

## Implemented behavior

| Requirement | Local implementation |
| --- | --- |
| CORE-04 / CORE-05 | Operations retain active-account, company/center, rider affiliation, approved rider and destination coverage checks. Both legacy flat-fee and quoted orders now require preparation and pickup approval before initial assignment, and center receipt/sorting before starting delivery. |
| SCAN-01 / SCAN-02 | New deliveries receive unique random tracking references. Older records receive a reference when opened in parcel operations or on their waybill. A printable Code 39 barcode and human-readable reference identify each seller-order parcel. One-package print requests and reprint requests are audited; reprints retain identity. A print request records intent, not proof the printer succeeded. |
| SCAN-03 / SCAN-04 / SCAN-05 | Pickup, center receipt and sorting require the attached tracking reference. Manual tracking entry requires a reason. Receipt records intact/damaged condition; damage places the parcel on hold. Sorting requires an active, center-owned destination matching the order address and a destination bin/route. |
| SCAN-06 / SCAN-10 | Post-sort assignment stages a one-parcel dispatch manifest with a unique reference. It does not transfer custody. The assigned delivery rider separately scans and accepts the handover before starting delivery. Audit events retain previous/new rider, custody parties, actor role, center and manifest reference, including when pickup and delivery riders differ. |
| SCAN-07 / FIN-02 | Delivery requires a parcel reference, private proof photo, recipient name, and explicit confirmation of the full actual COD amount. Partial/short payment cannot complete delivery. Logistics enters cumulative cash physically received and a handover receipt/reference. A discrepancy remains unreconciled and visible until the full collection is verified. Admin reconciliation requires a verified full handover. Older handed-over records without amount evidence appear in the cash queue for verification. Existing commission snapshots and calculations remain intact. |
| SCAN-08 / SCAN-09 | Operations lock the shared order, parcel and acting account inside a transaction. Form requests carry UUID retry keys; repeat requests with the same key/actor/operation do not repeat events or financial effects. Repeated state transitions with another key conflict. Scoped tracking lookup does not return another center's parcels. |
| SCAN-11 | Camera capture selects a reference and never executes a parcel action. Unsupported camera APIs and permission denial retain scanner/manual fallback. Camera tracks stop on capture, stop or unmount. URL/non-parcel payloads are ignored. Offline confirmation displays “not submitted.” The online server remains authoritative. |
| SCAN-12 | Riders can record reasoned failed attempts. Logistics can hold, authorize retry, request return to center and confirm a scanned return receipt. Returned parcels must be sorted and dispatched again before another route. Damaged parcels cannot be retried automatically. Attempt/decision history is retained. |

Logistics now has separate **Exceptions / Returns** and **Cash Handovers** queues. Parcel history displays actors, times, handling reasons, receipt condition, route/bin, actual cash and receipt references where relevant. Ready/assigned/staged parcels remain distinct from accepted physical handovers.

## How to use

1. Seller prepares one physical parcel per seller order and prints the attached waybill from Orders.
2. Logistics approves pickup and assigns an eligible rider. The rider scans/enters the parcel reference and confirms pickup.
3. Open **Operations > Scan Parcel** in the Logistics sidebar. Scan the attached waybill or enter its reference, review the parcel, check condition and confirm center receipt.
4. Logistics scans again, confirms the correct destination and bin/route, and sorts the parcel. Assigning a delivery rider prepares its manifest.
5. The delivery rider scans and accepts the dispatch handover, then marks the parcel out for delivery. Completion requires actual full COD, recipient name and private photo.
6. Logistics uses **Cash Handovers** to record verified cash and receipt reference. When the total differs, enter a reason; the discrepancy stays open. A later entry records the cumulative verified total, not just the additional cash.
7. For a failed attempt, logistics records the next custody/handling decision in **Exceptions / Returns**. A return receipt requires an actual scanned handover at the center.

## Validation evidence

Commands used:

```text
php artisan test --compact tests/Feature/Logistics tests/Feature/MarketplaceFlowTest.php tests/Feature/Checkout tests/Feature/Notifications tests/Feature/Auth/LogisticsRiderRegistrationTest.php tests/Feature/Auth/RiderSelfRegistrationTest.php
node tests/Frontend/logistics-operations-browser-check.cjs
npx.cmd eslint <changed TSX files>
npx.cmd tsc --noEmit
npx.cmd prettier --check <changed TSX files>
vendor/bin/pint.bat --test <changed PHP files>
npm.cmd run build
```

Final results: **316 PHP tests passed, 1 existing test skipped (2,320 assertions)**; **9 browser checks passed**, with no runtime or console errors. ESLint, TypeScript, Prettier, Pint and the production build passed. The skipped case is the existing registration password-masking test, which requires separate real-browser verification. This is the named regression subset above, not a claim that the entire repository suite passed. Browser fixtures use a disposable temporary SQLite database, synthetic accounts, fake outbound notifications and built assets; they do not use customer data.

Browser checks exercise real Inertia receipt/sorting submissions, 320px dark-mode reflow, unsupported/denied cameras, mocked camera capture and ignored URL payloads, stopped media tracks, offline confirmation, unknown tracking, and the audited waybill print request. Camera capture is simulated; a real printed barcode/phone/scanner journey remains unverified. Screenshots/results: `storage/app/logistics-operations-ui-check/`.

The additive migration `2026_10_16_132838_add_operational_evidence_to_deliveries.php` was applied successfully to the local configured database. It adds nullable operational evidence fields and does not fabricate historical cash/parcel evidence. No other pending migration was applied by this task. Existing completed/reconciled financial records are not rewritten. Rollback drops the new evidence fields and should not be run against populated operational data without a recovery plan.

## Remaining decisions and acceptance limits

- The initial label uses Code 39, an alternative linear format allowed by the proposed requirements, with no added dependency. QR generation and the final printer/phone/scanner format selection remain pending. Test the printed label with intended hardware before operational sign-off (OPS-01 / OPS-02).
- One parcel per seller order is enforced by the supported print request. Software cannot prevent someone from printing through the browser menu or attaching duplicate labels to multiple boxes. Multi-box/package records, identifier revocation/replacement and cross-company center transfers are not implemented.
- Manifests currently contain one parcel. Batch manifests and per-parcel batch acceptance/rejection are not implemented. Offline custody capture/replay is not supported.
- Retry and return-to-center handling are implemented. Return-to-seller receipt, refund rules, inventory restoration after inspection, attempt limits/costs, loss/dispute resolution and releasing damaged goods still need approved policies and corresponding workflows. Use existing scoped support for escalation; this implementation does not silently refund, restock or close such cases.
- Named recipient plus the existing private photo is the delivery evidence baseline. OTP/signature and authorized alternate-recipient policies remain undecided.
- Seller payouts, rider compensation, shipping-fee ownership, discount/refund treatment and settlement timing remain policy-dependent (FIN-01 / FIN-03 / FIN-04). A collected or reconciled COD record is not a payout or profit claim.
- Database locks and sequential retry tests are verified locally. Simultaneous MySQL worker/device tests, interrupted in-flight requests, real printers/cameras, screen readers, full contrast and 200%/400% zoom remain acceptance work. Passing automation does not establish WCAG compliance.

The master checklist remains open where its full hardware, concurrency, policy or multi-role criteria exceed this verified batch.

## Dedicated scan workspace update - 2026-10-16

The Logistics sidebar now links to `/logistics/scan`. Camera, scanner/manual tracking entry, the matched parcel and its confirmation actions are together on this page. Parcel queues retain ordinary search and operational review; their scanner inputs are replaced with a link to the dedicated workspace. Courier scanning remains in the courier workspace.

The scan page initially shows no customer parcels. Lookup requires an exact tracking reference belonging to an operational center accessible to the Logistics operator; store-name searches and unknown/other-center codes return no match. Changing the entered reference hides the old parcel actions until the new reference is looked up. The existing protected mutation endpoint performs all confirmations and returns to the scanner with the updated parcel state.

Verification: 61 relevant Logistics/marketplace tests passed (784 assertions), plus targeted ESLint, TypeScript, Prettier, Pint and production build. Browser checks verify sidebar active state, removal of duplicated queue cameras, real receipt/sorting submissions from the scanner, manual-entry evidence, 320px dark-theme reflow, camera fallbacks/capture, offline feedback, unknown tracking and waybill printing. Physical hardware and full accessibility verification remain pending as recorded above.

## Dashboard parcel navigation update - 2026-10-16

Moved the eight parcel queue shortcuts and ordinary parcel/store search from the parcel results pages to the Logistics Dashboard, directly after the welcome section. Queue links open the existing `/deliveries?stage=...` routes and retain any entered search text. Search opens all-parcel results. Results pages display the search term when present and link back to the dashboard for another search; parcel actions, pagination and the dedicated Scan Parcel workspace remain available.

Verification: 63 relevant Logistics/marketplace tests passed (797 assertions), 14 isolated browser checks passed, and targeted ESLint, TypeScript, Prettier and production build passed. Browser checks cover all eight dashboard queue links, search-term preservation into the selected queue, all-parcel search results, removal of the repeated results-page panel and 320px dark-theme reflow. Dashboard desktop/light and mobile/dark screenshots were inspected in `storage/app/logistics-operations-ui-check/`. Physical hardware and full accessibility verification remain pending.
