# LubosMart black-box testing guide

Prepared: November 5, 2026 (Asia/Manila).

This is a manual acceptance plan for the existing COD marketplace. It does not report newly executed tests or guarantee correctness. All supplied result rows start **Not Run**. Use this with [the Excel-compatible results sheet](BLACK_BOX_TEST_RESULTS.csv). Open the CSV in Excel and save a working copy as `.xlsx` to retain formatting and additional sheets.

## 1. What you are testing

Black-box testing means using the system as a user would, giving inputs and checking outputs without depending on how its code is written. Test a successful action, invalid input, the wrong user, an action at the wrong stage, and a repeated action. A successful click alone is insufficient: reload, sign in again when appropriate, and check the connected role's records.

Manual black-box tests can expose backend defects through observable stock, access, status and financial results. They cannot prove database locking, rollback and every race condition. Supplement them with isolated backend feature tests and controlled MySQL concurrency tests. Inspecting source or database tables is a separate diagnostic activity, not the manual black-box verdict.

Current scope: five roles; COD collection; manually recorded payouts, Rider payments and refunds. A recorded payment does not execute a bank transfer. Online payments and GPS routing are not acceptance requirements here.

## 2. Prepare a safe, repeatable run

1. Use a dedicated test installation and database containing synthetic records. Identify the URL, application revision/build, database engine, device/browser, tester and date in your run record. Do not use real customer orders or documents. Do not reset the configured application database or run destructive seed/reset commands.
2. Have the developer prepare the test installation, storage, mail and any required migrations. Confirm a recoverable backup before changing a populated test database. Test live integrations in a suitable sandbox; fake mail cannot prove email delivery.
3. For a local installation, start XAMPP MySQL. From the repository, use `php artisan serve --host=127.0.0.1 --port=8000` and open the displayed address. Have built frontend assets available, or run the configured development server. Do not mix asset rebuilding with a recorded browser run.
4. Use separate browser profiles for Admin, Buyer, Seller, Logistics and Rider. Ordinary tabs in the same profile share login cookies; they do not provide independent role sessions.
5. Create accounts through real registration and approval forms: Admin; Buyers A/B; Sellers A/B in valid departments; Logistics A/B; Riders A1/A2 affiliated with A and B1 affiliated with B. Admin approves applicable Buyer/Seller/Logistics applications; Logistics approves its own Riders. Do not bypass approval by editing the database.
6. Configure valid pickup/destination coverage, eligible Riders and published shipping rates. Retain one pending account and one unrelated company's account for access tests.
7. Create separate parcels for normal delivery, cancellation, failed delivery, return/restock, damaged return and payout-before-refund. Do not reuse an already terminal parcel for an incompatible journey. Reset fixtures only in the dedicated test environment through an agreed process.
8. Prepare a phone camera, printed waybill, available USB/Bluetooth scanner and harmless synthetic proof image. Real hardware tests must be recorded separately from manual tracking entry.

### Controlled financial example

Use a product costing PHP 100, stock 10, quantity 2, a PHP 20 store voucher, PHP 50 shipping and 10% commission. Configure those values explicitly in the test environment; do not change an operating store's settings. The shipping quote may require a rate/weight fixture that yields PHP 50.

| Expected value | Amount |
| --- | ---: |
| Gross products | PHP 200.00 |
| Voucher discount | PHP 20.00 |
| Net product sales | PHP 180.00 |
| Parcel COD: net products + shipping | PHP 230.00 |
| Commission: 10% of net products, excluding shipping | PHP 18.00 |
| Seller proceeds before refunds/costs | PHP 162.00 |
| Stock after adding to cart | 10 |
| Stock after checkout | 8 |

For a partial PHP 90 product refund after the required return/receipt and reconciliation, expect PHP 9 commission reversal and PHP 81 seller deduction. A full PHP 230 refund reverses PHP 18 commission, deducts PHP 162 seller proceeds, and records PHP 50 shipping refund separately. Original sales and actual previous payments remain historical records. Use a separate full-refund parcel if you already recorded a partial refund: refunds cannot be recorded twice for the same request.

## 3. How to execute and record a case

1. Record the account aliases, product/parcel references, initial state and starting stock or balances. Never record passwords, OTPs, session cookies or real private documents.
2. Perform the case steps below. For a dependent case, finish its prerequisites first. If a prerequisite fails, mark the dependent case **Blocked**, not Pass.
3. Compare the exact expected result, reload, and check the next role. For rejected actions, verify no unintended order, stock deduction, state transition or financial record occurred.
4. Record **Pass**, **Fail**, **Blocked**, **Not Run**, or **N/A**. N/A needs an agreed scope reason. Write actual results and evidence paths; never fill them with expected results in advance.
5. On failure, record a defect and preserve the evidence. After a fix, rerun the failed case, its failure/repeat variants, and the affected connected journey.

