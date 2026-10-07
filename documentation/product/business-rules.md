# Core functions, system categories and business rules

Functional ERP modules below are derived from ERP Components. The supplied `ITEP 308 CATEGORIES.pdf` now defines the separate product taxonomy: [14 departments and 83 subcategories](erp-categories.md). These are not account roles or ERP modules. The project follows Shopee-style marketplace flows; it does not claim to reproduce Shopee's current policies or fee schedule.

## Functional categories

| Category | Core functions | Current scope |
| --- | --- | --- |
| Identity and account management | Registration, login, Google, verification, review, suspension, profile/recovery | Authentication baseline exists; approval and role boundaries planned |
| Catalog and inventory | Hierarchical categories, search/filter, stock, seller/category compliance | Taxonomy seeder/relationships and checkout category checks implemented; management UI pending |
| Sales and order management | Cart, addresses, checkout, seller splits, fulfillment history | Schema and checkout action exist; integration remains |
| Logistics and sorting | Parcel receipt/scans, areas, dispatch, rider acceptance/proof, failures/returns | Delivery schema exists; center workflows planned |
| COD and accounting | Collection, handover, reconciliation, commission, seller settlement | Checkout snapshots commission; collection/settlement schema exists; operational actions and adjustment ledger pending |
| Administration and reporting | Approvals, complaints, platform settings, sales/commission reports | Settings model exists; authorized management UI planned |
| Customer support | Messaging, disputes, evidence, review/feedback | Phase two; private uploads require access controls |

## Core rules

1. **COD only:** persist `payment_method=cod` from server logic; reject unsupported submitted values. No card, wallet, gateway, checkout payment selection or OAuth billing integration.
2. Only an active, approved, verified buyer may place an order. Existing checkout checks buyer role/status; add email/application checks at the authorized request boundary.
3. Buyer-owned cart and address are mandatory. Ignore browser prices, totals, shipping fees and commissions; reload database state.
4. Products must be active, have enough stock, have an active category/department and belong to approved stores. Checkout rejects categories outside a store's declared `business_category_id` when set. Legacy stores with null department remain compatible; review/backfill them before requiring classification. Authorize and validate category compliance on future catalog writes too.
5. One checkout creates one parent order, one seller order per store, and one delivery per seller order. Existing uniqueness rules enforce this MVP packaging model.
6. Snapshot item name/price and shipping address. Later product/address changes cannot rewrite order history.
7. Calculate money in integer centavos or exact decimals, never binary floating point. Existing checkout uses integer cents and snapshots database-configured shipping per seller order.
8. Orders, stock deductions, child records and cart clearing must commit together. Lock competing inventory in consistent order. Add a checkout idempotency key in the authorized HTTP integration so browser/network retries cannot create duplicate orders.
9. Only the owning seller operates its seller orders, and only the assigned eligible rider completes a delivery. Logistics is bounded to assigned centers. Admin overrides require recorded reasons.
10. Delivery evidence and identity documents are private. Buyers/sellers/riders see only the personal details needed for their own transaction.

## Status ownership

| Record | Existing values | Authority / next implementation |
| --- | --- | --- |
| Order | pending, processing, completed, cancelled | Server aggregates seller orders |
| Seller order | pending, processing, shipped, completed, cancelled | Authorized seller plus system delivery completion |
| Delivery | unassigned, assigned, picked_up, in_transit, delivered, failed | Dispatch/rider workflow with validated transitions |
| Store | pending, approved, rejected | Admin review |

Proposed transitions: seller order pending → processing → shipped → completed; cancellation is allowed before pickup. Delivery unassigned → assigned → picked_up → in_transit → delivered; failed attempts require reason and explicit retry/return handling. Failed must not mean delivered or paid. Add return/custody events through new schema rather than forcing unsupported values into existing enums.

For parent aggregation, define completed when every non-cancelled child is completed and at least one completed child exists; cancelled when all children are cancelled; otherwise pending/processing according to accepted work. Display individual seller states for mixed outcomes. Cancellation after pickup requires a return/dispute operation; no direct deletion of records.

When cancelling before pickup, restore stock exactly once in the cancellation transaction. Existing checkout decrements stock but does not implement this cancellation workflow. Hide ordered products instead of deleting historical references.

## Confirmed commission structure

The user confirmed **10% of each seller order's item subtotal, excluding shipping**, with settlement only after COD reconciliation. This is the project's fee, not a statement about Shopee's fees.

| Component | Rule |
| --- | --- |
| Rate | Persisted `commerce_settings.platform_commission_basis_points`; default 1000 = 10.00% |
| Basis | Seller-order item subtotal; no commission on shipping; no extra buyer charge |
| Rounding | Half-up to a centavo once per seller order, using integer arithmetic |
| Snapshot | `commission_basis_points`, `commission_amount`, `seller_proceeds` saved at checkout |
| Seller proceeds | Item subtotal minus commission; excludes shipping allocation |
| Historic orders | Nullable snapshots stay null; no automatic retroactive fee |
| Recognition | Checkout calculates expected amounts, not earned revenue or a payout |
| Settlement | Delivered/completed order plus full matching reconciled COD collection and resolved disputes; authorized settlement action required |
| Changes | Future admin rate changes affect new orders only; audited, validated range 0–10000 basis points |
| Cancellation/returns | No commission earned on cancelled goods; returns require explicit reversal/refund accounting before payout |

Example: store A items PHP 1,000.00 plus PHP 50.00 shipping means PHP 1,050.00 COD, PHP 100.00 commission and PHP 900.00 seller proceeds. Store B's parcel has its own subtotal/shipping/commission. Never collect the parent-order total on each parcel. At PHP 100.05 item subtotal, the default fee is PHP 10.01 and seller proceeds PHP 90.04.

