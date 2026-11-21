<div align="center">

# Mobile role coverage

**Retained native modules, website boundaries and acceptance limits.**

[Home](../../README.md) · [Documentation](../README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This guide maps the retained Buyer, Seller and Rider modules. Mobile UI work is paused pending a new Figma design; these screens are provisional integration references, not the accepted design for the next app. See the [mobile README](../../mobile/README.md) for the current development scope.

<a id="how-it-works"></a>

## Retained coverage

The table retains the November 5, 2026 source-coverage baseline. "Implemented" means the module and associated check source existed at that review. It does not claim a fresh test run, parity with every later backend change or physical-device acceptance.

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

## Operations retained on the website

Admin approval/moderation/content/user management, full Logistics center/coverage/rider management, pickup approval/allocation, dispatch/receipt/reconciliation administration, company invitation activation, return approval/assignment/refund/closure and payout recording remain existing website workflows. Some original custody/configuration APIs also support company/Admin roles; the Flutter app intentionally provides only the three requested workspaces.

This is broad coverage of the three mobile roles, not a claim that every website screen or administration action has a native equivalent.

<a id="reading-responses"></a>

## Reading responses

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

The `x-laravel-action` fields in the [OpenAPI snapshot](openapi.json) identify earlier handlers. Verify current projections in their controllers/resources and the [finance/return compatibility reference](FINANCE_2026_11_11.md); the snapshot does not cover later changes.

The [endpoint inventory](ENDPOINTS.md) lists the older 82-operation snapshot and middleware boundaries. It is incomplete against current source.

## Acceptance still required

The [retained Rider APK baseline](../../mobile/REFERENCE_UI_1_0_1.md) records development signing and historical checks. Use the [Rider Android checklist](../../mobile/RIDER_ANDROID.md#acceptance-still-required) for real QR/camera behavior, proof uploads, delivery/return mutations and website propagation. Verify current backend actions before reusing provisional screens. Native wallet/promotion interfaces, the future Figma UI, live networking and physical-device accessibility are not established by this coverage table.

---

<div align="center">

**LubosMart** · Mobile role coverage · [Documentation](../README.md)

</div>
