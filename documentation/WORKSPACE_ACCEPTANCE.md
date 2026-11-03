# Four-role workspace implementation and local acceptance

Updated 2026-10-26, Asia/Manila. This covers Buyer, Seller, Logistics, and Rider. Admin keeps its existing layout, controls, and payment/approval responsibilities.

## Shared interface

- Settings pages share category navigation and a page frame. Seller and Rider retain their registration, documents, address, contact/security, and role-specific details. Logistics retains approved snapshots, protected fields, and change-request/re-verification controls. Buyer retains profile, addresses, password, and appearance settings.
- Consequential actions use dialogs: checkout, cart/address removal, fulfillment changes, delivery/COD actions, finance/return records, stock/variant changes, coverage assignment, company/address/service-area changes, and print requests. Dialogs support Escape, focus containment, and return focus. Ordinary persisted actions use dismissible success/error toasts; field errors stay visible.
- Decorative action arrows are removed from the four-role workspaces and registration/onboarding CTAs. Admin arrows and essential disclosure controls remain.
- Shared page headers, cards, fields, responsive spacing, empty states, and light/dark tokens retain LubosMart branding. This is a shared-interface improvement, not a claim that every page received an independent redesign.

## Updates and checkout contract

`GET /workspace/status` requires authentication, verification, active approval, and one of the four roles. It returns `cartQuantity`, authorized `queues`, and opaque `revisions`. It returns no parcel identities, addresses, messages, or financial references. Responses are private/no-store. Its rate-limit bucket is separate from mutation buckets.

Each mounted workspace runs one compact poll. The active cadence is four seconds, leaving time for the response and partial page refresh within the 2–5 second local target. Hidden/offline tabs pause requests; focus/reconnection triggers refresh. Failures back off to at most 60 seconds; 429 responses respect Retry-After. Authentication/access failures stop polling. Timers and pending requests are cleaned up on unmount. This uses ordinary HTTP, without a WebSocket service.

Changed indicators refresh only relevant, existing Inertia page props. URL filters, scroll position, and React form state are retained. Dialogs defer background page refresh until closed. Successful local mutations trigger immediate status refresh. The Buyer bag badge shows server-confirmed quantities. Existing notification menus consume these same scoped queue counts.

The database is the cart source of truth. Adding an item persists its product/variant/quantity but reserves no stock. Checkout locks and revalidates products, options, store/account eligibility, vouchers, and shipping, then deducts stock and creates seller parcels in one transaction. Cancellation/restoration remains duplicate-safe. Checkout also accepts optional `expected_items_subtotal` (PHP, before voucher discount); the browser sends its reviewed subtotal and the server rejects stale prices/quantities without consuming stock. Existing callers that omit it remain compatible.

Changed packed weights, cart contents, addresses, or published shipping-rate revisions invalidate/reload shipping quotes. Unavailable stock/options disable checkout in the UI; the server remains authoritative even if stock changes between refresh and submission.

## Connected roles

Pickup/dispatch progression fix, 2026-10-26: approved but unassigned parcels remain in **Pickup Requests**, including the queue count, until a pickup Rider is actually assigned. The parcel dialog retains a newly claimed legacy request when it moves from unallocated to company-owned data. Pickup assignment controls now appear before the lengthy address/order details. If assignment moves the parcel to another filtered queue, the dialog links directly to that tracking reference across all queues.

The **Delivery Assignment / dispatch** queue now exposes assignment in its parcel dialog, including explicit camera/scanner/manual tracking verification. Operators no longer have to discover that the form existed only in the dedicated Scan Parcel page. Manual entry still requires a reason; receiving, sorting, approved company/center/destination coverage, and Rider dispatch acceptance remain mandatory. Only matching destination areas are offered, with a clear coverage setup message when no eligible Rider is available. Stage guidance states whether the next actor is Logistics or the assigned Rider. A repeat pre-handover assignment is labelled **Reassign Delivery Rider**.

Regression verification: 103 related feature tests pass (1,806 assertions), including the complete journey with the same Rider and with a different delivery Rider. The Logistics browser harness passes 19 scenarios, including approve-to-pickup-assignment continuity, visibility in the pickup Rider account, assignment from the dispatch queue, visibility in the delivery Rider account, and the dispatch acceptance action. Tests use disposable data; real parcel custody and live deployment are separate acceptance steps.

