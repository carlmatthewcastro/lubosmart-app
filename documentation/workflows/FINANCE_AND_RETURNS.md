# Seller settlement, Logistics Rider payments, returns and profit

## Current source contract — November 16, 2026

This is the current consolidated workflow guide; earlier release details are archived. Implementation is local source work, not a deployment or a certification of production acceptance. See the [audit](../archive/reports/FINANCIAL_FULFILLMENT_AUDIT_2026_11_11.md), [parcel checkpoints](PARCEL_SCANNING.md), [API compatibility](../api/FINANCE_2026_11_11.md), and [handoff](../archive/reports/GITHUB_HANDOFF_2026_11_15.md).

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

The [November 16 return/refund repair](../archive/reports/RETURN_REFUND_REPAIR_2026_11_16.md) supersedes earlier return, consent and reserve-gating descriptions. New requests use workflow version 3 and can select original items/quantities and repeat requests against remaining eligibility. Pending requests reserve quantities; rejection releases them. Net paid prices, discounts, original coin allocations, original shipping and prior refunds cap every approval.

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

## Release and verification history

See the [historical composite](../archive/reports/FINANCE_AND_RETURNS_HISTORY.md) for local migration details, original stock/cost rules and dated results, and the [November 16 repair report](../archive/reports/RETURN_REFUND_REPAIR_2026_11_16.md) for version-3 changes. These are recorded prior runs, not fresh acceptance. [Deployment and backup instructions](../deployment/README.md) require separate release authorization.

Automatic bank transfers, top-ups and withdrawals are not implemented in the described contract. Full physical return/cash handovers, accessibility and live-service acceptance remain unverified by this documentation cleanup.

[Workflow index](README.md)
