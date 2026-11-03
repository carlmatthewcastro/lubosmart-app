# LubosMart complete feature checklist

Owner decisions: 2026-10-25 (Asia/Manila). This is the implementation and acceptance register for the existing COD marketplace, ordered Admin first. Local implementation and tests do not establish deployed acceptance.

Acceptance update, 2026-10-26: the remaining manual COD finance/return feature rows are implemented and tested locally. [Finance and returns](FINANCE_AND_RETURNS.md) records roles, calculations, route entry points, test evidence and limits. **111 feature items** are listed below. Physical/live acceptance marked E remains outstanding; the full suite retains two documented legacy Logistics settings-test failures.

**I** = implemented in local source (verification evidence in linked guides/tests); **P** = implementation/acceptance pending; **E** = external integration or physical/deployed verification required. A feature is complete only when its success, validation, authorization, failure and replay paths work together.

Four-role workspace update, 2026-10-26: shared settings frames/categories, consequential-action dialogs, persisted-action toast feedback, live cart badges, scoped automatic workspace refresh, stale reviewed-subtotal protection, and print-review dialogs are implemented. See [workspace acceptance and fresh-account guide](WORKSPACE_ACCEPTANCE.md) for behavior, role connections, local checks, and outstanding physical/external acceptance. Admin retains its existing design.

## 1. Admin

Admin handles platform administration and seller settlement. Logistics exclusively handles Rider accounts, assignments, compensation and payment records. Admin does not approve Riders or manage Rider pay.

| ID | Feature | State | Required behavior / connection |
| --- | --- | --- | --- |
| A01 | Secure Admin login | I | Privately provisioned Admin; verified/approved access; public signup cannot create Admin |
| A02 | Dashboard | I | Real review, complaint, listing and sales figures; actionable links |
| A03 | Global search and notifications | I | Search authorized accounts/applications/conversations; individual Buyer/Seller/Logistics registration alerts and five-second refresh; no private document contents in results |
| A04 | Buyer application review | I | Follow each account's approval contract; eligible applications approve/reject with reasons |
| A05 | Seller application review | I | Verify required business/identity records and registered category |
| A06 | Logistics application review | I | Approve/reject company requirements; Rider review stays with Logistics |
| A07 | Private document review | I | Authorized, expiring access; no public storage paths |
| A08 | Application correction/resubmission | I | Preserve requirements and decision history |
| A09 | Account search and details | I | Read registration details; eligible access changes only |
| A10 | Account suspension/reactivation | I | Reasons, actor boundaries and audit; cannot bypass Logistics ownership of Riders |
| A11 | Company re-verification | I | Review change proposals; block company/Rider operations while pending; retain approved records until decision |
| A12 | Seller category compliance | I | Only permitted departments/categories; warnings and listing restrictions |
| A13 | Product hide/restore | I | Reasoned moderation; Seller cannot republish blocked products |
| A14 | Review moderation | I | Hide/restore verified reviews with reason and audit; hidden reviews excluded from public averages |
| A15 | Complaints/disputes | I | Scoped conversations, private evidence, resolution and audit |
| A16 | Messages | I | Authorized recipients and parcel-related support threads |
| A17 | Platform announcements/policies | I | Draft, publish, edit and public visibility controls |
| A18 | Commission settings | I | Validated future-order rate; historical snapshots retained; shipping excluded |
| A19 | Sales/commission reports | I | Completed sales, date filters and CSV export; distinguish proceeds from profit/payment |
| A20 | COD reconciliation | I | Only after full amount-verified Logistics cash receipt; duplicate reconciliation rejected |
| A21 | Audit history | I | Actor, subject, reason and recorded changes |
| A22 | Seller payout ledger | I | Admin records manual payout amount/reference only against reconciled, eligible seller proceeds; prevent duplicate payout |
| A23 | Return/refund decisions | I | Review owned-purchase request; record decision; require confirmed return receipt before manual refund |
| A24 | Refund ledger | I | Bounded actual refund, reference and actor; prevent duplicate refund; distinguish historical sales from adjustments |

## 2. Seller

