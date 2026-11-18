> Historical composite: earlier implementation notes and test/migration results are retained below. Use the [current guide](../../workflows/FINANCE_AND_RETURNS.md) for workflow instructions. These results were not rerun.

# Seller settlement, Logistics Rider payments, returns and profit

## Current source contract — November 16, 2026

This section supersedes the historical workflows below. Implementation is local source work, not a deployment or a certification of production acceptance. See the [audit](FINANCIAL_FULFILLMENT_AUDIT_2026_11_11.md), [parcel checkpoints](../../workflows/PARCEL_SCANNING.md), [API compatibility](../../api/FINANCE_2026_11_11.md), and [handoff](GITHUB_HANDOFF_2026_11_15.md).

### Responsibilities and custody

COD handovers now have explicit submissions at both custody boundaries. Rider
submits the fixed collected COD amount with a system-derived reference. Logistics
confirms those same details or separately reports an actual cash discrepancy.
After full receipt, Logistics uses Shipping & Remittances → View details →
Hand over cash to Admin. This records a fixed product amount and generated LMHO
reference, with shipping retained by Logistics. Admin receives a notification,
verifies COD reconciliation, and separately confirms actual receipt using the
same handover reference. Submission alone never funds Seller settlement. Actual
receipt date and evidence remain required; historical receipt workflows remain
supported. These changes require no schema migration.

The account role remains **Rider**. Logistics controls `pickup`, `delivery`, or `both` capabilities. Existing accounts default to `both`; restricting capability is refused while active work, reverse transport, or outstanding COD would be stranded. Admin cannot configure Logistics wages.

Parcels retain separate pickup/delivery riders, assignment dates, append-only assignment records, and custody evidence. The old `rider_id` remains a current-assignment compatibility field. Historical checkpoint actors backfill reliable rider identities; unknown assignment dates remain unknown. COD always belongs to the actual recorded collector. A pickup rider keeps pickup history after dispatch assignment, with buyer contact/proof restrictions.

Ordinary reassignment ends before accepted custody. For an exceptional replacement, Logistics must receive the undelivered parcel at the facility, document the reason, and choose an eligible covered delivery rider. The replacement scans and accepts a separate custody transfer. Original forward checkpoint timestamps remain unchanged.

### Cash, settlement, and compensation

All authoritative arithmetic uses centavos or the existing decimal snapshots. Large proportional allocations avoid intermediate multiplication overflow. Define:

- Net merchandise = original merchandise minus the seller-funded voucher.
- Commission = the original configured basis-point snapshot applied to net merchandise.
- Seller proceeds = net merchandise minus commission.
- Merchandise cash = net merchandise minus redeemed coins.
- COD due = merchandise cash plus shipping.
- Platform merchandise funding = verified merchandise-cash remittance plus the backed original coin allocation.

Buyer cash passes to the delivery rider and then Logistics. Logistics retains shipping and remits **only merchandise cash** to the platform. A fully coin-funded merchandise purchase requires no zero-value merchandise remittance; its cash shipping still requires COD verification. There is no second shipping payout.

Rider cash receipt entries record cumulative observed receipt amounts, expected cash, discrepancy, receiver, timestamp, reference, and reason. They are observations/corrections, not additional receipts to sum. The current COD row projects the latest observation. Shortages remain unreconciled; earlier shortage evidence is retained when the balance is corrected.

Seller payout still requires completed delivery, exact COD reconciliation, verified cash/coin funding, resolved return holds, and enough store balance after earlier payouts/refunds. Historical payouts are retained. Repayments against established seller debt replenish backing and reduce the recoverable balance, preventing a second deduction from future settlements. Stores cannot offset each other's debt.

Logistics may agree a future seven-day weekly compensation period for an individual rider. Amount, period, planned payment date, notes, actual payment reference, and paid timestamp are recorded. Overlapping periods and duplicate payments fail. Covered work cannot also receive parcel fees. Existing parcel fees remain intact; weekly periods are explicit agreements, not an automatic salary scheduler. COD is never wages. Buyer-return collection and seller-return transport are distinct compensable work; a collection fee requires facility receipt evidence.

### Returns and refund funding

The [November 16 return/refund repair](RETURN_REFUND_REPAIR_2026_11_16.md) supersedes earlier return, consent and reserve-gating descriptions. New requests use workflow version 3 and can select original items/quantities and repeat requests against remaining eligibility. Pending requests reserve quantities; rejection releases them. Net paid prices, discounts, original coin allocations, original shipping and prior refunds cap every approval.

