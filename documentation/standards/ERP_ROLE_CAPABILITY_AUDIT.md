# ERP roles and capability reconciliation

Reviewed 2026-10-13 against the supplied five-page `ERP-Components.pdf` and the current repository. The PDF is a capability reference, not an identified official SRS. The user's latest instruction authorizes public Rider signup followed by Logistics approval and takes precedence over the earlier invitation-only brief.

## Role boundaries

| Display role / stored role | Authorized work | Scope |
| --- | --- | --- |
| Buyer / `buyer` | Catalog, cart, COD checkout, addresses, order status/cancellation, messages, support | Own cart, addresses, orders and conversations |
| Seller / `seller` | Inventory, stock/prices/photos/weight, order preparation, waybill, tracking, sales reports, messages | Own store and seller orders |
| Rider / `courier` | Assigned pickups/deliveries, private delivery proof, COD collection, delivery history, messages | Parcels assigned to the Rider; approved operational center required |
| Logistics / `sorting_center` | Rider approval and permitted activation/deactivation, pickup approval, receiving/sorting/dispatch, area assignment, rates, monitoring, COD handover, reports/messages | Own operational centers and affiliated Riders |
| Admin / `admin` | Business registration review, account administration, compliance, complaints, commission, reports, platform content and audit history | Platform administration; Rider approvals belong to Logistics |

Every role's dashboard URL checks the stored role. Operational routes enforce roles and account approval on the server. Controllers/policies further constrain ownership, centers and assigned parcels. Changing a submitted `role`, `status`, company or center cannot grant additional permissions. Public catalog browsing remains available to guests and signed-in users.

## Rider flow implemented in this change

1. Select Rider at `/register?role=courier` and complete one form with personal/contact/address details, password, vehicle/plate, Logistics center and private ID/license/OR-CR uploads. All field and file validation stays on this page.
2. Submit once. Account, profile, address, Rider profile and private documents are saved atomically; affiliation comes from the selected operational center.
3. Verify email and go directly to the waiting-for-Logistics-approval page. New Riders do not complete another details form after login.
4. Public Rider signup uses the complete email/password form. Google sign-in remains available for existing accounts, but cannot create an incomplete new Rider through a separate onboarding path. Historical incomplete/rejected accounts retain their correction workflow.
5. The assigned Logistics company/center approves or rejects. Rejection requires a reason; the Rider can correct and resubmit. Decisions use existing email notifications and audit records.
6. Approved Riders can open their own dashboard and assigned delivery workflows. Company/center suspension still blocks operations. Admin can inspect Rider applications but cannot approve them; Rider applications do not inflate Admin's review queue/badge.

Existing company-created invitations remain compatible, and historical Admin override audit records are preserved. Admin cannot make further Rider approval decisions, including on legacy applications. Invitations do not form the primary Rider enrollment experience. No database migration or existing-account status change is required.

## Capability gaps and differences

| PDF capability | Current implementation / remaining gap |
| --- | --- |
| Buyer account review / ID approval | Buyer email/password signup now requires a privately stored valid ID and activates after email verification. Legacy/Google Buyer onboarding requires an ID application and Admin review. The differing approval contracts remain; collecting an ID does not establish that it was manually verified. |
| Product variants, buyer vouchers/discounts, ratings/feedback | No complete implemented workflow; catalog/cart/order tracking should not advertise these as working actions. |
| Payment modes | COD is supported; online payment modes are not implemented. |
| Seller inventory, prepare orders, waybill, tracking, date-filtered reports | Implemented; reports calculate completed product sales, commission and seller proceeds. |
| Seller profit / costs / payouts | No complete cost/profit ledger or proof of payout. Seller proceeds are not net profit. |
| Rider pickup/delivery dashboards | Assigned parcels and stage transitions are implemented. Open pickup requests are assigned by Logistics; Riders cannot self-assign another Rider's work. |
| Rider profit page | Delivery history and parcel COD values exist; no Rider compensation formula, earnings ledger or payouts. COD collected and shipping totals must not be represented as Rider profit. |
| Logistics Rider review and parcel workflows | Implemented with center/company boundaries; public Rider enrollment now feeds the existing review workflow. |
| Admin functions | Registration/account/compliance/complaint/commission/report/content/audit workflows exist. Commission defaults to 10%, with an existing Admin setting for future orders. |
| Chat/messaging | Order and scoped support conversations exist; this is not a fully verified real-time chat service. |
| Account management/logout | Existing profile/security/settings and logout are retained with role/status access restrictions. |

This is not a claim of full PDF completion. Requirements for missing commercial features, especially Rider pay and cost accounting, need concrete business rules before figures can be calculated accurately.

## Evidence

Server boundaries: `routes/web.php`, `DashboardController`, `RegisterAccountRequest`, `RegisterAccount`, `AccountVerificationLifecycle`, `ApplicationController`, `ApplicationReviewController`, `RegistrationApplicationPolicy`, `UserPolicy`, `DeliveryController`, `ReportController`, `LogisticsWorkspace` and `AdminWorkspace`.

Regression coverage: `tests/Feature/Auth/RiderSelfRegistrationTest.php`, `RoleCapabilitiesTest.php`, existing role/approval/logistics/marketplace suites, and the frontend registration and native browser runners. Executed results and remaining visual limitations are recorded in `UI_UX_AUDIT.md`.
