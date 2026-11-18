> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Return/refund repair — November 16, 2026

## Result and causes

Admin approval now records the decision, spendable Lubos Coins, refund liability, adjustments, audit history, notification and any required return task in one transaction. The existing conversion remains **1 coin = PHP 1.00**, with centavo precision. Approval does not fabricate cash funding or a bank transfer.

The traced implementation had these problems:

- `approve` changed a return status only. Wallet posting happened in the later `refund` action, which required seller receipt, responsibility review, COD reconciliation and sufficient reserve funding. A successful physical-return approval therefore did not give the buyer coins.
- Separate offer, responsibility and refund forms, plus inconsistent buyer-consent copy, obscured the action that actually issued credit. The inspected refund action already bypassed buyer acceptance; acceptance was not the sole cause of missing credits.
- The original single-case parcel constraint and whole-parcel request form could not track repeated partial item requests, eligible quantities or remaining per-item paid value.
- Return collection and seller dispatch had no return proof records. Seller receipt was allowed while the rider was only in transit to the seller. The backend required seller tracking input even where the current UI prefilled it.
- New multipart forms exposed a concrete submission failure during browser testing: an empty optional `proof` value failed image validation on assignment/receipt. The rule now accepts empty optional proof, while collection and seller delivery still require a valid image. Regression coverage submits the empty multipart value.
- Old manual-refund tests conflicted with the inspected controller's forced coin method. The baseline settlement/returns suite had 44 passes and 9 failures. Tests now cover the current coin contract and separately retain historical cash-refund accounting coverage.

Existing wallet operation-key uniqueness, store balance recovery, payment snapshots, private storage and notification infrastructure were retained and extended.

## Behavior and safeguards

- Requests select original order items, quantities and requested merchandise/shipping amounts. Existing whole-parcel clients may omit the item selection; the server derives remaining eligible items. Pending cases reserve quantities. Rejection releases them; partial approval consumes only approved quantities and preserves the original request.
- Net merchandise is allocated from historical prices and parcel discounts with integer largest-remainder arithmetic. Unit, original shipping, total-paid, coin-restoration and commission limits are enforced across cases under store/parcel locks. Paid voucher value is never recreated as money.
- The combined approval interface requires refund responsibility, separate return-shipping responsibility, physical-return decision and reviewed reason. New approval requires dispute and finance permissions. Claims do not automatically establish fault.
- Wallet `operation_key` and reference uniqueness remain database enforced. The approval service checks its saved fingerprint, locks the case and buyer wallet, and records one canonical liability per case. Retries cannot create another credit or another task. Conflicting decisions require review.
- Seller deductions adjust pending proceeds. Already recorded seller payouts stay unchanged and produce recoverable balances where applicable. Logistics liability is assigned to the company, never to a rider merely because of assignment. Buyer-responsibility refunds retain the supported platform-expense treatment, without an automatic buyer debit.
- Physical returns create one `return_tasks` row, uniquely linked to the case. Original tracking is preserved; return references are generated. No-return approvals create no task. An inactive/missing original provider prevents creation of an orphan task and produces a clear decision error.
- A dual-capability rider covering both addresses stays selected through actual facility receipt. Otherwise Logistics assigns an eligible seller-delivery rider after the facility handoff. No scan, proof or custody event is manufactured.
- Collection and seller delivery use the existing camera component, private photo storage and upload progress. Seller **Confirm Received** follows recorded seller delivery, records actor/time, and restores only approved intact quantities once. Seller discrepancy evidence is private to the owning seller and dispute reviewers. Neither action changes the wallet.
- Missing seller return addresses can be corrected in the seller's saved account addresses and picked up on assignment retry. Existing task address snapshots are preserved.
- Logistics can record an actual completed return-work fee from the task without retyping refund information. Existing rider-payment records gain a return-task reference and unique operation key. The refund ledger records transport cost responsibility separately; the fee obligation is not a cash payment. Actual rider payment still requires the existing external payment reference.
- Finance aggregates all returns before joining parcel sales, preventing multiple cases from duplicating sales, payouts or COD totals. Exceptional wallet corrections distinguish new liability-based credits from historical reserve-funded credits.

## Migration and reconciliation

New forward migration:

`database/migrations/2026_11_16_120000_separate_refund_credit_and_return_tasks.php`

It adds independent refund state, item allocations, unique return tasks, private task proofs, discrepancy evidence, shipping-ledger metadata and task-specific rider-fee keys. It removes the single-return parcel constraint. Historical wallet/payment/custody values are preserved; known receipt actors are copied only from existing receipt events. Unknown proof/custody is not reconstructed. Existing historical cash refunds are not converted to coins.

Readiness follow-up: the local application database has now been backed up and migrated, preserving 69 original non-transient tables. All pending production migrations also passed against an isolated Azure database copy, preserving 57 original non-transient tables. Live production has not been migrated or deployed, and no historical reconciliation credits were applied. See the [release readiness record](../deployment/REFUND_RELEASE_READINESS_2026_11_16.md) for candidate, backup and cutover evidence. Review pending migrations and back up/verify the intended target before applying:

```powershell
php artisan migrate --pretend
php artisan migrate
php artisan returns:reconcile-refund-credits
php artisan returns:reconcile-refund-credits --apply --actor=<authorized-admin-id>
```

Optional `--return=<case-id>` can be repeated to limit reconciliation. Default mode is read-only. Apply is atomic per case, uses the same approval service and posts only missing canonical wallet components. Repeat runs do not re-credit completed cases. Incomplete amounts, inconsistent item allocations, external cash refunds, conflicting wallet/liability entries, corrections or missing shipping decisions require review. Complete those cases through **Complete approval and credit**; do not infer an amount from a requested whole parcel. A nonzero exit indicates cases requiring review or a failure.

Do not use `migrate:fresh`, reset application data, perform a destructive rollback, or automatically convert historical cash refunds. This financial migration is forward-only.

The first concurrency attempt against the shared local MariaDB instance disconnected and could not clean up its generated schema, `lubosmart_refund_test_14d6ee949365`. Its existence/cleanup remains to be checked when that server is available. Subsequent concurrency checks used a separate temporary MariaDB data directory and port 33317; their generated schemas were removed. No recovery/reset of the shared server was attempted.

## Verification and demonstration

Automated checks and final counts are recorded in the [UI/verification audit](../ui-audits/RETURN_REFUND_WORKFLOW_UI_AUDIT_2026_11_16.md). The reproducible acceptance entrypoints are:

```powershell
php artisan test --compact
php artisan test --compact tests/Feature/RefundApprovalWorkflowTest.php tests/Feature/RefundWorkflowUpgradeTest.php
# Requires an available disposable loopback MySQL/MariaDB server:
$env:REFUND_MYSQL_PORT = '33317'
php tests/Fixtures/refund-concurrency.php
node tests/Frontend/refund-browser-check.cjs
```

`REFUND_MYSQL_PORT` must identify your available disposable server; the task's temporary server on 33317 has been shut down. The override uses the disposable root/empty-password configuration. The race harness validates a generated test schema name and never migrates the configured application schema. The browser harness creates temporary SQLite data and synthetic accounts, serves a production-build snapshot, uses a simulated camera and sends no real notifications.

After applying the migration to the intended environment:

1. Buyer opens **Returns & refunds** for a delivered eligible parcel, chooses an item/quantity, enters the issue and required evidence, then submits.
2. Admin opens **Review and approve refund**, reviews original tracking/payment, quantities, reason/evidence and seller settlement; chooses both responsibilities and whether a physical return is required; then selects **Approve and credit Lubos Coins**.
3. Buyer opens **Lubos Coins wallet**. Verify the new history/reference and available balance immediately, before collection. Redeem coins against merchandise at normal checkout; shipping remains payable through the existing cash workflow.
4. For a physical return, Logistics opens **Return assignments**, selects **Assign collection rider**, and chooses an approved rider covering the buyer. A no-return refund has no pickup task.
5. Assigned rider opens **Assigned returns**, records actual collection using **Open camera / Capture photo**, recipient and notes.
6. Logistics records **Confirm facility receipt** only when physically received. The same eligible rider is retained; otherwise assign the seller-delivery rider.
7. Rider accepts actual seller dispatch and records seller delivery with camera proof and recipient.
8. Seller opens the linked case and selects **Confirm Received**, records condition/restock decision and notes. No tracking/scanner input is required. A discrepancy can be reported separately. Recheck the buyer wallet: no additional credit/debit occurred.

## Task file inventory

Existing unrelated working-tree changes were retained. No branch change, commit, push, merge or deployment was performed. Task changes are in:

- Approval/eligibility/transport: `app/Services/{ApproveRefund,ReturnEligibility,ReturnTransport,LubosCoins}.php`.
- Controllers: `app/Http/Controllers/{ParcelReturnController,ReturnWorkflowController,RefundOfferController,FinanceController,SellerSettlementController,RiderPaymentController,RefundFundingController}.php` and `app/Http/Controllers/Api/V1/RoleDataController.php`.
- Models: `app/Models/{ParcelReturn,ReturnItem,ReturnTask,ReturnEvent,SellerOrder,RiderPayment}.php`; notification targets in `app/Services/Notifications/NotificationInbox.php`.
- CLI/schema: `app/Console/Commands/ReconcileRefundCredits.php`, the new migration above, and `routes/{web,api,mobile}.php`.
- UI: `resources/views/components/marketplace/refund-workflow.tsx`, `resources/views/components/logistics/delivery-proof-camera.tsx`, `resources/views/pages/finance/{returns,refund-funding}.tsx`.
- Tests: `tests/Feature/{RefundApprovalWorkflowTest,RefundWorkflowUpgradeTest,SettlementAndReturnsTest,FinalizationUpgradeTest}.php`, `tests/Feature/Api/MobileRoleParityTest.php`, `tests/Support/RefundScenario.php`, `tests/Fixtures/{refund-concurrency,refund-browser-seed}.php`, `tests/Frontend/refund-browser-check.cjs`.
- Documentation: this report, the new verification audit, `documentation/workflows/FINANCE_AND_RETURNS.md`, and `documentation/api/FINANCE_2026_11_11.md`.