Admin approval records the reviewed financial decision, spendable coin credit, liability, adjustments, audit and any required physical-return task atomically. Wallet operation keys and a unique task/case reference prevent replay. A successful approval does not wait for buyer acceptance, seller receipt or recorded cash-reserve funding. It records an obligation, not a cash receipt or bank transfer. Actual cash funding and responsible-party recoveries remain separately evidenced.

Refund review/credit, return-task custody and financial settlement/recovery are distinct. Physical returns follow approved task -> collection assignment -> rider collection proof -> actual facility receipt -> seller dispatch acceptance -> rider seller-delivery proof -> seller confirmation. The same rider remains selected if both capabilities and coverage permit. No-return refunds create no task. Existing delivery/tracking and payment history stay intact. Missing historical custody/proof is never fabricated.

The configured return window remains delivery-specific, with authorized exceptions and private damage/incorrect-product evidence. The seller no longer supplies a scan/tracking value. Seller receipt records actor/time and restocks approved intact quantities once; discrepancies never automatically reverse coins.

Refund responsibility and return-shipping responsibility are separate decisions. Seller deductions adjust pending proceeds or preserve already-paid proceeds as recoverable balances. Logistics fault records company liability, never an assignment-based rider charge. Buyer/platform-responsible refunds retain the supported platform expense treatment. Completed return-work fees link to the unique task and record transport responsibility separately from refund value and actual rider payment.

### Lubos Coins

One Lubos Coin remains PHP 1.00 with centavo precision. Credits are non-transferable, with no top-ups, rewards, interest, withdrawal or expiry. Approval restores the original coin-funded share and credits the cash-funded approved share as coins immediately. No buyer offer/acceptance step or later issue-credit form is required. Historical external cash refunds keep their original interpretation and are never automatically converted again.

Checkout remains opt-in and spends available coins against merchandise after vouchers; shipping remains cash. Cancellation restores the original debit once. Partial refunds allocate net paid value deterministically, cap cumulative refunds/restorations, and balance commission rounding across cases. New liability-based wallet corrections do not change cash reserve; historical reserve-funded corrections retain their original reserve treatment.

### Shop vouchers and reporting

The four configurable presets suggest PHP 10/200/20 uses, 20/400/20, 50/1,000/10, and 100/2,000/5, each for 30 days. Selection prefills editable settings; seller confirmation activates the promotion and generates its code. Existing manual vouchers stay private unless explicitly made public. Templates respect the seller's public/private selection.

Public vouchers appear on product pages, store-filtered shop pages, and the cart/checkout. Buyers select an eligible suggestion, see the best eligible discount recommendation, and can remove it. Preview/selection never consumes a use. Locked checkout revalidates capacity, buyer reuse, store eligibility, activation, expiry, and minimum spend. There is one voucher per checkout, no stacking/free-shipping promotion, and no automatic usage restoration after a completed return.

Finance separates expected, collected, Logistics-received, reconciled, platform-funded, payable, paid, refunded, and outstanding values. Order-creation date, exact reference, and COD-status filters scope the transaction list. Live wallet liability and available unallocated refund backing are explicitly all-time figures. Logistics/Rider compensation remains inaccessible to Admin.

### Migrations and safe local use

Six additive migrations were added, in order:

1. `2026_11_15_145227_add_rider_capabilities_and_parcel_assignments.php`
2. `2026_11_15_145724_add_cash_receipt_history_and_weekly_compensation.php`
3. `2026_11_15_150115_extend_returns_and_add_refund_funding.php`
4. `2026_11_15_150736_add_lubos_coin_wallets_and_refund_offers.php`
5. `2026_11_15_180829_add_public_shop_voucher_visibility.php`
6. `2026_11_15_181351_track_refund_recoveries.php`

They were tested on disposable databases. Follow-up on November 16: these six migrations and the pending November 14 checkpoint migration were applied to local `ecommerce_db` as batch 24, after a verified 63-table SQL backup. Original row counts/content in 14 financial, inventory, and fulfillment tables were unchanged. Wallets/weekly payments remain empty, the reserve is zero, and existing riders retain both capabilities. Backup manifests and verification results are private under `storage/app/private/backups/`. Back up and verify the intended local target before reviewing all pending migrations and running `php artisan migrate`. Do not use `migrate:fresh` or destructive rollback on application data. Populated financial ledgers require a reviewed forward fix. Once coin payments or restricted capabilities are active, reverting to old application code would use incorrect COD/authorization rules; deploy a forward fix instead.

Use a fresh PowerShell session for isolated checks: set `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` and run `php artisan test --compact`. Frontend checks use `npx.cmd tsc --noEmit`, targeted `npx.cmd eslint`, and `npm.cmd run build`. `node tests/Frontend/finance-browser-check.cjs` and `node tests/Frontend/mobile-api-http-check.cjs` create guarded temporary SQLite fixtures.

