<div align="center">

# 👥 Seller functions

**Seller inventory, fulfillment, reports and settlement boundaries.**

[🛒 Home](../../../README.md) · [📚 Documentation](../../README.md) · [Finance and returns](../../workflows/FINANCE_AND_RETURNS.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the implemented Seller workspace and its verification records. It is for maintainers and reviewers following stock management, parcel preparation and own-store reporting.

<a id="context"></a>

## 🔄 Context

Sellers manage their store's products and fulfillment. Registration requires an ID, business permit, declared category and Admin approval.

<a id="workspace-functions"></a>

## 👥 Workspace functions

| Function          | Current behavior                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard         | Own-store order queues, live task counts, workload charts, recent parcels and all-time completed proceeds                                                                                                |
| Inventory         | Create/edit products, photos, price, stock, packed weight and active/hidden status                                                                                                                       |
| Inventory search  | Product-name search with published, hidden, low-stock (under 5), and missing-weight filters; filters persist through pagination                                                                          |
| Compliance        | Products must follow the store's declared department and moderation restrictions                                                                                                                         |
| Fulfillment       | Review own orders; advance pending → processing → shipped                                                                                                                                                |
| Order queues      | New, preparing, ready for pickup, in delivery, delivery issues, completed and cancelled; numeric search matches parcel/order IDs, other text matches tracking/recipient                                  |
| Waybill           | Print the internal parcel waybill                                                                                                                                                                        |
| Tracking/messages | Follow parcel status and communicate with the Buyer                                                                                                                                                      |
| Reports           | View completed sales, commission and proceeds figures                                                                                                                                                    |
| Account settings  | Shared Rider/Seller settings categories: personal details, store and bank details, registered address, private document status, contact and security; existing confirmation and Admin review rules apply |
| Support           | Open messages and complaints through the existing support workspace; order conversations remain attached to each parcel                                                                                  |

<a id="how-it-works"></a>

## 🔄 How it works

Sellers prepare parcels for Logistics pickup. Shipping uses stored quotes; the default commission is 10% of item subtotal excluding shipping. Reported proceeds do not prove a completed payout.

Sellers can manage size/color option stock and fixed peso store vouchers. Buyers can rate delivered items; authorized Admins moderate reviews. Sellers also have own-store report exports, manual payout history, returned-goods receipt/restock and a recorded-cost profit ledger. Automatic bank transfers and audited tax accounting are not implemented. See [finance and returns](../../workflows/FINANCE_AND_RETURNS.md) for rules and limits.

<a id="source-references"></a>

## 📚 Source references

Sources: `InventoryController`, `OrderController`, `ReportController`, `Store`, `Product`, `SellerOrder`.

<a id="seller-workspace-verification-2026-10-22"></a>

## 🧪 Seller workspace verification (2026-10-22)

Seller reuses the Logistics/Rider toolbar, chart and metric components, plus a shared operational profile component. Queue counts and lists are scoped to the signed-in Seller's store through `SellerWorkspace`; the notification endpoint requires an approved, verified Seller and does not cache responses. Seller cannot perform pickup, receiving, dispatch, proof upload or COD collection operations.

Run `php artisan test --compact tests/Feature/SellerWorkspaceTest.php` for Seller queue, search, isolation, confirmation and review checks. The existing marketplace flow suite covers the connected checkout, fulfillment, Logistics/Rider delivery, proof and cash workflow. Run `node tests/Frontend/seller-workspace-browser-check.cjs` for the disposable SQLite browser scenario, including stock/weight saves, preparation, waybill printing and profile saves. It writes screenshots and results under `storage/app/seller-workspace-ui-check` and does not use the configured application database.

<a id="related-documentation"></a>

## 📚 Related documentation

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)

---

<div align="center">

**LubosMart** · Seller functions · [Back to Documentation](../../README.md)

</div>
