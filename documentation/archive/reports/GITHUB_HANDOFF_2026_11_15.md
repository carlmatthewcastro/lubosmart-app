> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# GitHub handoff — November 15, 2026

## Web finalization handoff — November 16, 2026

The seven-phase source implementation remains on `feat/platform-release-ui-onboarding`. No branch changes, commits, pushes, merges, or deployment were performed. In the migration follow-up, all seven pending migrations were applied to local `ecommerce_db` as batch 24 after a verified private SQL backup. The pre-existing and concurrently edited UI/support/onboarding work remains in the tree.

Read [the current financial contract](../../workflows/FINANCE_AND_RETURNS.md#current-source-contract--november-16-2026) for role responsibilities, cash custody, refund backing, centavo examples, six migrations, and safe local/deployment instructions. The [updated audit](FINANCIAL_FULFILLMENT_AUDIT_2026_11_11.md), [scanning guide](../../workflows/PARCEL_SCANNING.md), [API notes](../../api/FINANCE_2026_11_11.md), and [finance UI audit](../ui-audits/FINANCE_UI_AUDIT_2026_11_11.md) distinguish current behavior from historical records.

### Phase results

| Phase | Source behavior |
| --- | --- |
| 1 | Logistics-owned rider capabilities; distinct pickup/delivery identities; retained assignment/custody history; exceptional facility replacement; private POD with recipient/note validation; capability-aware workspaces |
| 2 | Exact expected COD and actual collector; immutable cash receipt observations; shipping retention; independently verified platform receipts; seller eligibility/debt recovery; fixed seven-day compensation without parcel-fee overlap |
| 3 | Configurable seven-day standard window and Admin exception; private evidence; two reverse legs through the facility; inspected stock-once restoration; reviewed responsibility and actual refund backing |
| 4 | Backed buyer wallet/ledger; exact offer acceptance; merchandise-only redemption; deterministic multi-seller allocations; cash/coin cancellation/return restoration; audited corrective entries |
| 5 | Editable, seller-confirmed voucher presets and generated codes; public shop/product/cart discovery; direct eligible selection/removal; preserved one-voucher limits, locked usage, snapshots and history |
| 6 | Existing shared UI/notifications/privacy integrated with new actions and financial breakdowns; additive API contracts; no Flutter redesign |
| 7 | Full PHP regression, populated upgrade, genuine MySQL races, real browser financial forms/wallet, bearer HTTP, frontend static checks/build; external acceptance limits recorded below |

### Executed validation and evidence

- Final full Laravel run in `storage/app/finalization-checks/laravel-verified.log`: **1,288 passed, 3 skipped, 11,051 assertions** (172.23 seconds), including the populated upgrade test. No tests failed. The preceding release run is retained separately as `laravel-release.log`.
- Populated upgrade verifies original pickup/delivery actors, zero starting coins, unchanged commission/proceeds, legacy collected returns, existing parcel fees, and no invented weekly payments. Fresh MariaDB migration also passed in the disposable concurrency instance.
- Real simultaneous MySQL wallet overspend and last-voucher redemption tests passed; each allowed one competing operation, preserved the rejected operation's stock/balance, and removed its generated test schema.
- End-to-end four-case purchase/fulfillment coverage passes ordinary COD, voucher COD, mixed voucher/coins, and full merchandise coin payment with cash shipping, including rider collection, both cash stages, and seller payout where applicable.
- Return regressions cover new facility custody, late-request exceptions, private photos, funded non-seller liability, exact voluntary coin consent, partial mixed refunds, post-payout repayment, credit corrections, restock-once, and duplicate prevention.
- Targeted final API/notification/upgrade/voucher run: **128 passed, 968 assertions**. The bearer-HTTP harness passed its 13 public/auth/cart/checkout/cancellation/role/support/profile/logout checks against temporary SQLite.
- Node frontend component/workflow tests: **49 passed**. These mocked component tests emit React stub diagnostics; they are separate from actual browser rendering.
- TypeScript, targeted ESLint, changed-source Prettier, PHP Pint, and production build passed. Vite retains its non-failing runtime public-image reference notices; no unrelated artwork was replaced to suppress those notices.
- Core finance browser acceptance passed all four operational roles at 320/768/1440px and dark mode, actual remittance entry, seller contact minimization and voucher history. The exact coin path passed actual backing entry → buyer consent → Admin issuance → buyer wallet/ledger, with no uncaught browser exceptions. The 320px wallet screenshot was inspected. Artifacts are under `storage/app/finance-ui-check/`.

The expanded browser rerun also passed Admin refund-funding/returns, Logistics rider-payments/rider management, Seller vouchers/settlements, and Rider payments/deliveries at 320/768/1440px, with desktop sidebar collapse/expand checks where present. An earlier expanded attempt hit a CDP timeout; the successful rerun is the final result in `results.json`. No uncaught browser exceptions were recorded.

### Task file inventory

This inventory identifies this task's source paths; it is not permission to stage unrelated changes in the same files. Several UI/test files already contained user work.

- **Checkout/money services:** `app/Actions/Checkout/CreateOrderFromCart.php`; `app/Services/ParcelFinance.php`, `LubosCoins.php`, `RefundFunding.php`, `PublicShopVouchers.php`; `app/Services/Logistics/AssignParcelRider.php`; `app/Services/Rider/RiderWorkspace.php`.
- **Controllers:** `DeliveryController`, `FinanceController`, `LogisticsSettlementController`, `SellerSettlementController`, `RiderPaymentController`, `ParcelReturnController`, `RefundOfferController`, `RefundFundingController`, `WalletController`, `StoreVoucherController`, `MarketplaceController`, `OrderController`, `ProductReviewController`, `ReportController`, `SellerCostController`; Logistics `RiderController`/`ReportController`; API V1 `MarketplaceReadController`/`RoleDataController`, all under `app/Http/Controllers/`.
- **Models:** `Delivery`, `User`, `ParcelReturn`, `SellerOrder`, `StoreVoucher`, `CommerceSetting`, `WeeklyRiderPayment`, `CoinAllocation`, under `app/Models/`.
- **Contracts/notifications:** `app/Http/Middleware/HandleInertiaRequests.php`; API `DeliveryResource`, `ParcelResource`, `UserResource`; `app/Observers/WorkflowNotificationObserver.php`; `app/Services/Notifications/NotificationInbox.php` and `ParcelNotifications.php`; `routes/web.php`, `api.php`, `mobile.php`; `config/shop-vouchers.php`.
- **New UI:** `resources/views/pages/marketplace/wallet.tsx`, `pages/finance/refund-funding.tsx`, `components/marketplace/public-vouchers.tsx`, `components/marketplace/return-request.tsx`.
- **Extended UI:** marketplace cart/catalog/product/orders/deliveries/waybill; finance overview/returns/rider-payments/settlements; Logistics rider index; Rider dashboard; shared sidebar/rider navigation/workflow stages; buyer order dialog/return card; `resources/js/types/index.ts`.
- **Tests:** checkout, marketplace flow/extensions, Logistics workspace, Rider workspace, settlement/returns and mobile parity feature suites; `tests/Feature/FinalizationUpgradeTest.php`; `tests/Unit/MoneyAllocationTest.php`; finance browser fixture/harness; `tests/Fixtures/finalization-concurrency.php`.
- **Migrations:** the six `2026_11_15_*` finalization migrations listed in Finance and Returns.
- **Documentation:** this handoff, Finance and Returns, the financial audit, parcel scanning, API finance notes, and the existing finance UI audit.

### Remaining acceptance and operating limits

Manual cash/backing confirmations require truthful operational evidence; no banking API verifies or executes them. Weekly compensation is recorded per explicit period, without automatic payroll. Voucher expiry is enforced/displayed; no campaign/expiration scheduler was introduced. Whole-parcel returns retain one request record; additional disputes go through support.

Physical scanners/printers/cameras, Android/iOS integration, live mail/networking, full keyboard/screen-reader/contrast/zoom acceptance, production performance, and deployment remain unverified by these local checks. Passing builds/reflow is not a WCAG certification. New native wallet/preset screens are deferred; existing clients default to zero coin redemption and consume authoritative parcel COD/actions.

The normal loopback MySQL server disconnected during the first generated-schema migration attempt. Subsequent MySQL acceptance used a separate temporary data directory/port. The earlier schema name and cleanup limits are documented in Finance and Returns. No repair or reset of the normal server was attempted. Follow-up: the normal local server was available again; all seven pending migrations were applied after backup. Original rows/columns in 14 financial, inventory, and fulfillment tables matched their pre-migration hashes; wallets and weekly payments remained empty, the refund reserve is zero, and existing riders have both capabilities. Backup and verification manifests are under `storage/app/private/backups/`. Production deployment still requires separate explicit authorization.

The earlier sections below describe the previous release checkpoint, not this finalization's test totals.

Release work is grouped on `feat/platform-release-ui-onboarding` for review and next-step planning:

- Backend: finance/remittance safeguards, return responsibility, fulfillment protection, notifications, messaging, catalog filters, shipping availability and private account documents, with migrations and regression coverage.
- Web: storefront/authentication, shared settings and operational UI, delivery camera proof, image assets and browser checks.
- Mobile: finance, fulfillment concerns, Logistics workspace and delivery proof/notes.
- Documentation: implementation reports, UI audits and acceptance limits.

## Checks run for this handoff

- ESLint across `resources` and `tests/Frontend`: passed after removing two unused browser-harness helpers.
- TypeScript: passed.
- Prettier on changed TypeScript/TSX/CSS files: passed after formatting seven files. Blade is excluded because the installed formatter has no Blade parser.
- PHP Pint dirty-file check identified two test/fixture files; both were formatted and their targeted check passed. All other files in that check passed.
- Production Vite build: passed after formatting. Existing public image references for the catalog banner and category atlas remain build-time warnings; both assets are included in this branch.
- Registration frontend tests: 37 passed. The mock harness emits React component-type warnings; these are not a verified production runtime failure.
- Flutter analysis: no issues. Flutter tests: 14 passed. Analytics were suppressed to avoid an inaccessible user-profile telemetry file.
- QR/POD browser check: all four checks passed (explicit outcome/no fourth scan, camera denial, capture/retake/gating and completed delivery). This uses an isolated SQLite database and a simulated camera stream.
- Full Laravel suite: **1,262 passed, 3 skipped, 5 failed; 10,545 assertions**. These match the failures previously recorded in the [QR/POD report](QR_POD_WORKFLOW_2026_11_14.md):
  - Three `BuyerOnboardingTest` dataset cases expect a verification redirect from `/shop`, which returns HTTP 200.
  - `SettlementAndReturnsTest`: foreign Logistics/Rider access and unreconciled COD/non-finance access checks fail with “Not a valid Inertia response.”
- Whitespace and documentation local-link checks passed. A local scan of candidate files found no matches for common private-key, GitHub-token, AWS-key or live Stripe-key patterns; this is not a comprehensive security audit.

## Next steps

1. Investigate the five Laravel failures and verify the intended browsing and access behavior before changing tests or authorization.
2. Review finance funding/offset policy and historical cash/commission evidence. See the [resumed-work report](RESUMED_WORK_2026_11_11.md).
3. Review and apply pending additive migrations only to the intended database with separate release approval.
4. Complete real-device camera/QR, email, printing, cash handover and MySQL concurrency acceptance. Manual keyboard/screen-reader, measured contrast and actual 200%/400% zoom checks remain open in the UI audits.

The current handoff does not establish passing GitHub CI or release readiness. No production migration, merge or deployment was performed.

## CI failure follow-up

The initial five failures had two causes:

- The buyer test expected `/shop` to redirect, although the onboarding middleware deliberately permits public browsing before verification. The test now checks the catalog response while retaining cart/checkout verification and approval restrictions, unchanged stock and no created orders.
- `/rider-payments` and `/returns` returned HTTP 500 while serializing tracking-only Delivery projections. The globally appended `fulfillment_status` accessor tried to return a missing `status` value as a string. These limited projections now omit computed appends; full delivery workflow responses retain their existing status calculation. Regression checks cover populated work/return responses, tracking references, foreign-company isolation and private financial fields.

The two affected test files pass: 37 tests, 686 assertions. The final full Laravel suite passes: **1,267 passed, 3 skipped, zero failures; 10,648 assertions**. PHP Pint and Git whitespace checks passed. The initial failing run above remains historical evidence; its five failures are resolved locally. GitHub CI must still rerun to verify the remote environment.
