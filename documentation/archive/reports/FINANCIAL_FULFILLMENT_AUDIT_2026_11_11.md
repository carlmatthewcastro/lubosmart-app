> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Financial and fulfillment audit — 2026-11-11

## Final web refinement audit — November 16, 2026

The original audit below is historical. The current contract is in [Finance and Returns](../../workflows/FINANCE_AND_RETURNS.md#current-source-contract--november-16-2026).

Initial inspection used feature HEAD `20a30ad`. GitHub confirmed main `dece73e4d9d8eb368aabe0c62238e12cbf68e857`; its application code matched local HEAD and its file difference was README-only. The working tree already contained substantial buyer/order/return/support/sidebar UI work and tests. Those changes were preserved, without stashing, branch changes, commits, pushes, or deployment. Additional concurrent UI changes were left intact.

| Phase | Initial gap | Implemented extension |
| --- | --- | --- |
| Rider specialization | One overwritten rider field; no capability boundary | Separate leg identities/history, Logistics-only capabilities, authoritative actions, protected custody, reasoned facility replacement |
| Finance | Receipt corrections overwrote the current observation; parcel-only compensation | Append-only receipt observations, exact cash-due calculations, weekly agreements/payments, debt recovery, transaction filters/breakdowns |
| Returns | Direct buyer-to-seller return; no configured window/evidence workflow | Versioned facility journey, private evidence, configurable window/exceptions, reviewed party liability and funded refunds |
| Coins | No wallet/backing/allocation | Signed wallet ledger, backing reserve, exact consent, deterministic parcel allocations, cancellation/return restoration and corrections |
| Vouchers | Manual codes; no public discovery/presets | Confirmed editable templates, generated codes, public shop/product/cart discovery, direct selection, scoped budget/usage/history |
| Role integration | New states needed integration with existing UI/notifications/API | Shared components, capability-aware navigation, protected notification targets, current COD and reverse-leg API actions |
| Acceptance | Existing regressions did not exercise new paths | End-to-end mixed/full-coin fulfillment, returns/backing/consent, repayment/correction, populated upgrade and real MySQL races |

Verified foundations were preserved: three unique forward checkpoints, POD instead of a fourth scan, private proof, DeliveryNotes, shipping retention, platform receipts before seller payout, return responsibility review, voucher snapshots/history, and seller–buyer privacy. Changes extend the existing services/controllers rather than introducing competing checkout or commission logic.

The initial focused baseline was 83 passing PHP tests / 1,117 assertions plus TypeScript. Current executed results, modified files, migration notes, and remaining external acceptance work are recorded in the [handoff](GITHUB_HANDOFF_2026_11_15.md).

Scope: current local source, including pre-existing uncommitted notification/UI work. No configured database writes, migration application, branch changes, commits, pushes or deployments are authorized by this report. Historical verification in older guides is not a fresh test result.

## Audit matrix

| Feature | Existing implementation / files | Initial status | Identified issue | Smallest recommended change | Risk |
| --- | --- | --- | --- | --- | --- |
| Checkout / financial snapshots | `app/Actions/Checkout/CreateOrderFromCart.php`, `ShippingQuotes`, commerce migrations | Implemented | Decimal snapshots are converted independently in several controllers | Share centavo calculations without rewriting historical decimal columns | High |
| Seller vouchers | `StoreDiscount`, `StoreVoucherController`, `MarketplaceExtensionsTest` | Implemented | Usage is derived from non-cancelled parcels; no dedicated seller usage history | Preserve locked voucher checkout and cancellation release; expose scoped history | Medium |
| Seller preparation | `OrderController::prepare` | Implemented | Needs regression verification against direct delivery attempts | Preserve pending → processing → shipped only | High |
| Pickup authorization / assignment | `DeliveryController`, `AssignParcelRider` | Implemented | No new module needed | Verify affiliated operational Rider, area and state guards | High |
| Pickup / sorting / dispatch custody | `DeliveryController`, `parcel_events` | Implemented | Separate from cash; no offline custody confirmation | Preserve scanned reference, event evidence and dispatch acceptance | High |
| Delivery / COD collection | `DeliveryController::update` | Implemented | Commission fallback for historical missing rate uses current settings | Do not rewrite legacy records; identify legacy-policy limitation | High |
| Cash receipt / discrepancy | `cod_collections`, `parcel_events`, Logistics cash queue | Implemented | Cumulative receipt corrections are events; this is not platform cash receipt | Preserve existing cumulative model; strengthen reconciliation against parcel snapshot and unresolved discrepancy | High |
| Admin reconciliation | `DeliveryController`, mobile events endpoint | Implemented | Admin role guard does not itself express finance permission; comparison only checks collection vs receipt | Require finance permission and match original parcel COD, delivered state and discrepancy resolution | High |
| Commission recognition | Delivery completion and `ReportController` | Implemented | Recognized on delivery; cannot be described as platform cash realized | Add distinct expected/recognized/reconciled allocation figures; platform cash realization remains unproven | High |
| Seller settlement / refund debt | `SellerSettlementController`, `seller_payouts`, `SettlementAndReturnsTest` | Implemented | Store balance includes unreconciled completed parcels, allowing them to mask earlier refund debt | Reserve debt against reconciled eligible proceeds; preserve full remaining parcel payout and original records | Critical |
| Logistics shipping entitlement | Parcel `shipping_fee`, provider on `deliveries` | Missing dedicated ledger | No Logistics-to-platform remittance evidence or approved retention model | Read-only provider-scoped ledger allocating 100% shipping; hold cash movement implementation for policy | Critical |
| Rider fees / manual payment | `RiderPaymentController`, `rider_payments` | Implemented | Fee and payment evidence distinct; no automatic shipping-to-wage mapping | Preserve company-only management and Admin exclusion | High |
| Returns / receipt / stock | `ParcelReturnController`, `RestorePurchasedStock`, `parcel_returns` | Implemented | Whole parcel, one retained journey; damaged stock not auto-restocked | Preserve lifecycle and original COD history | High |
| Refund adjustments | `ParcelReturnController` | Implemented | Shipping refund implicit remainder; all product liability defaults to Seller regardless of cause | Store explicit refund split for new refunds; require reviewed responsibility before a new deduction; keep historical records intact | Critical |
| Return responsibility / transport | No existing liability classification or transport ledger | Missing | No approved change-of-mind/transport cost policy | Record reviewed Seller/Logistics responsibility with reason; leave transport charges and undetermined liability pending | High |
| Seller bypass / buyer privacy | Preparation endpoints, private proof routes, scoped waybills, API resources | Partially implemented | Seller ordinary lists serialize buyer contact/address; waybills legitimately need address | Remove contact/address from ordinary seller responses, retain authorized waybill printing | High |
| Off-platform incident reports | `SupportCaseController`, support participants/messages, audit logs | General support exists | No approved penalty or receivable policy | Use support evidence and human review; no automatic suspension/penalty/revenue | Medium |
| Web/mobile parity | `routes/api.php`, `routes/mobile.php`, `apps/mobile/lib`, API resources | Shared backend exists | New finance visibility needs common backend endpoints; physical-device acceptance outstanding | Expose the same read-only ledger to authorized tokens; do not calculate money in Flutter | High |

## Documentation discrepancies and decisions

`standards/LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md` leaves shipping ownership unresolved, whereas this request now explicitly allocates 100% to Logistics. The existing full Rider-to-Logistics receipt is compatible with either onward retention or full remittance. **It does not establish which onward cash model is authorized.** Proposed interim behavior is allocation visibility only; no outgoing/incoming platform transfer or shipping payout is invented. Approval of a cash model and evidence requirements must precede its settlement mutation endpoints.

`FINANCE_AND_RETURNS.md` describes Seller deductions for all product refunds. This request additionally prohibits charging a Seller for established Logistics fault. New refunds therefore need a reviewed responsibility decision; old refunds remain historical records and must not be reclassified automatically. Buyer change-of-mind liability and return transport costs require an approved policy; selecting a reason is insufficient evidence.

Historical commission snapshots that are null need an explicit legacy-rate remediation policy. New checkout already snapshots the rate. No migration may infer historical cash movements or rewrite legitimate historical refunds/payouts.

Current branch `feat/platform-release-ui-onboarding` contains substantial pending work beyond finance. A future finance PR should use `feat/cod-finance-integrity` from an agreed reviewed base, with dependencies on existing work identified. This task leaves the branch and pending work in place. Suggested review groups: calculations and settlement integrity; shipping allocation visibility; return responsibility and privacy; tests/documentation. No staging or commit is included.

Fresh validation and final implementation notes are recorded in the companion implementation report: the final isolated full suite passed **1,196 tests with 3 explicit skips and zero failures (9,718 assertions)**. Finance browser checks and static/build checks also passed; physical and policy-dependent acceptance remains outstanding as listed there.

Audit follow-up: the owner subsequently approved **Logistics retains shipping and remits product proceeds plus commission**. The allocation-only interim proposal above was superseded by the evidence-based product-remittance implementation described in [the implementation report](FINANCIAL_FULFILLMENT_IMPLEMENTATION_2026_11_11.md). No separate shipping payout or inferred historical transfer was added.