| ID | Feature | State | Required behavior / connection |
| --- | --- | --- | --- |
| S01 | Registration/approval | I | Complete required personal, business, category and private documents |
| S02 | Store dashboard | I | Store-only queues, tasks, recent parcels and completed proceeds |
| S03 | Product creation/editing | I | Name, category, description, price, stock, packed weight and image validation |
| S04 | Image upload | I | Safe image types/size, upload feedback and failure cleanup |
| S05 | Active/hidden products | I | Preserve Admin moderation and store approval gates |
| S06 | Inventory filters | I | Name, published/hidden, low stock and missing weight; pagination |
| S07 | Size/color variants | I | Independent stock; shared product price/weight; retirement; purchase snapshots |
| S08 | Store vouchers | I | Fixed peso codes, minimum, expiry, capacity, pause; seller-funded discount |
| S09 | Order search/queues | I | New, preparing, ready, transit, issues, completed and cancelled |
| S10 | Preparation | I | Pending to preparing to ready; no skipped states or foreign-store updates |
| S11 | Waybill and barcode | I/E | Stable parcel identity; print/reprint audit; one seller parcel per physical package; physical printer check pending |
| S12 | Pickup connection | I | Ready work feeds Logistics; assignment does not mean physical collection |
| S13 | Tracking/proof | I | Recorded handovers and authorized private delivery proof |
| S14 | Buyer conversations/support | I | Own parcels only |
| S15 | Sales/commission/proceeds | I | Completed net product sales and snapshotted commission |
| S16 | Sales export | I | Own-store completed rows only, with date filters and safe CSV values |
| S17 | Account/security/settings | I | Confirmation and re-review for protected changes |
| S18 | Payout history | I | Read only own recorded seller payments; no payout claim from sales totals alone |
| S19 | Returned goods receipt | I | Confirm physical receipt and condition; explicit restock decision; stock restored at most once |
| S20 | Costs and profit ledger | I | Record own costs; distinguish sales proceeds, refunds, costs, outstanding settlement and actual payouts |

## 3. Buyer

| ID | Feature | State | Required behavior / connection |
| --- | --- | --- | --- |
| B01 | Registration/verification | I | Required identity/address details and applicable approval contract |
| B02 | Dashboard | I | Own purchases and shopping/support shortcuts |
| B03 | Browse/search/categories | I | Approved compliant products; correct department hierarchy |
| B04 | Product details | I | Price, stock, descriptions, variants and visible verified reviews |
| B05 | Wishlist | I | Save/remove own products |
| B06 | Variant selection | I | Required valid active option; separate cart lines for different options |
| B07 | Cart | I | Add, update/remove, stock feedback and mobile readability |
| B08 | Delivery addresses | I | Own addresses, default selection and first-save selection |
| B09 | Provider/shipping quote | I | Seller pickup and buyer destination coverage, packed weight, loading/error/retry |
| B10 | Voucher application | I | Confirm server-calculated own-store discount; no discount on unrelated stores/shipping |
| B11 | COD checkout | I | Atomic stock updates, ownership, rate/discount confirmation, retry idempotency |
| B12 | Multi-store purchase | I | One purchase; separate seller parcels, labels, shipping and COD obligations |
| B13 | Purchase search/queues | I | Own order/parcel/tracking/product/store results and pagination |
| B14 | Parcel tracking | I | Preparation, pickup, center receipt/sort, dispatch acceptance, delivery and issues |
| B15 | Cancellation | I | Before any preparation; restore correct product/variant stock once |
| B16 | Delivery proof | I | Private authorized access to own parcels |
| B17 | Order messages/support | I | Own conversations and complaints |
| B18 | Delivered-item ratings | I | One editable review per delivered order item; no other buyer's reviews |
| B19 | Return request/history | I | Request against own delivered parcel; reason, Admin decision and recorded return progress |
| B20 | Refund history | I | Actual approved/refunded amounts and references; no automatic transfer claim |
| B21 | Account/security/settings | I | Protected changes, confirmation, password/reset/logout |

## 4. Logistics

| ID | Feature | State | Required behavior / connection |
| --- | --- | --- | --- |
| L01 | Company registration/approval | I | Required company documents and Admin review |
| L02 | Center-scoped dashboard | I | Own queues, parcel activity and cash liabilities |
| L03 | Rider applications | I | Exclusively review affiliated Riders; decisions and correction workflow |
| L04 | Rider accounts | I | Own-company management; restrictions and operational eligibility |
| L05 | Company Rider invitations | I | Existing creation/activation/resend flow remains compatible |
| L06 | Service areas | I | Company coverage and Rider affiliations |
| L07 | Shipping rates | I | Base/included weight/extra kilogram/max weight; publication and historical quote preservation |
| L08 | Pickup approval | I | Ready seller parcels and correct company |
| L09 | Pickup assignment | I | Eligible affiliated Rider and matching service area |
| L10 | Scan/manual parcel lookup | I/E | Authorized tracking only; confirmation before action; physical devices pending |
| L11 | Center receipt | I | Scanned reference, expected custody and condition |
| L12 | Sorting | I | Received parcel, destination area/bin |
| L13 | Dispatch preparation | I | Sorted parcel and eligible delivery Rider; assignment distinct from acceptance |
| L14 | Monitoring/history | I | Recorded events, assignees and exceptions |
| L15 | Failed delivery decisions | I | Reasoned hold/retry/return-to-center; damaged parcels held |
| L16 | COD handover receipt | I | Actual cumulative amount/reference; shortage stays unresolved |
| L17 | Reports/export | I | Own-company date-filtered delivery/COD records |
| L18 | Scoped conversations | I | Affiliated work/contacts; no unrelated-company messages |
| L19 | Company settings/re-verification | I | Protected requests, documents and Admin review; Rider access follows company eligibility |
| L20 | Rider compensation | I | Logistics defines/records fees for its Rider's completed work; COD/shipping never automatically treated as wages |
| L21 | Rider payment ledger | I | Logistics exclusively records payments/references; own-company scope and replay protection; no Admin mutation |
| L22 | Return-to-seller custody | I | Authorized return assignment, physical seller receipt and traceable handovers |

