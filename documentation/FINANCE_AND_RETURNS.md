# Seller settlement, Logistics Rider payments, returns and profit

Implemented locally on 2026-10-25/26 (Asia/Manila), following the owner's role decisions. These workflows record manual transactions; no bank transfer or online payment provider is installed.

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

No deployment, commit or push is included. Live payment-provider/mail acceptance, physical return handovers and printer/scanner checks, concurrent MySQL load, full screen-reader/contrast and actual 200%/400% zoom verification remain separate acceptance work. See the [complete feature checklist](SYSTEM_FEATURE_CHECKLIST.md).