`php tests/Fixtures/finalization-concurrency.php` creates and removes a uniquely named synthetic MySQL schema. Prefer a separate loopback test instance: set `FINALIZATION_MYSQL_PORT` to its port; that override expects an empty-password root on the disposable instance only. Never point a test instance at the normal data directory. MariaDB acceptance passed on an independent temporary instance at port 34181. An earlier attempt against a generated schema on the normal local server disconnected during migration; schema `lubosmart_finalization_test_12ca65f95127` may remain there. No repair of that server or configured application-table migration was performed. Inspect/remove only that generated schema after normal local-server recovery.

The dated sections below are historical, including their test totals and local migration statements.

Update, 2026-11-11: [financial integrity implementation](FINANCIAL_FULFILLMENT_IMPLEMENTATION_2026_11_11.md) adds the owner-approved shipping-retention/product-remittance model, evidence-based platform receipts before new Seller payouts, reviewed return responsibility, explicit new refund splits and scoped finance views. Its two migrations remain unapplied to the configured database. Earlier dated results and setup notes below are historical.

Implemented locally on 2026-10-25/26 (Asia/Manila), following the owner's role decisions. These workflows record manual transactions; no bank transfer or online payment provider is installed.

## Historical first-release details

The sections below describe the earlier release. Return sequencing, manual refund entry, single-case restrictions and receipt/consent/funding gates are superseded by the current contract above and the [repair report](RETURN_REFUND_REPAIR_2026_11_16.md).

## Ownership and entry points

| Role | Page | Allowed work |
| --- | --- | --- |
| Admin | `/settlements` | Record actual seller payouts after full COD receipt/reconciliation |
| Admin | `/returns` | Approve/reject requests, record refunds after seller receipt, or close a received return without refund with a reason |
| Logistics | `/rider-payments` | Record agreed fees for actual own-company Rider work; record actual Rider payment references |
| Logistics | `/returns` | Assign an operational, affiliated and appropriately covered return Rider |
| Rider | `/rider-payments` | Read only own fees and payment history |
| Rider | `/returns` | Confirm physical collection of an assigned approved return with the original tracking reference |
| Seller | `/settlements` | Read only own store's payment history |
| Seller | `/seller/costs` | Record own costs, void mistakes with retained reasons, view profit and unsettled balance |
| Seller | `/returns` | Confirm physical receipt/condition of a collected return and explicitly choose whether to restock |
| Buyer | `/returns` | Request a whole-parcel return for an owned delivered purchase and follow decisions/refunds |

Admin has no Rider-payments access. Logistics cannot record seller payouts or approve/pay buyer refunds. Riders cannot edit their fees or pay themselves. Seller/Buyer/Logistics/Rider lists stay scoped to their store, company, assignment or purchase. Admin's parcel/COD oversight is separate from managing Rider personnel or wages.

## Seller payout

The seller parcel must be completed and delivered. Its COD record must be reconciled, and both actual collected and actual received amounts must match the agreed parcel total. An open return holds payout. The amount must equal the remaining proceeds for that parcel after recorded seller refund deductions. Prior payments/refunds across the same store also reserve the available balance, preventing a later parcel from bypassing an existing refund debt.

Admin opens the confirmation, confirms the amount actually paid, and provides a unique reference and optional notes. One payout record is permitted per seller parcel. This initial flow records the full remaining parcel settlement; partial/batch bank transfer execution is not implemented. Database uniqueness, transactions, store/parcel locks and retained audit records prevent duplicate effects. An audit failure rolls back the payment record.

## Logistics Rider compensation

Logistics enters the agreed fee, the actual Rider, parcel leg and reason. Pickup/delivery fees require a corresponding recorded parcel event by that Rider. Return fees require that Rider's completed return with confirmed seller receipt. One fee record is permitted per delivery/Rider/leg.

Logistics separately records the actual payment reference. A recorded fee is not yet paid; a recorded payment cannot be repeated. The Rider sees own total fees, recorded payments and unpaid fees. COD liabilities and shipping charges remain separate from wages. No fee is invented from COD, shipping or a default salary formula, and Admin cannot access or mutate this ledger.

## Return and refund journey

1. Buyer requests return of a whole delivered seller parcel and gives a reason. One request per parcel is retained, including rejections; further disputes use support.
2. Admin approves or rejects with a reason. Approval does not itself move inventory or money.
3. The original provider's Logistics assigns an affiliated operational Rider. A stored delivery service area requires current area coverage. The return leg runs from Buyer to Seller; the existing failed-delivery return-to-center process remains separate.
4. The assigned Rider scans/enters the original tracking reference and confirms actual collection.
5. Seller scans the same reference, confirms physical receipt and condition, and explicitly chooses whether to restore the original quantities. Damaged goods cannot be automatically restocked. Receipt cannot be repeated.
6. After full COD reconciliation, Admin records the actual manual refund amount, unique payment reference and reason. It cannot exceed actual collected parcel COD or be repeated. If no refund is due, Admin can close the received return with a reason; this creates no payment, including for zero-COD parcels.

