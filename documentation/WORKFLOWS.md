<div align="center">

# Workflows

**Orders, parcel custody, finance, returns and account review.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This guide follows orders across stock, physical custody and money, including three forward scan checkpoints, version-3 returns, Lubos Coins, vouchers and account review.

**In this guide:** [Reading the current workflows](#guide) · [Order journey](#orders) · [Parcel scanning and delivery proof](#scanning) · [Finance, settlement and returns](#finance) · [Shop vouchers](#vouchers) · [Logistics account settings](#account-settings) · [Admin approval and notifications](#approvals)

<a id="guide"></a>

## Reading the workflows

Assignment, physical custody and money are separate events. Use [Workspaces](WORKSPACES.md) for role capabilities and approval requirements; this guide owns the connected business rules. The current source uses three forward scan checkpoints and version-3 item/quantity refunds. Earlier proposals and whole-parcel return descriptions remain in [historical reviews](reviews/README.md).

<a id="orders"></a>

## Order journey

<a id="orders-how-it-works"></a>

1. A Buyer selects products/options, address and a shipping quote. Checkout revalidates stock, prices and any store voucher. Coin use is opt-in against merchandise after discounts; shipping remains cash.
2. One purchase creates a separate Seller parcel and tracking reference for each store. Checkout snapshots commercial details and protects repeat submissions with a Buyer-scoped request key.
3. Each Seller prepares its parcel and prints the waybill. Ready for Pickup and a printed label do not establish physical custody.
4. Logistics assigns eligible pickup/delivery Riders. The three forward scan checkpoints are pickup, facility receipt and delivery-Rider handover. Sorting and assignment do not add scans.
5. The assigned delivery Rider starts delivery and completes it with private photo proof, recipient name, contextual notes and confirmation of the server-derived COD when due. Failure is a separate reasoned action. Each parcel progresses independently; one completed parcel does not complete the others.
6. Rider submits the collected cash handover; Logistics confirms actual receipt. Logistics retains shipping and submits merchandise remittance. Admin separately verifies reconciliation and actual platform receipt before eligible Seller settlement.

Use [scanning/POD](WORKFLOWS.md#scanning) for custody and completion details and [finance/returns](WORKFLOWS.md#finance) for coin allocations, settlement gates, financial responsibility and reverse-return tasks. Cancellation is limited to the supported pre-preparation stage and restores stock/coin debits once; a completed return does not automatically restore voucher usage.

Stock, custody, money and API retries require server confirmation. Preserve mutation keys across uncertain retries. There is no verified offline custody synchronization feature.

Sources: [checkout action](../web/app/Actions/Checkout/CreateOrderFromCart.php), [delivery handler](../web/app/Http/Controllers/DeliveryController.php), and the [finance contract](WORKFLOWS.md#finance).

---

<a id="scanning"></a>

## Parcel scanning and delivery proof

<a id="scanning-current-custody-refinement--november-16-2026"></a>

### Forward checkpoints and replacement

Logistics controls Rider pickup/delivery/both capabilities and separate assignments. Three forward scans are mandatory: pickup from the Seller, facility receipt, and delivery-Rider handover. Sorting and assignment add no scans. Final delivery uses proof and COD confirmation instead of a fourth scan.

After physical facility return of an undelivered parcel, Logistics may document an exceptional replacement and assign an eligible covered delivery Rider. The replacement scans `accept_transfer`; it has no forward-checkpoint key. Original checkpoint timestamps and the actual COD collector remain intact, and delivered parcels cannot reopen.

Reverse transport uses independent return events under the [finance/returns contract](#finance-returns-and-refund-funding), without resetting forward checkpoints. In-progress version-1 returns retain their historical handover behavior.

<a id="scanning-label-and-camera-behavior"></a>

### Label and camera behavior

Waybills carry Code 128 and a square QR containing the same LM tracking reference, without a URL or recipient information. Existing Code 39 labels are also supported. A capture or manual lookup selects a parcel; authorized server confirmation performs the custody action. Forward checkpoints require scanner capture. Do not treat an interrupted request as a completed handover.

The shared web camera uses the native decoder and a ZXing fallback; label generation uses JsBarcode and the ZXing QR writer. Camera access needs localhost or trusted HTTPS. A physical phone over insecure LAN HTTP is not sufficient for browser camera permission.

<a id="scanning-proof-of-delivery"></a>

### Proof of delivery

After the three forward checkpoints, sorting, assignment and Start Delivery, the assigned Rider submits a private JPG/PNG photo (up to 5 MB), recipient name, a contextual delivery note and COD confirmation when cash is due. The server derives the remaining cash amount. There is no fourth forward scan. Failed delivery is a separate reasoned action and does not create a COD collection. Signature and GPS are not required by this completion handler.

Source: [DeliveryController](../web/app/Http/Controllers/DeliveryController.php). Earlier form and reverse-return descriptions are historical; use [finance and returns](#finance) for current version-3 tasks.

<a id="scanning-acceptance-limits"></a>

### Acceptance limits

Validate printed labels, camera permissions, proof uploads and printer output on the intended physical devices.

---

<a id="finance"></a>

## Finance, settlement and returns

<a id="finance-current-source-contract--november-16-2026"></a>

### Financial responsibilities

This guide describes the implemented finance and returns contract. See [parcel checkpoints](WORKFLOWS.md#scanning) and [API compatibility](api/FINANCE_2026_11_11.md).

<a id="finance-responsibilities-and-custody"></a>

#### Responsibilities and custody

COD handovers now have explicit submissions at both custody boundaries. Rider
submits the fixed collected COD amount with a system-derived reference. Logistics
confirms those same details or separately reports an actual cash discrepancy.
After full receipt, Logistics uses Shipping & Remittances → View details →
Hand over cash to Admin. This records a fixed product amount and generated LMHO
reference, with shipping retained by Logistics. Admin receives a notification,
verifies COD reconciliation, and separately confirms actual receipt using the
same handover reference. Submission alone never funds Seller settlement. Actual
receipt date and evidence remain required; historical receipt workflows remain
supported.

The account role remains **Rider**. Logistics controls `pickup`, `delivery`, or `both` capabilities. Existing accounts default to `both`; restricting capability is refused while active work, reverse transport, or outstanding COD would be stranded. Admin cannot configure Logistics wages.

Parcels retain separate pickup/delivery Riders, assignment dates, append-only assignment records, and custody evidence. The old `rider_id` remains a current-assignment compatibility field. Historical checkpoint actors backfill reliable Rider identities; unknown assignment dates remain unknown. COD always belongs to the actual recorded collector. A pickup Rider keeps pickup history after dispatch assignment, with Buyer contact/proof restrictions.

Ordinary reassignment ends before accepted custody. Exceptional replacement follows the [facility-return and transfer rules](#scanning-current-custody-refinement--november-16-2026).

<a id="finance-cash-settlement-and-compensation"></a>

#### Cash, settlement, and compensation

All authoritative arithmetic uses centavos or the existing decimal snapshots. Large proportional allocations avoid intermediate multiplication overflow. Define:

| Amount                       | Definition                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Net merchandise              | original merchandise minus the Seller-funded voucher.                          |
| Commission                   | the original configured basis-point snapshot applied to net merchandise.       |
| Seller proceeds              | net merchandise minus commission.                                              |
| Merchandise cash             | net merchandise minus redeemed coins.                                          |
| COD due                      | merchandise cash plus shipping.                                                |
| Platform merchandise funding | verified merchandise-cash remittance plus the backed original coin allocation. |

Buyer cash passes to the delivery Rider and then Logistics. Logistics retains shipping and remits **only merchandise cash** to the platform. A fully coin-funded merchandise purchase requires no zero-value merchandise remittance; its cash shipping still requires COD verification. There is no second shipping payout.

Rider cash receipt entries record cumulative observed receipt amounts, expected cash, discrepancy, receiver, timestamp, reference, and reason. They are observations/corrections, not additional receipts to sum. The current COD row projects the latest observation. Shortages remain unreconciled; earlier shortage evidence is retained when the balance is corrected.

Seller payout still requires completed delivery, exact COD reconciliation, verified cash/coin funding, resolved return holds, and enough store balance after earlier payouts/refunds. Historical payouts are retained. Repayments against established Seller debt replenish backing and reduce the recoverable balance, preventing a second deduction from future settlements. Stores cannot offset each other's debt.

Logistics may agree a future seven-day weekly compensation period for an individual Rider. Amount, period, planned payment date, notes, actual payment reference, and paid timestamp are recorded. Overlapping periods and duplicate payments fail. Covered work cannot also receive parcel fees. Existing parcel fees remain intact; weekly periods are explicit agreements, not an automatic salary scheduler. COD is never wages. Buyer-return collection and Seller-return transport are distinct compensable work; a collection fee requires facility receipt evidence.

<a id="finance-returns-and-refund-funding"></a>

#### Returns and refund funding

The November 16 return/refund repair supersedes earlier return, consent and reserve-gating descriptions. New requests use workflow version 3 and can select original items/quantities and repeat requests against remaining eligibility. Pending requests reserve quantities; rejection releases them. Net paid prices, discounts, original coin allocations, original shipping and prior refunds cap every approval.

Admin approval records the reviewed financial decision, spendable coin credit, liability, adjustments, audit and any required physical-return task atomically. Wallet operation keys and a unique task/case reference prevent replay. A successful approval does not wait for Buyer acceptance, Seller receipt or recorded cash-reserve funding. It records an obligation, not a cash receipt or bank transfer. Actual cash funding and responsible-party recoveries remain separately evidenced.

Refund review/credit, return-task custody and financial settlement/recovery are distinct. Physical returns follow approved task -> collection assignment -> Rider collection proof -> actual facility receipt -> Seller dispatch acceptance -> Rider Seller-delivery proof -> Seller confirmation. The same Rider remains selected if both capabilities and coverage permit. No-return refunds create no task. Existing delivery/tracking and payment history stay intact. Missing historical custody/proof is never fabricated.

The configured return window remains delivery-specific, with authorized exceptions and private damage/incorrect-product evidence. The Seller no longer supplies a scan/tracking value. Seller receipt records actor/time and restocks approved intact quantities once; discrepancies never automatically reverse coins.

Refund responsibility and return-shipping responsibility are separate decisions. Seller deductions adjust pending proceeds or preserve already-paid proceeds as recoverable balances. Logistics fault records company liability, never an assignment-based Rider charge. Buyer/platform-responsible refunds retain the supported platform expense treatment. Completed return-work fees link to the unique task and record transport responsibility separately from refund value and actual Rider payment.

<a id="finance-lubos-coins"></a>

#### Lubos Coins

Lubos Coins are valued at PHP 1.00 per coin, with centavo precision. Credits are non-transferable, with no top-ups, rewards, interest, withdrawal or expiry. Approval restores the original coin-funded share and credits the cash-funded approved share as coins immediately. No Buyer offer/acceptance step or later issue-credit form is required. Historical external cash refunds keep their original interpretation and are never automatically converted again.

Checkout remains opt-in and spends available coins against merchandise after vouchers; shipping remains cash. Cancellation restores the original debit once. Partial refunds allocate net paid value deterministically, cap cumulative refunds/restorations, and balance commission rounding across cases. New liability-based wallet corrections do not change cash reserve; historical reserve-funded corrections retain their original reserve treatment.

<a id="finance-shop-vouchers-and-reporting"></a>

#### Reporting

Finance separates expected, collected, Logistics-received, reconciled, platform-funded, payable, paid, refunded and outstanding values. Order-creation date, exact reference and COD-status filters scope transaction lists. Live wallet liability and available unallocated refund backing are explicitly all-time figures. Logistics/Rider compensation remains inaccessible to Admin. Shop promotion rules are defined once under [Shop vouchers](#vouchers).

<a id="finance-release-and-verification-history"></a>

### Scope and acceptance

Automatic bank transfers, top-ups and withdrawals are not implemented. Physical return/cash handovers, accessibility and live-service acceptance require environment-specific verification. Use the [deployment and backup runbook](DEPLOYMENT.md#deployment) for authorized releases.

<a id="vouchers"></a>

## Shop vouchers

<a id="vouchers-context"></a>

Sellers manage fixed-peso store vouchers with minimum merchandise spend, expiry and use limits. Four editable presets suggest PHP 10/200/20 uses, 20/400/20, 50/1,000/10 and 100/2,000/5, each for 30 days (discount/minimum spend/use limit). Confirmation activates the promotion and generates a code. Existing manual vouchers stay private unless explicitly made public; presets preserve the selected public/private visibility.

<a id="vouchers-how-it-works"></a>

Public vouchers appear on product pages, store-filtered shop pages and cart/checkout. Buyers can select an eligible suggestion, review the recommended eligible discount and remove it. Preview does not consume a use.

<a id="vouchers-checkout-validation"></a>

### Checkout validation

Locked checkout revalidates store eligibility, activation, expiry, minimum spend, capacity and Buyer reuse. There is one voucher per checkout, no stacking and no free-shipping promotion. The discount applies only to its issuing store's merchandise and is capped by that subtotal; shipping is unchanged. Commission uses net merchandise after discount. Opt-in coins are applied afterward and do not count as another voucher discount.

<a id="vouchers-cancellation-and-returns"></a>

### Cancellation and returns

Cancellation releases usage under the supported cancellation rules. A completed return does not automatically restore it. Vouchers are Seller-funded discounts; they are not prepaid balances or gift cards.

Sources: [voucher controller](../web/app/Http/Controllers/StoreVoucherController.php), [checkout action](../web/app/Actions/Checkout/CreateOrderFromCart.php).

---

<a id="account-settings"></a>

## Logistics account settings

<a id="account-settings-how-it-works"></a>

The Logistics owner page is `/settings/account`; `/settings/profile` renders the
same feature for approved Logistics accounts. Administrators review requests at
`/admin/change-requests`, linked from the registration review queue.

<a id="account-settings-data-and-approval-rules"></a>

### Data and approval rules

`registration_applications`, `user_profiles`, the application's linked address,
and its private registration documents remain the approved source of truth.
Settings reads those records rather than maintaining an editable profile copy.
`registration_snapshots` captures the initial approval baseline and each approved
company re-verification. Snapshots reject Eloquent updates/deletes. Database
credentials with direct SQL access must still be restricted operationally.

Address and re-verification proposals never replace approved values before
approval. All mutations and decisions serialize on the owner account row.
Approvals apply values, record the decision, and write an audit entry in one
transaction. A failed audit rolls the approval back. Duplicate/replayed reviews
return 409. Re-verification also checks document availability and company/SEC/TIN
uniqueness again on approval. TINs are masked in responses and audit summaries;
document storage paths never appear in API responses.

Service regions are a fixed nine-digit code list matching this application's
registration contract. The address region cannot be removed. Removed regions
take effect immediately; re-adding an original registration region is immediate.
Other additions await approval. Editing the selection while a request is pending
updates that proposal, so approval cannot restore a removed region. Withdrawing
all proposed additions closes the request as rejected with an owner-withdrawal
reason. An approved address automatically includes its new region. An older
service proposal that omits that region must be revised or rejected.

<a id="account-settings-setup"></a>

<a id="account-settings-configuration"></a>

### Configuration

For an authorized release that introduces this feature, include snapshot backfill and vetted location import in the [normal deployment process](DEPLOYMENT.md#deployment):

```powershell
composer install
npm.cmd ci
php artisan migrate
php artisan account:backfill-snapshots
php artisan account:import-locations C:\data\validated-psgc-postal.csv
npm.cmd run build
```

The importer expects this exact CSV header:

```csv
region_code,region_name,province_code,province_name,city_code,city_name,barangay_code,barangay_name,postal_code
```

> [!IMPORTANT]
> Supply a vetted hierarchy joined to an authoritative postal-code crosswalk.
> The original feature record reports no supplied production postal crosswalk.
> Deployment import status is unverified; do not invent location rows. Address changes are unavailable until imported,
> and unknown hierarchy/postal combinations return 422. Multiple postal codes per
> barangay can be imported; the UI fills the first available code. NCR uses the
> existing registration convention of a synthetic Metro Manila province code
> `130000000`. This application uses legacy nine-digit codes; normalize modern
> ten-digit PSGC exports to the established registration codes before importing.

PSGC source: [Philippine Statistics Authority](https://psa.gov.ph/classification/psgc/).
Region labels include the [Negros Island Region](https://psa.gov.ph/content/second-quarter-2024-psgc-updates-creation-negros-island-region-and-correction-names-two).

<a id="account-settings-authentication-and-private-files"></a>

### Authentication and private files

The `/api/account/*` and `/api/admin/change-requests*` routes use `auth:sanctum`
within the existing web session/CSRF boundary. This is a same-origin Inertia.js SPA;
personal access token issuance is outside this feature. Laravel Sanctum's session
middleware is used on these routes to preserve password-session invalidation.
See [Laravel Sanctum's first-party authentication guidance](https://laravel.com/framework/docs/12.x/sanctum).

Only an owner or an authorized registration administrator can download submitted
documents, even if another user obtains a signed URL. URLs expire after five
minutes. Documents and proposed replacement uploads use the existing private
`local` disk. Owners obtain signed URLs from settings; administrators obtain
signed proposed-document URLs from the review queue. Expired URLs can be renewed
by refreshing the relevant page. Never expose `storage/app/private` publicly.

<a id="account-settings-assumptions"></a>

### Assumptions

- “Account” maps to `users`; this feature applies to the `logistics`
  Logistics-company role. Existing buyer/seller/rider settings remain intact.
- OTP authorizes contact changes using the project's existing registered-email
  code service. Tokens expire after ten minutes and are consumed once. A new
  email additionally requires the existing destination verification link.
  There is no installed SMS provider; this does **not** verify possession of a
  replacement phone number through SMS.
- Pending re-verification blocks operational access under the existing approved
  account rule. Settings stay accessible. Rejection preserves the previous
  approved registration and restores approved status, displaying the reason.
- Replacement company verification requires all four new documents. The same
  registration format, uniqueness, MIME, extension and 5 MB upload rules apply.
- Notification preferences are persisted; mandatory security/compliance mail is
  unchanged. No SMS delivery provider is introduced.
- Existing approved accounts can only be snapshotted from the registration data
  available now; historical values altered before this feature cannot be recovered.

<a id="account-settings-validation"></a>

<a id="account-settings-testing"></a>

### Testing

Feature tests cover locked fields, initial approval snapshots, named regions,
masked/revealed TIN, hierarchy/postal validation, immediate removals and pending
additions, mandatory-region checks at approval time, re-verification, owner-only
documents, Admin decisions, OTP consumption, and transaction rollback on audit
failure. Relevant registration/settings tests provide connected coverage. These are existing verification references; no application tests were run during this documentation cleanup.

Current browser artifacts are under the root `.tools/development-artifacts/storage-app/account-settings-ui-check/`. The existing harness uses
an isolated temporary SQLite database with synthetic owners/admins and fake mail.
The checks cover 320/768/1440 pixel reflow, cascading selects/postcode fill, TIN reveal,
CSRF-protected proposals, pending comparisons, keyboard focus, and Admin approval.
Screenshots include light and dark states. These checks do not certify WCAG
compliance; screen-reader testing and comprehensive zoom/contrast checks remain.

Run the browser check with `node tests/Frontend/account-settings-browser-check.cjs`.

---

<a id="approvals"></a>

## Admin approval and notifications

<a id="approvals-how-it-works"></a>

New complete Buyer, Seller and Logistics registrations require Admin review after email verification. The current [account lifecycle](../web/app/Services/AccountVerificationLifecycle.php) keeps these applications pending; verification alone does not activate Buyer signup. Legacy paths retain their applicable lifecycle. See [registration and access](WORKSPACES.md#registration-and-access).

A complete, verified registration remains `pending`, shows the waiting-for-approval page and cannot access its operational dashboard until approval. Rider review belongs exclusively to the affiliated Logistics company.

<a id="approvals-admin-queue-and-notification-menu"></a>

### Admin queue and notification menu

- Submitted Buyer, Seller, and Logistics applications appear under **Registrations → Awaiting review** and in the notification count. Drafts, approved/rejected applications, and Rider applications are excluded.
- The notification menu lists the latest eight pending applications with the role and applicant/business label. Buyer uses the applicant name; Seller uses the store name; Logistics uses the company name. The total count includes all matching applications, including older pages.
- Each alert links to the correct application review. Unverified submissions say **Email verification pending**; review details remain readable, but approval controls stay unavailable until verification and the pending account state are valid. Server-side validation also rejects an attempted bypass.
- Admin notifications, the sidebar badge, and the open registration list refresh every five seconds while visible and online. Notification requests also refresh on focus/reconnection; their rate-limit bucket is separate from registration/review actions. Detail dialogs defer list refresh to preserve the review interaction.
- Approved/rejected records leave the pending notification feed. The existing decision email is sent after the decision is saved; mail failure cannot silently undo a valid approval.

<a id="approvals-api-response"></a>

### API response

`GET /admin/notifications` remains active-Admin-only and private/no-store. Its existing `permissions` and `badges` are preserved. It also returns `registrationCounts` for the three roles and `registrationAlerts` containing only review identifiers, role, label, verification state, and submission time. It exposes no private documents or identity numbers.

<a id="approvals-environment"></a>

<a id="approvals-configuration"></a>

### Configuration

For live testing, the applicant and Admin must both use **lubosmart.app**. An account registered there cannot appear in the separate localhost/XAMPP database. Check the deployed revision separately before expecting this behavior on the live site.

---

<div align="center">

**LubosMart** · Workflows · [Documentation](README.md)

</div>