## 5. Rider

| ID | Feature | State | Required behavior / connection |
| --- | --- | --- | --- |
| R01 | Registration/company approval | I | Personal/address/vehicle/license/OR-CR; only affiliated Logistics reviews |
| R02 | Assigned-work dashboard | I | Only own eligible pickups/deliveries and tasks |
| R03 | Pickup | I | Assigned ready parcel, attached waybill scan and physical collection confirmation |
| R04 | Center handover | I | Recorded through Logistics receiving; Rider cannot mark center sorting complete |
| R05 | Dispatch acceptance | I | Assigned manifest, correct tracking and actual handover |
| R06 | Out for delivery | I | Valid preceding center and dispatch gates |
| R07 | Delivery confirmation | I | Correct parcel/recipient, private proof and actual full COD amount |
| R08 | Failed attempt | I | Reason and retained history; Logistics determines retry/hold/return |
| R09 | COD cash handover visibility | I | Collections remain liabilities until verified center receipt/reconciliation |
| R10 | Delivery history/reports | I | Own completed work; COD value labelled separately from earnings |
| R11 | Messages/settings/security | I | Authorized conversations; company re-review for protected changes |
| R12 | Earnings/payment history | I | Read own Logistics-approved fees and actual payments; no editing own wages |
| R13 | Return transport | I | Assigned authorized return only, with confirmed seller handover |

## 6. Shared features and operational acceptance

| ID | Feature | State | Required behavior / connection |
| --- | --- | --- | --- |
| X01 | Server authorization | I | Role, owner, store, company/center, assignment and account eligibility on every action |
| X02 | Authentication | I | Login/logout, verification, password reset, supported Google flows and session invalidation |
| X03 | Private files | I | Identity, business documents, evidence and proof are never public |
| X04 | Validation and feedback | I | Inline errors, retained safe input, progress, empty/error states, confirmation dialogs, toast feedback and duplicate-submit prevention |
| X05 | Transaction integrity | I | Ordered transitions, stock/finance effects once, history and request replay protection |
| X06 | Notifications | I/E | Scoped task counts, live cart badge and active workspace refresh; configured transactional mail delivery needs environment verification |
| X07 | Responsive/themes | I/E | Shared branding, mobile/light/dark checks; full screen-reader/zoom/contrast acceptance outstanding |
| X08 | Offline handling | I/E | No claimed success before server confirmation; no offline custody replay system |
| X09 | Backups and migrations | I/E | Back up configured local DB before schema changes; production backup/restore acceptance required |
| X10 | Deployment acceptance | E | Explicit deployment authorization, live mail/Google/storage/queue/HTTPS and physical role journey |
| X11 | Online payments | E | COD is current scope; another payment mode needs a chosen provider and reconciliation/refund integration |

## Completion sequence

1. Verify Admin and cross-role access; fix concrete defects while preserving current approvals.
2. Seller reports and Admin seller payout records after reconciled COD.
3. Logistics-owned Rider fees/payments and read-only Rider history.
4. Admin-approved return, confirmed seller receipt, explicit restock and recorded manual refund.
5. Seller cost/profit and adjustment reporting based on recorded money, not invented payouts.
6. End-to-end role tests, negative/replay cases, browser/production build checks, and separately authorized deployed acceptance.

Business decisions confirmed by owner: Logistics owns all Rider matters; Admin records seller manual payouts only after COD reconciliation; Admin controls returns/refunds with confirmed return receipt and manual refund references. Monetary records must describe actual recorded transfers, never initiate an unconfigured bank/payment transfer.

Completion evidence, 2026-10-26: the latest full run has **1,067 passing tests, 3 skipped, and 2 existing legacy Logistics settings expectations failing (8,206 assertions)**. The supported company re-verification API has separate passing coverage. All **38 browser scenarios** pass: 14 Seller/Buyer/finance/return scenarios, 16 Logistics/scanning/waybill scenarios, and 8 account-settings/Admin-review scenarios. A separate authenticated Seller session updated the open Buyer page in 4.58 seconds while preserving an unsent Buyer message. Dialog Escape/focus restoration, mobile checkout confirmation, print-media exclusion of dialogs/toasts, and an exported sample waybill PDF were verified. TypeScript, targeted ESLint/Prettier, PHP Pint, and the production build pass. The local login responds HTTP 200. Physical devices, actual external email, fresh real-account acceptance, comprehensive accessibility, and concurrent MySQL/load acceptance remain outstanding. See [workspace acceptance](WORKSPACE_ACCEPTANCE.md).

Sources: [role guides](README.md#functions), [seller/buyer completion](SELLER_BUYER_COMPLETION.md), [core requirements](standards/CORE_WORKFLOWS_AND_SCANNING_REQUIREMENTS.md), routes/controllers/services and existing role/marketplace/Account feature tests. Historical guides may contain pre-2026-10-25 gaps; newer verified implementation evidence takes precedence. Update each pending row only after implementation and its acceptance checks pass.