Evidence examples: before/after stock screenshots, parcel timeline from both roles, a redacted request status, printed label photograph, recorded balances and a screenshot of the rejection. Store private evidence outside publicly served folders. Browser Network details are useful for diagnostics; redact tokens/cookies and personal data before sharing.

## 4. Test cases

**P0** = blocks core transaction integrity/security; **P1** = important supporting behavior or operational acceptance. These are proposed acceptance priorities, not a claim that every listed case already passes. IDs map to the existing [feature register](SYSTEM_FEATURE_CHECKLIST.md) through the Requirement column.

### Accounts, access and data isolation

| ID | Priority | Requirement | Setup | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | P0 | A04-A06, B01, S01, L01, R01 | Fresh role registrations | Register each role; try operations before verification/approval; verify email; use the correct approver; log in again | Required gates enforced; email verification alone does not bypass required approval; only affiliated Logistics approves Rider; public signup cannot create Admin |
| AUTH-02 | P0 | X01-X02 | Approved A accounts; pending account | Try incorrect password, pending account access and direct protected page URLs; log out then revisit protected pages | Invalid login fails without a session; pending access restricted; logged-out requests require authentication |
| AUTH-03 | P0 | X01, A10-A11 | Signed-in eligible Seller/Logistics/Rider | Suspend an eligible account through authorized controls; retry an existing-session action; test protected company change pending re-review | Restricted account cannot keep operating through an old session; linked Rider restrictions follow company eligibility; existing records preserved |
| AUTH-04 | P0 | X01, B13, S09, L14, R02 | Owned and unrelated parcel references | As Buyer B, Seller B, Logistics B and unassigned Rider, try A's known detail URL and permitted test requests using A's reference | Foreign data and mutations denied; no change to owner records; hiding a menu is insufficient |
| AUTH-05 | P0 | X03, A07, B16 | Synthetic private identity/proof files | Open own authorized file; try its known URL logged out and as unrelated user; check expired access if applicable | Authorized access works; unauthorized/expired access denied; private document is not publicly available |
| AUTH-06 | P1 | X02, X06 | Test mailbox and configured auth integration | Test email verification, expired/wrong OTP, resend, password reset and old-password login; test configured Google login separately | Real test mail arrives; invalid/expired codes fail; reset changes credentials correctly; Google callback follows account gates; unconfigured integration marked Blocked |

### Catalog, cart and checkout

| ID | Priority | Requirement | Setup | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| SHOP-01 | P0 | S03-S07, A12-A13 | Seller A product and variants | Create valid product/options; reload as Buyer; try invalid price/stock/weight and an ineligible department; hide/moderate product | Valid eligible listing visible; invalid data rejected; hidden/category-ineligible listing cannot be newly purchased through direct access |
| SHOP-02 | P0 | B06-B07, X05 | Product stock 10; separate variant stocks | Add quantity 2; add different option; reload; change/remove line; try zero/negative/excess quantity | Cart persists with distinct options; adding reserves no stock; invalid input rejected; product/option quantities remain correct |
| SHOP-03 | P0 | B08-B10, S08 | Owned address, covered rate and store voucher | Save/select own address; quote shipping; apply valid, expired, exhausted and other-store vouchers; try unsupported destination/overweight parcel | Server totals match valid inputs; discounts scoped to eligible store/products; invalid voucher/coverage/weight cannot yield an accepted misleading checkout |
| SHOP-04 | P0 | B11, X05 | Controlled PHP 230 example | Checkout once; reload Buyer and Seller; inspect items, parcel, stock and totals | One intended purchase/parcel; stock 8; COD 230; commission 18; proceeds 162; Seller sees correct work; no payment falsely shown as paid |
| SHOP-05 | P0 | B12, S11 | Cart contains two stores | Checkout both; compare parent purchase and each store's parcel/label | One purchase with separate seller parcels, tracking and shipping/COD obligations; each Seller sees only its own items; Rider never collects parent total for one parcel |
| SHOP-06 | P0 | B11, X05 | Checkout confirmation ready | Double-click submit; then test a deliberately replayed identical checkout request on a disposable fixture with developer assistance | Same request does not create another order or deduct stock twice; retry behavior preserves the confirmed purchase identity |
| SHOP-07 | P0 | B09-B11, X05 | Buyer reviewing checkout | Change product price or shipping rate in another session; submit original reviewed checkout | Stale reviewed total rejected before creating order or reducing stock; updated total requires fresh review |
| SHOP-08 | P0 | B07, B11, S07 | Last unit of base product, then repeat for variant | Two Buyers add last unit; A buys; B attempts checkout; repeat with near-simultaneous requests in dedicated MySQL environment | At most one succeeds; stock never negative; refused Buyer keeps a recoverable cart; no partial failed purchase or financial effect; sequential run alone does not prove concurrency |
| SHOP-09 | P0 | S03, S07, X05 | Seller stock form open; Buyer cart ready | Open inventory edit at stock 10; Buyer buys 2; submit old inventory form; reload editor | Stale form rejected; stock stays 8; Seller can deliberately restock after reviewing current quantities; repeat for option stock |
| SHOP-10 | P0 | B15, X05 | Separate untouched purchase | Cancel before preparation; repeat cancellation; attempt cancellation on a second purchase after preparation starts | Eligible cancellation restores correct stock once; repeat has no second effect; late cancellation rejected without restoring stock |