Each action retains actor, time, state/action and notes in the return history. Wrong company/Rider/label, out-of-sequence actions and unauthorized role decisions fail without changing inventory or money. Original completed delivery, order totals and COD collection history remain intact.

### Refund accounting

The actual refund first reverses net product sales (after voucher discounts), capped at that product subtotal. Its commission reversal is proportional to the actual recognized commission, with cent rounding and a cap at the original commission. Seller deduction is the reversed product amount less reversed commission. A refund beyond the net product subtotal is shipping refund, retained separately within the actual total refund; it does not become a Rider-pay deduction.

For example: PHP 200 product sales, PHP 20 commission, PHP 180 seller proceeds and PHP 50 shipping. A PHP 100 product refund records PHP 10 commission reversal and PHP 90 seller deduction. A full PHP 250 refund records PHP 20 commission reversal, PHP 180 seller deduction and PHP 50 shipping refund. Original sales remain visible with separate adjustment figures.

A refund after an earlier seller payout creates an unsettled seller debt. The historical payment is not deleted or relabelled. Further payouts are held when the store's recorded balance cannot cover them. Collection of that debt is an operational matter; the system does not debit a bank account automatically.

## Stock and seller costs

Known option quantities restore to the original option, including retired options. If an older base purchase is cancelled/restocked after size/color options were introduced, its stock is restored into an inactive **unallocated original stock** bucket instead of inventing a size/color. Seller inspects the goods, decreases that held count and allocates the same quantities to correct options. The held bucket cannot be published. Product totals include held stock; shoppers see only active option stock. Up to 50 normal options plus the system's held-stock bucket can be managed.

Seller records goods, packaging, operations or other costs with date, description and amount. Dates follow the Philippines calendar. Incorrect entries are voided with a reason, not deleted. All-time figures are:

- Recorded-cost profit = completed seller proceeds − seller refund deductions − valid recorded costs.
- Unsettled seller balance = completed seller proceeds − seller refund deductions − actual recorded payouts.
- Negative unsettled balance = amount owed back after adjustments.

Profit depends on complete cost entries. It is not a bank balance, automatic payout or a complete audited tax/inventory-cost accounting system. Admin and Seller sales reports also show separate refund, commission-reversal and payout adjustments. Seller CSV exports at `/seller/reports/export` preserve date filters and cannot expose another store; the original Admin export endpoint stays Admin-only.

## Verification and local setup

`tests/Feature/SettlementAndReturnsTest.php` covers payout roles and amounts, full cash reconciliation, cross-store balances, payment replay, cost isolation/voiding, Logistics-only Rider pay, foreign-company refusals, completed-work proof, return roles/states/labels, stock-once behavior, proportional refunds, seller debt, refund privacy, audit rollback, historical stock allocation, zero-COD closure and return service-area eligibility.

Latest full-suite run: **1,057 passed, 3 skipped, 2 failed (8,122 assertions)**. The remaining failures are the pre-existing Logistics tests that expect direct changes through the intentionally blocked legacy `/settings/profile` route. Current company re-verification is separately covered through `/api/account/reverification`. Subsequent focused ledger/return run: **17 passed, 313 assertions**, including the additional service-area case.

The disposable SQLite browser harness completes the actual forms across all five roles: Admin seller payout, Logistics fee/payment, Buyer return request, Admin approval, Logistics assignment, Rider collection, Seller receipt/cost, Admin refund, and Seller debt display. It also retains the previous seller/buyer/variant/voucher/review/moderation scenarios. Artifacts: `storage/app/seller-workspace-ui-check/`.

Migration `2026_10_25_153653_create_settlement_rider_payment_and_return_ledgers.php` was applied to local XAMPP MySQL after a newly verified private backup under `storage/app/private/backups/`. Read-only checks passed for the new pages across all five roles, with foreign keys enabled; no sample monetary transactions were created in the configured database. The migration adds the finance/return tables and the inactive historical-stock flag. A populated ledger/held-stock rollback is deliberately refused; use a reviewed forward migration.

No deployment, commit or push is included. Live payment-provider/mail acceptance, physical return handovers and printer/scanner checks, concurrent MySQL load, full screen-reader/contrast and actual 200%/400% zoom verification remain separate acceptance work. See the [complete feature checklist](../../testing/SYSTEM_FEATURE_CHECKLIST.md).