| Event | Next account/workspace |
| --- | --- |
| Eligible Seller publishes an active product | Buyer catalog/product/cart stock visibility |
| Buyer successfully checks out | Seller preparation queue; Buyer order tracking; stock deducted |
| Seller prepares and marks a parcel ready | Original/eligible Logistics pickup workflow |
| Seller requests a waybill | Audited print request, then browser print; same identity on reprint |
| Logistics approves/assigns/receives/sorts/dispatches | Assigned Rider work and Buyer/Seller tracking |
| Rider records authorized pickup/delivery and actual COD | Logistics handover/reconciliation and delivery history |
| Logistics reconciles full COD | Admin may record eligible manual Seller payout |
| Logistics records earned Rider fees/payments | Rider can read their own records; Admin has no Rider-pay access |
| Buyer requests return; Admin approves | Logistics assigns transport, Rider collects, Seller confirms receipt/condition |
| Seller confirms returned goods | Eligible explicit restock; Admin records a bounded manual refund/reference or reasoned closure |

Printing records a request, not proof that a physical printer completed a label. No automatic bank transfers are introduced.

## Fresh-account manual test

1. Keep XAMPP MySQL running. Run `php artisan serve --host=127.0.0.1 --port=8000` and open the displayed URL. Apache is unnecessary when using Artisan; MySQL is still a separate service. The production assets must be built with `npm run build`, or Vite must be running for development.
2. Register fresh Buyer, Seller, and Logistics accounts using their actual forms and required documents. Verify email and complete the supported approval process. Create/invite a Rider through the approved Logistics company and complete activation/review. Do not make pending accounts approved directly in the database.
3. Open each account in a separate browser profile/private session. Tabs in the same profile share sign-in cookies. Review each role's settings categories; confirm fields/actions differ appropriately. Keep Admin in its own signed-in profile.
4. Seller creates an eligible product with image, price, packed weight, stock, and two size/color options. Add a voucher. Buyer adds both options, reloads the cart, and checks the badge. Stock should remain unchanged before checkout.
5. Buyer saves an address, selects shipping, applies the voucher, and reviews the confirmation total. Confirm checkout once. Check Seller's new order, stock reduction, and Buyer's tracking. Test unavailable stock and a changed quote/price; failed checkout must leave cart/stock intact.
6. Seller prepares the parcel, opens the waybill, and reviews the print dialog. Print/save PDF and check tracking, recipient, barcode, and COD amount. Reprint must preserve identity. Logistics performs approved pickup, assignment, receiving/sorting, dispatch, and Rider handover using the actual attached label.
7. Rider records pickup/delivery with required proof and actual COD. Logistics records cash receipt/reconciliation. Check Buyer/Seller tracking and reports. Only Logistics records Rider fees/payments; Admin records eligible Seller payouts.
8. Exercise the controlled whole-parcel return through all roles. Confirm no refund before Seller receipt, no duplicate stock restoration, and clear refund/payment references and histories.
9. While Buyer types an unsent message, send one from Seller in another profile. Confirm the incoming message appears automatically and the Buyer draft remains. Repeat a status update with Logistics/Rider. Check dialogs with keyboard/Escape and narrow/mobile layouts.

## Verification and limits

Automated tests use isolated SQLite databases and synthetic accounts; configured MySQL records, real accounts, restrictions, and payments are not reset or bypassed. The latest full run has 1,067 passing tests, 3 skipped, and the same 2 legacy Logistics test failures (8,206 assertions). All 38 browser scenarios pass (14 marketplace/finance/returns, 16 logistics, 8 settings). The separate Seller-to-Buyer refresh was observed at 4.58 seconds with the Buyer draft retained. TypeScript, ESLint, formatting, and production build checks pass.

The browser harnesses exercise actual forms, dialogs, responsive themes, barcode rendering, print-request callbacks, camera fallbacks/decoding, account changes/Admin review, vouchers/reviews, cross-account message refresh with draft retention, and the five-role manual finance/return journey. Print-media checks hide dialogs, overlays, and toast feedback; a sample PDF is saved under `storage/app/seller-workspace-ui-check/seller-waybill-print.pdf`. They do not certify physical printing or production performance.

Outstanding acceptance: physical printer and label sizing/readability, real camera/scanner/touch devices, configured external email delivery, fresh real-account approval on the user's installation, concurrent MySQL/load measurements, complete screen-reader/contrast/200%–400% zoom verification, and deployed integrations. Existing legacy Logistics tests expecting mutations through the blocked `/settings/profile` route remain separately documented; supported `/api/account/reverification` behavior has passing coverage.

No deployment, commit, push, payment transfer, or configured-database reset is part of this work.
