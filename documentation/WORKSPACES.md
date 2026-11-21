<div align="center">

# Workspaces

**Buyer, Seller, Rider, Logistics and Admin responsibilities.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

## Overview

Each website workspace is scoped to its role, account approval and owned or assigned records. Use this guide for capabilities and [Workflows](WORKFLOWS.md) for the connected order, custody and financial rules.

[Buyer](#buyer) · [Seller](#seller) · [Rider](#rider) · [Logistics](#logistics) · [Admin](#admin)

## Registration and access

| Role      | Requirements and reviewer                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| Buyer     | Personal/contact/address details and private government ID; Admin review                                            |
| Seller    | Personal details, declared category, ID and business documents for the Seller type; Admin review                    |
| Rider     | Personal details, vehicle, plate, affiliated operational center, ID, license and OR/CR; affiliated Logistics review |
| Logistics | Personal/company details, ID, business documents, TIN and service regions; Admin review                             |
| Admin     | Private provisioning; unavailable through public signup                                                             |

New complete applications remain pending after email verification until the designated reviewer approves them. This includes password-based Buyer signup: the current [lifecycle service](../web/app/Services/AccountVerificationLifecycle.php) and [registration test definitions](../web/tests/Feature/Auth/BuyerSellerRegistrationTest.php) require review. Rejected applicants can correct and resubmit. Legacy accounts and company invitations retain their applicable activation flows.

Documents use private storage; applicable role rules validate file types and a 5 MB limit. Operational access requires approved status and verified email. Riders additionally require an operational affiliated center and the capability for the assigned leg. Suspension and deactivation block access through existing sessions/tokens as well as new sign-in.

See [registration field coverage](standards/REGISTRATION_REQUIREMENTS.md) for the complete field mapping and web/native Google enrollment distinction.

<a id="buyer"></a>

## Buyer

| Area                 | Supported actions                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shopping             | Search/filter products, view options and visible verified-purchase reviews, manage a wishlist                                                          |
| Cart and addresses   | Adjust quantities, remove items and manage delivery addresses                                                                                          |
| Checkout             | Review server-calculated shipping, select an eligible store voucher and optionally use Lubos Coins against merchandise; create separate Seller parcels |
| Orders               | Search/filter owned parcels, track progress and view authorized delivery proof                                                                         |
| Follow-up            | Message Sellers, use support/complaint conversations and rate delivered items                                                                          |
| Cancellation/returns | Cancel while all Seller orders remain pending; request eligible original item quantities for refund review                                             |

Current version-3 refunds credit Lubos Coins through Admin approval. Physical-return tasks remain separate, and original tracking/COD history is preserved. Automatic bank/provider refunds are not implemented. See [finance and returns](WORKFLOWS.md#finance).

Sources: `MarketplaceController`, `OrderController`, `SupportCaseController`, `CreateOrderFromCart`, `web/resources/views/pages/marketplace/`.

<a id="seller"></a>

## Seller

| Area             | Supported actions                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Dashboard        | Own-store queues, task counts, workload charts, recent parcels and completed proceeds                                    |
| Inventory        | Photos, prices, size/color option stock, packed weight, listing visibility and registered-category compliance            |
| Inventory search | Product-name search and published, hidden, low-stock (under 5) or missing-weight filters, retained through pagination    |
| Fulfillment      | Prepare pending orders, mark ready for pickup and print the internal waybill                                             |
| Order queues     | New, preparing, ready, in delivery, delivery issues, completed and cancelled; numeric ID or tracking/recipient search    |
| Promotions       | Fixed-peso shop vouchers, eligible usage limits and public/private visibility                                            |
| Finance          | Own-store sales/commission reports and exports, manual payout history and recorded-cost profit ledger                    |
| Returns/support  | Confirm physical receipt and condition, restock eligible intact quantities, use order messages and support               |
| Settings         | Shared personal, store/bank, address, document, contact and security settings with existing confirmation/review controls |

Seller preparation advances `pending` → `processing` → `shipped`; the interface describes `shipped` as Ready for Pickup. This does not establish physical custody. Sellers cannot perform Rider pickup, facility receipt, dispatch, delivery proof or COD collection operations.

Commission defaults to 10% of net merchandise, excluding shipping. Displayed proceeds are distinct from a recorded payout. Automatic bank transfers and audited tax accounting are outside the implemented ledger. Use [finance rules](WORKFLOWS.md#finance) for settlement prerequisites.

<a id="seller-seller-workspace-verification-2026-10-22"></a>

### Verification references

Seller queues and counts are scoped through `SellerWorkspace`. The Seller notification endpoint requires an approved, verified account and does not cache responses. Shared toolbar, chart, metric and operational-profile components support the workspace.

From `web/`, use `php artisan test --compact tests/Feature/SellerWorkspaceTest.php` for queue/search/isolation checks. The connected marketplace tests cover checkout and delivery boundaries. `node tests/Frontend/seller-workspace-browser-check.cjs` exercises a disposable SQLite scenario and writes to the root `.tools/development-artifacts/storage-app/seller-workspace-ui-check/`. These are verification entry points, not results from this documentation cleanup.

Sources: `InventoryController`, `OrderController`, `ReportController`, `SellerWorkspace`, `Store`, `Product`, `SellerOrder`.

<a id="rider"></a>

## Rider

Riders sign up at `/register?role=rider` through three steps: personal/contact details, Rider/address/documents, then review and account security. Back retains entered details and selected files. The server validates the complete submission before creating the account; after email verification, it goes directly to the Logistics review queue without a second application submission.

Only the selected Logistics company reviews Rider applications. Admin can inspect them but cannot approve them. Public Rider signup uses email/password; supported existing Google sign-in/linking and company invitation activation remain compatible. Incomplete Google-created Rider signup is blocked.

| Area                 | Supported actions                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Assigned work        | View capability-appropriate pickup, delivery and eligible return tasks                            |
| Custody              | Scan and confirm assigned pickup and delivery handovers, with facility processing between them    |
| Delivery             | Start delivery and submit private proof, recipient details and exact remaining COD confirmation   |
| Exceptions           | Record reasoned failed attempts; Logistics decides hold, retry or return-to-center handling       |
| Cash                 | Submit collected cash handover; Logistics verifies actual receipt and Admin separately reconciles |
| History/compensation | View permitted work history, reports and own Logistics-recorded fees/payments                     |
| Support              | Use authorized conversations and account tools                                                    |

Assignments must satisfy center, capability and coverage checks. Pickup and delivery Riders may differ; assignment history does not itself prove custody. Rider compensation requires actual work evidence and is separate from COD or shipping totals. Logistics owns compensation records; Admin has no access to that ledger. Self-assignment and automatic bank transfers are not implemented.

Sources: `DeliveryController`, `DashboardController`, `ReportController`, `User::canOperate()`, `User::canRide()`, `rider_service_area`. See [scanning/POD](WORKFLOWS.md#scanning) and [finance/returns](WORKFLOWS.md#finance).

<a id="logistics"></a>

## Logistics

Logistics companies coordinate their own Riders, coverage, parcels and cash handovers.

| Area               | Supported actions                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Rider management   | Review affiliated applications, configure pickup/delivery capabilities and apply permitted restrictions; cannot undo Admin restrictions |
| Coverage and rates | Publish barangay coverage, base fees, included weight, extra-kilogram fees and maximum weight                                           |
| Pickup             | Approve requests and assign eligible Riders                                                                                             |
| Scan Parcel        | Camera/scanner/manual lookup with parcel review and authorized receipt/sorting/dispatch actions                                         |
| Facility work      | Record receipt condition and destination bin/route; prepare one-parcel dispatch, followed by Rider acceptance                           |
| Exceptions/returns | Record hold/retry decisions, scanned return-to-center receipt and independent approved return-task assignments                          |
| Cash/remittances   | Verify actual cumulative Rider receipt, preserve discrepancy history, retain shipping and submit merchandise remittance                 |
| Compensation       | Record evidence-backed parcel fees or explicit weekly agreements and actual payment references                                          |
| Reports/support    | Scoped parcel reports/exports and conversations                                                                                         |

Quoted orders use the Buyer-selected provider. Legacy unallocated parcels can be claimed by an eligible center. Both Seller pickup and Buyer destination require coverage; fees depend on destination and packed weight. Publishing the first rate enables Logistics quoting, after which unsupported checkout is blocked instead of falling back to flat fees. Existing orders retain their quotes.

Cash shortages remain unresolved until full receipt is verified. A remittance submission alone does not establish platform funding or permit Seller settlement. Logistics exclusively manages Rider compensation. Batch manifests, GPS routing and automatic transfers remain outside the documented implementation; physical-device acceptance is separate.

Sources: `DeliveryController`, `RiderServiceAreaController`, `web/app/Http/Controllers/Logistics/`, `web/app/Services/Logistics/`. Earlier October changes are retained in [historical reviews](reviews/README.md).

<a id="admin"></a>

## Admin

Approved, verified Admins share the current Admin permissions. Public registration cannot select this role.

| Area          | Supported actions                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Reviews       | Approve/reject eligible Buyer, Seller and Logistics applications; inspect Rider submissions without taking over Logistics approval |
| Accounts      | Review profiles and apply authorized restrictions/reactivation with reasons                                                        |
| Compliance    | Enforce Seller category rules, warn, hide/restore products and suspend Sellers                                                     |
| Support       | Review complaints, messages and private evidence; record resolutions                                                               |
| Finance       | Configure commission, view reports, reconcile verified COD, confirm actual platform receipt and record eligible Seller payouts     |
| Refunds       | Review original item quantities/amounts, credit Lubos Coins and record responsibility independently of physical returns            |
| Content/audit | Publish policies/announcements and inspect recorded decisions                                                                      |

Refund approval credits coins and records liability atomically; it does not wait for Buyer acceptance, Seller receipt or cash-reserve funding. Seller settlement separately requires delivery, reconciliation, verified funding and resolved holds/balances. Historical sales remain intact. Admin cannot create, read or pay Rider compensation records.

Sources: `web/routes/web.php`, Admin/account/review/support/report controllers, `web/app/Services/Admin/`, `web/app/Policies/`. See [approval notifications](WORKFLOWS.md#approvals) and [finance](WORKFLOWS.md#finance).

[Documentation](README.md)