No discounts are applied currently. When introduced, calculate the basis from the seller-funded discounted item subtotal, allocate centavos deterministically, define treatment of platform-funded vouchers, and snapshot the result. Do not enable vouchers before those accounting rules exist.

## COD collection and settlement (schema foundation; actions pending)

Delivery status and cash status are independent. Absence of a `cod_collections` row means uncollected; the table's states are `collected`, `handed_over`, `reconciled`. Unique delivery/reference fields prevent duplicate records; application actions must validate matching amount, role, parcel and state. Adjustment/refund records remain planned rather than overwriting originals.

- Amount due per package is that seller order's snapshotted item subtotal plus shipping fee. Do not charge the full parent total for each store's parcel.
- Rider records collected amount, timestamp, receipt/reference and proof; full payment is required for successful COD completion. Short payment or refusal goes to failure/dispute handling.
- Cash handover records sender, receiver, amount, time and acknowledgement; logistics/admin reconciles against expected receipts. Repeated requests use unique references/idempotency and cannot duplicate collection or settlement.
- Seller payout uses reconciled cash only. Cash collected is not platform revenue; distinguish seller proceeds, shipping allocation and commission.
- Confirmed commission: 10% of item subtotal excluding shipping. Checkout snapshots expected commission; cancellation/returns prevent or reverse recognition through future accounting actions.
- Admin may change the configured future rate with audit history; historical orders keep their snapshot. No hardcoded fee or rate in React/controllers.

The new migrations add collection/handover/reconciliation fields and one settlement per seller order. They do not enforce cross-table correctness or authorize payouts on their own. No cash collection/reconciliation/settlement endpoint or automatic payout exists. Implement locked actions/policies, a transaction audit and an adjustment/refund ledger before processing money operationally. A delivered flag alone cannot support an accounting report.

## Standard marketplace features and operational limits

These are project design limits, not Shopee policy claims. Values in **proposed** rows are initial owner-review defaults, not currently enforced or stored settings. Persist configurable limits when the feature is built; show the effective policy to customers.

| Feature | Scope and operational limitation | Implementation status |
| --- | --- | --- |
| Catalog/search | Active listings/categories only; paginated search, allowlisted filters/sorts; hide archived products, preserve history | Schema and checkout enforcement; catalog endpoints/UI pending |
| Product variations | SKU per size/color, price/stock per SKU; no invented browser variation price; max 50 combinations proposed | Needs variant/SKU schema and cart/item migration; current single product stock only |
| Cart/checkout | One cart/account; proposed max 50 distinct items and 99 units/item; validate available stock at checkout; retries idempotent | Base transaction exists; caps/idempotency endpoint pending |
| COD coverage/limit | Serviceable address required; proposed PHP 25,000 maximum per parcel including shipping; no prepaid/international orders | COD-only enforced; coverage/cap validation pending |
| Seller onboarding | One store/account and one declared department initially; products use subcategories in that department; sensitive/prohibited goods require moderation | Store FK and checkout check; classification/review UI pending |
| Vouchers/discounts | Proposed one seller voucher per seller order, no stacking, no negative totals; server usage limits, dates, budget and per-user uniqueness | Disabled until voucher schema, allocation and commission rules exist |
| Wishlist | Own account only; no stock reservation or price guarantee | Wishlist table/UI pending |
| Shipping/tracking | One parcel/seller order; configured fee snapshotted; approved area rider only; scanning idempotent | Delivery/center/event schema; dispatch/scan actions pending |
| Cancellation | Before physical pickup; restore stock exactly once; after pickup use return/dispute, not direct cancellation | Cancellation and stock-restoration action pending |
| Delivery failure | Proposed 2 attempts then reviewed return-to-seller; unpaid parcel never marked delivered; retain evidence/reason | Base failed status; attempt/return records/actions pending |
| Returns/refunds | Proposed request within 7 days of delivery; evidence and authorized decision; manual documented cash refund, no wallet | Return/refund ledger and workflow pending |
| Ratings/reviews | 1–5 stars, one review per delivered order item; proposed 7-day editing window; moderated text/images | Review schema/verified-purchase checks pending |
| Chat/notifications | Only transaction participants; proposed text max 2000 chars, no attachments initially; abuse limits and private access; durable retryable mail | Registration mail baseline; messaging/notification workers pending |
| Complaints/disputes | Buyer/seller/rider evidence scoped to transaction; staff access audited; unresolved dispute blocks settlement | Dispute schema/actions pending |
| Reports/settings | Owner/center scoped totals; exclude pending/cancelled fees from earned commission; reconcile cash before payout | Commission snapshots and settings exist; authorized reports/UI pending |

Food/supplements/pet-health categories do not authorize unsafe or restricted goods. Proposed MVP excludes medicines requiring prescriptions, live animals, weapons, counterfeit items, hazardous automotive fluids, and perishable food until handling/eligibility controls exist. Product-category presence is not permission to list everything in it. Moderation rules need an owner-reviewed denylist and enforcement before catalog launch.

## Dynamic data and phase boundaries

Use persisted category IDs, area mappings, rates/settings, inventory and authorized queries. Sample Laguna destinations in the PDF illustrate routing; they must not become hardcoded dispatch rules. Seed demonstration data separately from production settings.

Phase one: approved identities, protected role workflows, catalog/cart/COD checkout, sorting/delivery, cash reconciliation and basic reports. Phase two: chat, vouchers/discounts, reviews, rich reports and further dispute tooling. Each expansion requires its own rules and acceptance criteria.
