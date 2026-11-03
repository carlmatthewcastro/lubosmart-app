# Seller Functions

Sellers manage their store's products and fulfillment. Registration requires an ID, business permit, declared category and Admin approval.

| Function | Current behavior |
| --- | --- |
| Dashboard | Own-store order queues, live task counts, workload charts, recent parcels and all-time completed proceeds |
| Inventory | Create/edit products, photos, price, stock, packed weight and active/hidden status |
| Inventory search | Product-name search with published, hidden, low-stock (under 5), and missing-weight filters; filters persist through pagination |
| Compliance | Products must follow the store's declared department and moderation restrictions |
| Fulfillment | Review own orders; advance pending → processing → shipped |
| Order queues | New, preparing, ready for pickup, in delivery, delivery issues, completed and cancelled; numeric search matches parcel/order IDs, other text matches tracking/recipient |
| Waybill | Print the internal parcel waybill |
| Tracking/messages | Follow parcel status and communicate with the buyer |
| Reports | View completed sales, commission and proceeds figures |
| Account settings | Shared Rider/Seller settings categories: personal details, store and bank details, registered address, private document status, contact and security; existing confirmation and admin review rules apply |
| Support | Open messages and complaints through the existing support workspace; order conversations remain attached to each parcel |

Sellers prepare parcels for logistics pickup. Shipping uses stored quotes; the default commission is 10% of item subtotal excluding shipping. Reported proceeds do not prove a completed payout.

Sellers can manage size/color option stock and fixed peso store vouchers. Buyers can rate delivered items; authorized admins moderate reviews. Sellers also have own-store report exports, manual payout history, returned-goods receipt/restock and a recorded-cost profit ledger. Automatic bank transfers and audited tax accounting are not implemented. See [finance and returns](../../FINANCE_AND_RETURNS.md) and [seller/buyer completion](../../SELLER_BUYER_COMPLETION.md) for rules, limits and verification.

Sources: `InventoryController`, `OrderController`, `ReportController`, `Store`, `Product`, `SellerOrder`.

## Seller workspace verification (2026-10-22)

Seller reuses the Logistics/Rider toolbar, chart and metric components, plus a shared operational profile component. Queue counts and lists are scoped to the signed-in seller's store through `SellerWorkspace`; the notification endpoint requires an approved, verified seller and does not cache responses. Seller cannot perform pickup, receiving, dispatch, proof upload or COD collection operations.

Run `php artisan test --compact tests/Feature/SellerWorkspaceTest.php` for Seller queue, search, isolation, confirmation and review checks. The existing marketplace flow suite covers the connected checkout, fulfillment, Logistics/Rider delivery, proof and cash workflow. Run `node tests/Frontend/seller-workspace-browser-check.cjs` for the disposable SQLite browser scenario, including stock/weight saves, preparation, waybill printing and profile saves. It writes screenshots and results under `storage/app/seller-workspace-ui-check` and does not use the configured application database.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
