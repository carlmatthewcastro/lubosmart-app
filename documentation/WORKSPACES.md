<div align="center">

# Workspaces

**Buyer, Seller, Rider, Logistics and Admin in one reference.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This guide describes the five implemented website workspaces and their responsibilities. Each role has its own section with account requirements, available actions, business boundaries and source references.

**In this guide:** [Buyer](#buyer) · [Seller](#seller) · [Rider](#rider) · [Logistics](#logistics) · [Admin](#admin)

<a id="buyer"></a>

## Buyer

<a id="buyer-how-it-works"></a>

### How it works

Buyers discover products and place COD orders. Email/password Buyer registration requires a valid government ID (JPG, PNG or PDF, maximum 5 MB), stored privately with the application, and activates after email verification. Legacy/Google onboarding requires an ID application and Admin review. Cart/checkout and operational features require a verified approved account.

<a id="buyer-workspace-functions"></a>

### Workspace functions

| Function     | Current behavior                                                       |
| ------------ | ---------------------------------------------------------------------- |
| Browse       | Search/filter products by category and view listing details            |
| Cart         | Add products, adjust quantities and remove items                       |
| Addresses    | Manage saved delivery addresses                                        |
| Checkout     | Review server-calculated shipping and place COD orders split by Seller |
| Orders       | View fulfillment/delivery status and authorized proof of delivery      |
| Cancellation | Cancel while all Seller orders are pending; stock is restored          |
| Support      | Use order conversations and support/complaint threads                  |

<a id="buyer-orders-and-returns"></a>

### Orders and returns

Buyers communicate with Sellers and receive rider/center status updates. They can select size/color options, apply one store voucher at checkout, search/filter their parcels and rate delivered items. Product pages show visible verified-purchase reviews. Current version-3 requests support eligible item quantities and Admin-approved Lubos Coins credits, with a separate physical-return task when required. Original tracking/COD history stays intact. Automatic bank/provider refunds are not implemented. See [finance and returns](WORKFLOWS.md#finance).

<a id="buyer-source-references"></a>

### Source references

Sources: `MarketplaceController`, `OrderController`, `SupportCaseController`, `CreateOrderFromCart`, `resources/views/pages/marketplace/`.

---

<a id="seller"></a>

## Seller

<a id="seller-context"></a>

### Context

Sellers manage their store's products and fulfillment. Registration requires an ID, business permit, declared category and Admin approval.

<a id="seller-workspace-functions"></a>

### Workspace functions

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

<a id="seller-how-it-works"></a>

### How it works

Sellers prepare parcels for Logistics pickup. Shipping uses stored quotes; the default commission is 10% of item subtotal excluding shipping. Reported proceeds do not prove a completed payout.

Sellers can manage size/color option stock and fixed peso store vouchers. Buyers can rate delivered items; authorized Admins moderate reviews. Sellers also have own-store report exports, manual payout history, returned-goods receipt/restock and a recorded-cost profit ledger. Automatic bank transfers and audited tax accounting are not implemented. See [finance and returns](WORKFLOWS.md#finance) for rules and limits.

<a id="seller-source-references"></a>

### Source references

Sources: `InventoryController`, `OrderController`, `ReportController`, `Store`, `Product`, `SellerOrder`.

<a id="seller-seller-workspace-verification-2026-10-22"></a>

### Seller workspace verification (2026-10-22)

Seller reuses the Logistics/Rider toolbar, chart and metric components, plus a shared operational profile component. Queue counts and lists are scoped to the signed-in Seller's store through `SellerWorkspace`; the notification endpoint requires an approved, verified Seller and does not cache responses. Seller cannot perform pickup, receiving, dispatch, proof upload or COD collection operations.

Run `php artisan test --compact tests/Feature/SellerWorkspaceTest.php` for Seller queue, search, isolation, confirmation and review checks. The existing marketplace flow suite covers the connected checkout, fulfillment, Logistics/Rider delivery, proof and cash workflow. Run `node tests/Frontend/seller-workspace-browser-check.cjs` for the disposable SQLite browser scenario, including stock/weight saves, preparation, waybill printing and profile saves. It writes screenshots and results under `storage/app/seller-workspace-ui-check` and does not use the configured application database.

---

<a id="rider"></a>

## Rider

<a id="rider-how-it-works"></a>

### How it works

The interface calls this role Rider; its stored role is `rider`. Existing database names such as `rider_profiles` and `deliveries.rider_id` remain.

<a id="rider-registration"></a>

### Registration

Riders submit one registration at `/register?role=rider`, presented in three steps: personal/contact details with grouped name fields, Rider/address details and documents, then review/account security. Each step validates before continuing; Back retains details and selected files. The final submission includes their password, vehicle and plate number, operational Logistics center, ID, driver's license and OR/CR. All requirements are validated before creating an account.

After email verification they go directly to the waiting page; there is no second details submission for a new signup. Only the selected Logistics company/center reviews Rider applications; Admin can inspect them but cannot approve them. Rejection permits corrected resubmission through the existing application workflow. Delivery access remains gated by Logistics approval.

Public Rider signup uses email/password; existing Rider accounts can still use supported Google sign-in/linking, while incomplete Google-created Rider signup is blocked.

Existing company-created invitations and their activation URLs remain compatible. They are no longer the main signup flow. The Company Riders page prioritizes application review and account management.

<a id="rider-workspace-functions"></a>

### Workspace functions

| Function        | Current behavior                                                          |
| --------------- | ------------------------------------------------------------------------- |
| Assigned work   | View parcels assigned to the Rider                                        |
| Pickup/delivery | Advance assigned → picked_up → in_transit → out_for_delivery → delivered  |
| Proof           | Upload a private delivery photo before confirming completion              |
| COD             | Confirm collection at delivery; center receives cash and Admin reconciles |
| History/support | View delivery history/reports and authorized conversations                |

Operations require an approved account and operational center. Assignment must match center and service-area eligibility. Center receipt/sorting is required before dispatch for destination/weight quoted orders.

Reasoned failed attempts, Logistics holds/retries and scanned return-to-center receipt are implemented. Riders also see their own Logistics-recorded fees/payment history and can collect approved return-to-Seller parcels assigned by Logistics. Admin has no rider-payments access. Fees require actual work evidence; COD/shipping totals are not wages. First-come self-assignment and automatic bank transfers are not implemented. See [finance and returns](WORKFLOWS.md#finance) and the Logistics and Rider demo.

<a id="rider-source-references"></a>

### Source references

Sources: `DeliveryController`, `DashboardController`, `ReportController`, `User::canOperate`, `rider_service_area`.

---

<a id="logistics"></a>

## Logistics

<a id="logistics-context"></a>

### Context

> [!NOTE]
> The October update below is historical. Use the [current finance and returns contract](WORKFLOWS.md#finance) for version-3 item/quantity refunds and independent return tasks.

Update, 2026-10-26: Logistics exclusively handles Rider fees and payment records at `/rider-payments`; Admin cannot access that ledger. Logistics assigns approved whole-parcel returns; the assigned Rider collects and Seller confirms receipt. Admin separately handles Buyer refund decisions/records and Seller settlements. See [finance and returns](WORKFLOWS.md#finance). These manual workflows supersede the older payout/return gaps below; automatic bank transfers, batch manifests, GPS routing and physical device acceptance remain outside the implemented scope.

Logistics companies coordinate Riders, coverage and parcel custody. Registration requires ID, business/DTI permit and Admin approval. The stored role is `logistics`.

<a id="logistics-workspace-functions"></a>

### Workspace functions

| Function             | Current behavior                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rider management     | Review own Riders and apply permitted account changes; cannot undo Admin restrictions                                                                                                   |
| Rider signup         | Riders create their own accounts, verify email and choose the company/center; Logistics reviews the submitted requirements in Rider Applications                                        |
| Shipping rates       | Configure published barangay coverage, base fee, included weight, extra-kilogram fee and maximum weight                                                                                 |
| Pickup               | Approve pickup requests and assign eligible Riders                                                                                                                                      |
| Scan Parcel          | Open Operations > Scan Parcel in the sidebar for camera/scanner/manual lookup, parcel review and receipt/sorting/dispatch confirmations in one place                                    |
| Parcel processing    | Scan/enter the attached tracking reference, record receipt condition and destination bin/route, then prepare a one-parcel dispatch manifest; assigned Rider separately accepts handover |
| Exceptions / returns | Record Logistics decisions for failed delivery, hold, retry or scanned return-to-center receipt; damaged parcels remain held for escalation                                             |
| Cash handover        | Confirm actual cumulative cash and a receipt reference; shortages stay unresolved; Admin reconciles only verified full handovers                                                        |
| Reports/messages     | View/export completed parcel reports and scoped conversations                                                                                                                           |

<a id="logistics-how-it-works"></a>

### How it works

Quoted orders go to the Buyer-selected provider. Legacy unallocated parcels can be claimed by a center. Shipping fees use destination and packed weight; both Seller pickup and Buyer destination need coverage.

Publishing the first shipping rate enables Logistics quotes. After that, unsupported checkout is blocked rather than reverting to flat fees. Existing orders keep their original quotes. Report shipping totals are not Rider earnings or confirmed payouts.

Updated 2026-10-16: printable Code 39 tracking labels, scanner/manual entry, optional supported-browser camera capture and parcel event/custody history are implemented locally. See Logistics implementation and acceptance for verified checks and limitations. That October 16 record is historical. Current QR/POD and reverse-return behavior is documented in the [scanning guide](WORKFLOWS.md#scanning) and [finance/returns guide](WORKFLOWS.md#finance). Physical acceptance, batch manifests and GPS routing are not established by that report.

<a id="logistics-source-references"></a>

### Source references

Sources: `DeliveryController`, `RiderServiceAreaController`, `app/Http/Controllers/Logistics/`, `app/Services/Logistics/`, `resources/views/pages/logistics/`.

---

<a id="admin"></a>

## Admin

<a id="admin-how-it-works"></a>

### How it works

Admin oversees accounts, compliance and platform operations. Accounts are privately provisioned; public signup cannot select Admin. Approved, verified Admins share the current Admin permissions.

<a id="admin-workspace-functions"></a>

### Workspace functions

| Function             | Current behavior                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Registration reviews | Approve/reject eligible Buyer, Seller and Logistics applications; Rider approval and management belong exclusively to Logistics |
| Account management   | Review profiles and apply authorized restrictions/reactivation with recorded reasons                                            |
| Seller compliance    | Check category compliance, warn, hide/restore products or suspend Sellers                                                       |
| Support              | Review complaints, messages and private evidence; record resolutions                                                            |
| Finance/reports      | Configure commission, view sales/commission reports and reconcile COD after cash handover                                       |
| Platform content     | Publish announcements and policies                                                                                              |
| Audit                | Read recorded decisions and status changes                                                                                      |

<a id="admin-finance-and-returns"></a>

### Finance and returns

Admin records Seller payouts only after full COD receipt and reconciliation, and reviews current version-3 item/quantity refund requests. Approval credits Lubos Coins and records liability separately from any required physical-return task; it does not wait for Seller receipt or cash-reserve funding. See the [current finance/returns contract](WORKFLOWS.md#finance). Historical sales remain intact; adjustments and Seller balances are separate. Admin cannot create, read or pay Rider compensation records; Logistics handles them exclusively.

<a id="admin-source-references"></a>

### Source references

Sources: `routes/web.php`, admin/account/review/support/report controllers, `app/Services/Admin/`, `app/Policies/`.

---

<div align="center">

**LubosMart** · Workspaces · [Documentation](README.md)

</div>
