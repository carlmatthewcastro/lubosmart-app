> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Workflow progress and motion

## Proposed authoritative mappings

No database, authorization, mutation, scan, custody or financial rules change.

| Surface | Evidence and visual stages |
| --- | --- |
| Buyer / Seller orders | `pending`, `processing`, `shipped` describe preparation; delivery status and recorded handovers describe transport. Only `delivery.status=delivered` completes delivery. `completed` alone never proves delivery or payment. |
| Pickup / Logistics / Delivery / scan | Shared Parcel view: pickup, receipt, sorting, dispatch acceptance, delivery. Timestamp proves a recorded milestone; missing timestamps are never fabricated. Exceptions interrupt the next unrecorded milestone, preserving prior handovers. |
| Returns, all roles | requested → approved/assigned → collected → received → refunded. Closed is an alternate terminal outcome without refund; rejected stops review. Event actions requested/approve/assign/collect/receive/refund/close/reject supply actual dates. |
| Seller settlements | Server `can_pay` and `hold_reason` describe eligibility; only `payout` confirms payment. Delivery is separate. |
| Rider payments | Existing fee record → actual `paid_at`; no inference from COD or delivery. |
| COD | collected → handed_over → reconciled; discrepancy interrupts reconciliation. Existing collected_at/handed_over_at/reconciled_at supply dates. Legacy handovers without received_amount do not complete receipt or reconciliation. |
| Logistics product remittance | `cod_reconciled` → actual remittance receipt. Shipping retention is separate from platform receipt. |
| Registration | Existing form navigation remains local navigation, never account approval. Shared onboarding stages retain caller-provided verified position; application submission/review use authoritative status and timestamps. |

## Existing components and tokens

Reuse Poppins, semantic theme colors, Lucide, Radix tooltips, shared dialogs and buttons. Replace duplicate order/return/form progress markup. Preserve detailed audit event lists and all operational actions. Shared motion tokens use short feedback, stage transitions, and slower connector transitions; reduced motion disables animation. No artificial progress timers.

## Verification

Implementation and validation results are recorded below after checks. Browser, assistive technology, contrast, zoom and device checks are required before claiming visual or WCAG conformance. Reference images were not available in the conversation.

## Implemented files and integrations

- `resources/views/components/shared/progress-stepper.tsx`: dynamic icons, descriptions, dates, five explicit states, compact/detailed and horizontal/vertical/responsive modes, Radix focus/hover tooltips, optional form navigation. Stable stage IDs preserve transitions.
- `resources/views/components/shared/workflow-stages.ts`: shared parcel, return and COD mappings, plus onboarding icons. Missing dates remain absent. Unknown return states stay pending. COD discrepancy and legacy receipt cases retain their distinct meaning.
- `resources/css/workflow-motion.css`, imported by `resources/css/app.css`: 180ms feedback, 250ms stage, 500ms connector tokens; active rings and contextual transforms; reduced-motion support; flat shared buttons; shared modal/menu/tooltip/tab timing and sidebar easing; toast, disclosure and validation feedback. Completed icons retain white against a darker purple surface in dark mode.
- `components/marketplace/buyer-order-dialog.tsx` and `pages/marketplace/orders.tsx`: centralized compact buyer/seller tracking and detailed handover timeline; removed duplicate stepper markup.
- `pages/marketplace/deliveries.tsx`: shared Parcel integration covers rider pickup/delivery, Logistics parcel dialogs and scanner operations, plus separate COD cash custody. Existing QR, proof, custody and cash actions remain intact.
- `components/marketplace/buyer-return-card.tsx` and `pages/finance/returns.tsx`: shared return mapping for buyer and operational roles, with rejection and closure without refund.
- `pages/finance/settlements.tsx`, `rider-payments.tsx`, `logistics-settlements.tsx`: server-derived eligibility/payment/receipt progress. Financial confirmations remain separate from parcel delivery.
- `components/auth/registration-progress.tsx`, `components/onboarding/onboarding-steps.tsx`, `pages/onboarding/application.tsx`: existing form navigation, account setup stages, and actual submission/admin-review status. Form completion never establishes verification or approval.
- `components/shared/action-feedback.tsx`: shared toast entry class; notification timing and dismissal logic unchanged.
- `tests/Frontend/workflow-stages.test.cjs`, `workflow-browser-check.cjs`, `registration-form.test.cjs`: mapping regression checks, isolated Chrome matrix, and updated registration test component loader.

Paths above are relative to `resources/views/` where abbreviated with `components/` or `pages/`.

## Validation results and limits

- Targeted ESLint and TypeScript passed. Formatting checked on changed component/page/test files. Git whitespace check passed.
- 49 frontend tests passed: registration plus parcel/return/COD mapping regressions. These include missing handovers, cancellation, delivery exceptions, rejected returns, closure without refund and legacy COD receipt.
- 105 Laravel tests passed (1783 assertions): SettlementAndReturns, RiderWorkspace, LogisticsWorkspace and BuyerOnboarding. No backend file was changed by this task.
- Isolated Vite production bundle passed. Chrome checked 320/768/1440px in light/dark and normal/reduced motion: no document overflow, focusable stage controls, focus-triggered Radix tooltips, all five states, and disabled active-ring animation under reduced motion. Artifacts are in `storage/app/workflow-ui-check/` (test fixtures only, no application data).
- Full `npm run build` is blocked by a pre-existing support-page import of missing `resources/css/support-inbox.css`. It also reports unresolved catalog banner/category image references. Unrelated support work was preserved.
- The isolated matrix does not establish integrated role-page appearance with expanded/collapsed sidebars, actual devices, screen readers, 200%/400% zoom, exhaustive contrast or WCAG conformance. Those remain review requirements. No deployment, branch change, commit or push was performed.