### Physical parcel and COD journey

Run FLOW-01 through FLOW-08 on the same normal-delivery parcel. Record one tracking reference and check Buyer/Seller tracking after each handover. Assignment alone never proves physical custody.

| ID | Priority | Requirement | Setup | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| FLOW-01 | P0 | S09-S12 | New Seller parcel | Try skipping preparation; follow preparing then ready; print/reprint and attach waybill | Stage skipping rejected; correct ready work reaches Logistics; reprint keeps one tracking identity and correct parcel COD; print request alone is not proof of printing |
| FLOW-02 | P0 | L08-L09, R02-R03 | Ready parcel, eligible Rider | Logistics approves pickup; observe unassigned queue; assign Rider; Rider scans attached waybill and confirms collection | Unassigned approved pickup remains actionable; only eligible assigned Rider collects; assignment and physical collection are distinct; other Rider cannot collect |
| FLOW-03 | P0 | L10-L12, R04 | Collected parcel at center | Try sorting before receipt; receive using matching tracking/condition; then sort to valid area/bin | Wrong sequence rejected; receipt and sort have correct actor/time/history; wrong company or wrong label cannot advance parcel |
| FLOW-04 | P0 | L13, R05-R06 | Received/sorted parcel | Assign delivery Rider; try delivery before handover; assigned Rider scans and accepts dispatch; proceed out for delivery | Eligibility/coverage checked; assignment alone does not mean accepted custody; correct handover gates delivery |
| FLOW-05 | P0 | R07, B14, B16 | Assigned out-for-delivery parcel | Try missing proof, wrong tracking and wrong/short COD; then record valid recipient/proof and full COD | Invalid completion rejected without money/status effects; valid completion updates delivery/tracking and private proof; COD 230 recorded as collected liability, not Rider earnings |
| FLOW-06 | P0 | L16, A20 | Delivered parcel with PHP 230 collected | Try reconciliation before cash receipt; Logistics records PHP 200 actual receipt; inspect shortage; record remaining PHP 30 and reconcile through authorized controls | Early/full reconciliation blocked while short; cumulative receipt 230 clears shortage; no invented receipt; duplicate reconciliation has no second effect |
| FLOW-07 | P0 | A22, S18 | Fully reconciled parcel, no open return | Try payout too early on separate fixture; Admin records exact eligible proceeds with actual test reference; repeat; Seller views history | Early/wrong amount rejected; eligible PHP 162 payout recorded once; only own Seller sees it; no automatic bank transfer |
| FLOW-08 | P0 | L20-L21, R12 | Completed Rider work | Logistics records agreed PHP 30 fee then actual test payment reference; repeat; try Rider/Admin/foreign-company mutation | Fee and payment distinct; PHP 230 COD is not wages; own Rider reads PHP 30 payment; duplicate and unauthorized writes rejected |
| FLOW-09 | P0 | R08, L15 | Separate delivery-attempt fixture | Record failed attempt/reason; Logistics chooses supported hold/retry/return-to-center; try damaged parcel dispatch | Attempt history retained; failure is not delivered or collected cash; allowed next step controlled by Logistics; damaged parcel held rather than dispatched |
| FLOW-10 | P1 | S11, L10, X08 | Printed label, camera and scanner | Read barcode with actual devices; compare displayed parcel; deny camera permission; try manual fallback with reason; go offline during an action then reconnect | Correct parcel resolved; unknown/wrong labels cannot mutate custody; manual method recorded; no offline false success; inspect persisted state before retrying uncertain submission |

