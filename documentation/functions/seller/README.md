# Seller Functions

Sellers manage their store's products and fulfillment. Registration requires an ID, business permit, declared category and Admin approval.

| Function | Current behavior |
| --- | --- |
| Inventory | Create/edit products, photos, price, stock, packed weight and active/hidden status |
| Compliance | Products must follow the store's declared department and moderation restrictions |
| Fulfillment | Review own orders; advance pending → processing → shipped |
| Waybill | Print the internal parcel waybill |
| Tracking/messages | Follow parcel status and communicate with the buyer |
| Reports | View completed sales, commission and proceeds figures |

Sellers prepare parcels for sorting-center pickup. Shipping uses stored quotes; the default commission is 10% of item subtotal excluding shipping. Reported proceeds do not prove a completed payout.

Discounts/vouchers, variants, customer ratings and a full profit/cost ledger are not implemented.

Sources: `InventoryController`, `OrderController`, `ReportController`, `Store`, `Product`, `SellerOrder`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
