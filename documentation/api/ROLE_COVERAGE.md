<div align="center">

# 👥 Mobile role coverage

**Implemented mobile role coverage and remaining device acceptance.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Endpoints](ENDPOINTS.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide maps the implemented Buyer, Seller and Rider mobile modules. It is for developers and reviewers distinguishing native coverage from website operations and device acceptance.

<a id="how-it-works"></a>

## 🔄 How it works

Implemented November 5, 2026. “Implemented” below means source and relevant automated checks exist; native device acceptance is still outstanding. See verification.

| Module                                                                                                           | Buyer              | Seller                    | Rider                  |
| ---------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------- | ---------------------- |
| Password/Google login, role registration/documents, verification, approval status/corrections, password recovery | Implemented        | Implemented               | Implemented            |
| Protected profile/documents, support/evidence, appearance/logout                                                 | Implemented        | Implemented               | Implemented            |
| Public catalog/options/reviews                                                                                   | Shopping workspace | Public API                | Public API             |
| Wishlist, cart, address book, shipping, voucher preview, COD checkout                                            | Implemented        | —                         | —                      |
| Purchase cancellation, delivered reviews, return request                                                         | Implemented        | —                         | —                      |
| Own orders/parcels, proof, buyer/seller messages                                                                 | Purchases          | Fulfillment               | Assigned custody/proof |
| Inventory/images, variants/snapshot conflicts, voucher creation/pause                                            | —                  | Implemented               | —                      |
| Processing/ready transitions and audited waybill/PDF print                                                       | —                  | Implemented               | —                      |
| Costs/voids, profit, unsettled sales, payout history, reports                                                    | —                  | Implemented               | —                      |
| Assigned delivery queues, scan/manual reference, recipient/proof/COD                                             | —                  | —                         | Implemented            |
| Return timeline, physical collection/receipt                                                                     | Request/timeline   | Receipt/condition/restock | Collection             |
| Fees vs recorded payments, reports                                                                               | —                  | —                         | Implemented            |

The server supplies allowed_actions for preparations/custody/returns. UI visibility is convenience; server authorization remains authoritative. New scoped data excludes password/token hashes, private file paths and bank details. Financial reads preserve existing exclusions and do not initiate transfers.

<a id="operations-retained-on-the-website"></a>

## 🔄 Operations retained on the website

Admin approval/moderation/content/user management, full Logistics center/coverage/rider management, pickup approval/allocation, dispatch/receipt/reconciliation administration, company invitation activation, return approval/assignment/refund/closure and payout recording remain existing website workflows. Some original custody/configuration APIs also support company/Admin roles; the Flutter app intentionally provides only the three requested workspaces.

This is broad coverage of the three mobile roles, not a claim that every website screen or administration action has a native equivalent.

<a id="reading-responses"></a>

## 🔌 Reading responses

| Response                                                                              | Contract                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product/order/parcel/delivery resources                                               | data; paginated resource collections add links/meta.                                                                                                          |
| Seller inventory, vouchers, settlements, earnings, reviews and similar RoleData reads | data may contain a Laravel paginator (data.data, current_page, last_page, next_page_url).                                                                     |
| Profile                                                                               | data.user plus phone/store/application/vehicle allow-lists; no bank details returned.                                                                         |
| Workspace                                                                             | data contains WorkspaceStatus fields, not an embedded user. Use /me for identity.                                                                             |
| Support detail                                                                        | data is the permitted case and its paginated messages; evidence URLs require bearer authorization.                                                            |
| Returns                                                                               | data contains scoped returns/events and parcel information, destination, refund visibility and permitted collect/receive actions. No mobile refund execution. |
| Costs and reports                                                                     | Costs/report payloads reuse the website's scoped calculations, with integer cent fields.                                                                      |
| Locations                                                                             | raw array. Policies: data list of published policy id/title/body.                                                                                             |

See each x-laravel-action in [OpenAPI](openapi.json) for the exact response projection.

The [endpoint inventory](ENDPOINTS.md) enumerates all 82 operations and their middleware boundaries.

---

<div align="center">

**LubosMart** · Mobile role coverage · [Back to Documentation](../README.md)

</div>