### Returns, money, reports and support

| ID | Priority | Requirement | Setup | Steps | Expected result |
| --- | --- | --- | --- | --- | --- |
| RET-01 | P0 | B19, A23, L22, R13, S19 | Separate owned delivered parcel | Buyer requests whole-parcel return; Admin decides; Logistics assigns eligible Rider; Rider confirms collection with tracking; Seller confirms matching receipt/condition and explicit restock | Authorized sequence enforced; approval alone moves no stock/money; each custody event traceable; restock restores original quantities/options only when selected |
| RET-02 | P0 | A23-A24, X05 | Approved return before seller receipt | Attempt early refund/receipt, wrong label, wrong Rider, foreign Seller receipt; after valid receipt repeat restock and submit duplicate return | Invalid actions produce no financial/inventory changes; no repeated stock restoration or duplicate request; original delivery history retained |
| RET-03 | P0 | A24, B20, S20 | Received/reconciled return using controlled values | Record actual PHP 90 manual refund and reference; try excessive amount and repeat; inspect reports and Buyer history | Refund bounded and once only; commission reversal 9, seller deduction 81; original sale remains; adjustments and actual reference visible only to authorized users |
| RET-04 | P0 | A22-A24, S20 | Separate PHP 230 parcel already paid to Seller | Complete return; record full PHP 230 refund; inspect Seller balance; attempt later payout beyond available store balance | Historical payout remains; seller deduction 162 and shipping refund 50 separate; resulting debt prevents an uncovered later payout; system does not debit bank account |
| RET-05 | P0 | S19, A23-A24 | Separate damaged return | Confirm damaged receipt without restock; test supported reasoned closure without refund | Stock does not automatically increase; closure creates no fake refund/payment; condition/reason/history retained |
| REPORT-01 | P1 | A19, S15-S16, S20, L17, R10 | Completed sales, costs and refund fixtures | Compare role totals with recorded transactions; filter dates/export; record PHP 20 Seller cost then void with reason | Own-scope exports match filters; sales, commission, shipping, refunds, payouts, COD and wages remain distinct; profit uses valid costs; void retained with reason |
| MSG-01 | P1 | A15-A16, B17, S14, L18 | Buyer and Seller profiles open | Exchange parcel messages while Buyer types an unsent draft; reload; try unrelated conversation; file complaint with synthetic evidence | Authorized messages persist and refresh without losing draft; unrelated conversations/evidence inaccessible; complaint retains status/history |
| REVIEW-01 | P1 | B18, A14 | Delivered and undelivered purchase | Review own delivered item; edit it; try duplicate/unowned/undelivered review; Admin hides/restores with reason | Only verified eligible purchase reviewed once per item; edit works; moderation controls public review and average while retaining history |
| UI-01 | P1 | X04, X07 | Desktop and physical phone | Run checkout and delivery forms at narrow width; keyboard through dialogs; Escape/return focus; inspect errors; check 200%/400% zoom and light/dark; sample screen reader | Essential actions/errors usable without clipping or lost input; dialog focus behaves correctly; record actual accessibility defects; these samples do not certify WCAG |
| OPS-01 | P1 | X06, X09-X10 | Isolated release-like environment | Verify real test mail/Google where configured, private storage, queue processing and HTTPS sessions; restore backup into disposable database and repeat a read/write journey | Environment works beyond local fakes; restored records/files agree; recovery evidence recorded; not permission to deploy or overwrite configured database |

### Direct-request checks with developer assistance

For AUTH-04, SHOP-06 and state/finance rejection cases, a disabled button does not prove backend enforcement. In the dedicated test environment, use browser Developer Tools > Network to identify the request made by an allowed action. Have the developer replay it under the relevant test user's authenticated session, changing only the owned resource reference, amount or requested stage being tested. Keep normal session/CSRF requirements intact. Never paste session credentials into reports or third-party tools.

Record the HTTP status and persisted outcome. A deliberate authorization/validation response is expected; exact status can vary by endpoint. An unexpected server error is a defect, even if it prevented the action. A 200 response that leaks foreign data or applies an invalid mutation fails. For duplicate requests, returning the original successful result is acceptable only if no second effect occurs.

## 5. Backend verification alongside manual testing

