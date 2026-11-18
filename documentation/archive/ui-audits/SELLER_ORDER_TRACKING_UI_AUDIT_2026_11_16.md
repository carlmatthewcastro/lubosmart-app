> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Seller orders and tracking refinement � 2026-11-16

Request: apply the cleaner Rider queue approach and Buyer parcel details/tracking experience to Seller fulfillment.

Changes:
- Removed the repeated Seller queue-tab row. Sidebar navigation and the single search/queue filter remain, including Completed and Cancelled queues. Removed the redundant selected-queue chip. The page heading now names the selected queue.
- Seller parcel cards reuse the Buyer product preview and progress presentation, with explicit View details and Track parcel buttons.
- Reused the existing Buyer dialog with a Seller audience option. Seller details show proceeds and commission, retain city/province-only delivery information and the authorized-waybill guidance, and never display private street/contact fields. Seller tracking uses the recorded handover timeline in a separate dialog. Buyer review access stays Buyer-only.
- Existing seller preparation confirmations, ready-for-pickup updates, waybill/proof menu links, messaging and issue feedback remain. Admin details keep their existing presentation. Filtered Seller empty states link back to all orders.
- Seller pages use the existing compact header; no new banner or dashboard metric strip was added.

Validation:
- Targeted ESLint, TypeScript noEmit and production build passed.
- SellerWorkspaceTest and BuyerSellerIntegrityTest: 21 passed, 405 assertions.
- Existing build warnings about unresolved marketplace banner/category image references remain outside this scope.
- Dedicated browser runner uses the existing isolated harness and temporary SQLite/synthetic fixtures, with evidence under storage/app/seller-orders-ui-check. Browser outcome recorded below.

Limits: no complete screen-reader/contrast/zoom certification, physical-device acceptance or real fulfillment mutation testing. Browser fixtures have limited product/queue population; PHP tests cover the existing workflow and data boundaries.

Browser outcome: passed for Seller and Buyer cards plus details/tracking dialogs at 1440/768/320px; dark list reflow at 320px passed. Verified selected Seller queue heading, single filter without duplicate tab navigation, Seller financial fields and private-address suppression, dialog bounds, Escape close and opener focus restoration. Tracking stage tooltips consume Escape while open; dialog close was checked after focusing the close control. Zero runtime exceptions. Reviewed Seller desktop/mobile cards and mobile details screenshots. Evidence: storage/app/seller-orders-ui-check/results.json. Initial disposable runner attempts needed selector/focus corrections; the final runner completed successfully.