Have the developer run the repository's existing feature tests in an isolated test database after verifying `phpunit.xml` and environment overrides. Do not assume an inherited `DB_URL` or environment setting points to a disposable database. These commands are instructions, not results from this guide:

```powershell
php artisan test --compact tests/Feature/BuyerSellerIntegrityTest.php tests/Feature/Checkout/CreateOrderFromCartTest.php tests/Feature/SettlementAndReturnsTest.php tests/Feature/Logistics/LogisticsWorkspaceTest.php tests/Feature/RiderWorkspaceTest.php
php artisan test --compact
```

Save fresh output, counts, date and application build. The November 1 report recorded 1,086 passed, 3 failed and 3 skipped. The three recorded failures concern a Logistics metric expectation and two blocked legacy profile-mutation expectations. They remain unresolved until investigated and rerun; do not delete tests or weaken authorization merely to obtain green output. Historical browser scripts also have stale fixtures/selectors. See [the role audit](ROLE_FEATURE_AUDIT_2026_11_01.md) and [Buyer/Seller verification](BUYER_SELLER_VERIFICATION_2026_11_01.md).

For changed code, run appropriate formatting/static checks and relevant tests; frontend changes also require ESLint, TypeScript and a production build under repository standards. Such checks do not replace manual workflow acceptance.

Ask the developer for controlled MySQL tests of simultaneous last-unit checkout, duplicate custody transitions, competing cash receipts/payouts/refunds and failure rollback. Expected invariant: committed records agree, stock is never oversold, only eligible state transitions commit and each financial effect occurs once. Browser double-click tests and sequential SQLite tests alone cannot establish these properties under MySQL contention. Keep fault injection and concurrency experiments off real accounts and production data.

## 6. Suggested execution order

1. **Session 1:** setup and AUTH cases. Stop if access boundaries fail.
2. **Session 2:** SHOP cases, controlled totals and two-store purchase. Stop money/custody journeys if checkout is inconsistent.
3. **Session 3:** FLOW-01 through FLOW-08 with the same parcel and all five roles. Then failed delivery and physical devices.
4. **Session 4:** RET cases on separate fixtures, reports, messaging, reviews and accessibility.
5. **Session 5:** fixes and regression; isolated backend/concurrency checks; release-like integration and recovery acceptance.

These are work sessions, not guaranteed completion times. A blocked external integration remains Blocked rather than being replaced with a fake success.

## 7. Defect record and acceptance decision

Copy this for each failure:

```text
Defect ID / related test ID:
Title:
Build, URL, database engine, date, browser/device:
Account aliases and product/parcel references:
Prerequisites and initial stock/balances/state:
Exact reproduction steps:
Expected result:
Actual result, including reload and connected-role checks:
Evidence path and redacted request status:
Severity / owner:
Fix reference / retest date / result:
```

Severity: **Critical** for unauthorized data/actions, stock corruption, duplicate/wrong money effects; **High** for a blocked core journey; **Medium** for an important function with a workable alternative; **Low** for minor presentation issues. Priority determines test order; severity describes an observed defect.

Recommended acceptance gates:

- All P0 cases pass with evidence on the candidate build; no open Critical/High defects.
- Happy path, rejection, repeat and cross-role checks agree after reload.
- Required automated tests pass; every remaining failure/skip is investigated and explicitly dispositioned. Known stale tests are not silently waived.
- Physical device, external service and MySQL acceptance required for the intended operation is completed; any remaining restriction is documented and accepted before use.
- P1 failures have owners and an explicit acceptance decision. Approval of test results is separate from permission to deploy.

Calculate **execution coverage = (Pass + Fail) / applicable cases x 100** and **pass rate = Pass / (Pass + Fail) x 100**. Report Blocked and Not Run separately; exclude approved N/A from applicable cases. Example: 30 Pass, 2 Fail, 3 Blocked and 5 Not Run means 80% executed and 93.75% pass rate across 40 applicable cases. A high pass rate does not override a critical failure, and neither measure equals project completion percentage.

## References

- [Feature register and scope](SYSTEM_FEATURE_CHECKLIST.md)
- [Fresh-account walkthrough](WORKSPACE_ACCEPTANCE.md)
- [Money calculations and return rules](FINANCE_AND_RETURNS.md)
- [Role connections and scanning requirements](standards/CORE_WORKFLOWS_AND_SCANNING_REQUIREMENTS.md)

No application behavior, accounts, payments, database records, deployment or test execution is changed by creating this guide.
