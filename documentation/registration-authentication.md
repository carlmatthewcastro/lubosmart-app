# Registration and authentication

Implemented on 2026-10-07 using the ERP reference and **Marketplace_Registration_and_Verification_System_Design.docx**. The newer design guides progressive onboarding: ordinary buyers do not need an ID application or administrator approval. References inform the implementation; they do not authorize deployments or external account changes.

## Role and review boundaries

| Role | Entry | Reviewer | Dashboard |
| --- | --- | --- | --- |
| Buyer | Short public password/Google registration; email verification | No review for new ordinary buyers | /dashboard/buyer |
| Seller | Short account setup, then business/category/document application | Admin | /dashboard/seller |
| Courier (rider) | Public registration, vehicle details, selected center | Logistics member of that active center | /dashboard/rider |
| Logistics / Sorting Center | Public application with business details and permit | Admin | /dashboard/logistics |
| Admin | Interactive trusted provisioning | No public registration | /dashboard/admin |

This updated PDF supersedes the earlier plan for admin-only rider review and invitation-only logistics registration. Public logistics registration grants **pending application access only**. Approved logistics applicants receive a center and membership atomically. Admin cannot use the rider-review endpoint; logistics cannot review buyers, sellers, other centers' riders, or its own application.

## Working account journey

1. Register with email, password and role, or use Google signup. Set the display name later in Profile. Business, legal-name and vehicle details are collected after account creation. Existing clients may still send names and an optional store name with a valid category at signup.
2. Password registrants verify email. New ordinary buyers are active accounts with unverified email until they follow the link; protected shopping actions require verified email. Google signup activates new buyers with a provider-verified email. Buyers collect delivery addresses at checkout or in Settings. Sellers, couriers, and logistics remain pending and receive a draft application. Existing account decisions and historical buyer applications are preserved.
3. Complete first/last name, optional middle initial, sex, birthday, phone, address and private ID. Age is calculated for display. Seller applications require a root business category and business permit. Logistics requires business name and business/DTI permit. Riders choose an active center and vehicle; motor vehicles require plate and OR/CR. Bicycle registration excludes motor-vehicle documents, an implementation assumption to confirm with the owner.
4. Complete the personal, business/vehicle, address, document, and final review steps. Save partial drafts, including private documents, and resume from the saved step after signing in again. Drafts do not create a business, issue approval, or grant privileges. Final submission requires complete fields and explicit consent. PSGC selections are resolved on the server against the selected parent hierarchy; browser labels and privileged fields are not trusted. Submitted applications cannot be edited until rejected. A seller store is created at final submission if not already present.
5. The authorized reviewer downloads private documents and approves or rejects with a reason. Review and submission lock user then application; decisions update access, application, store/center and audit records in one transaction. Only a submitted, verified, pending account can be approved.
6. Decision mail is queued after commit, with retries. Rejected applications remain pending, display the reason, and permit correction/resubmission.
7. /dashboard resolves verification, pending application or the correct role dashboard. Operational pages require verified, active accounts and enforce the role or record policy. Existing suspended sessions are denied on requests; logout stays available.

Review lists filter awaiting-review, approved, and changes-requested applications within the existing role/center boundaries. Detail pages show the reviewer, submission/review dates, and rejection reason. New review audit records retain the reason even after a later resubmission.

Email verification, contact information, application state, and operational account status remain separate. A saved phone is not OTP verified; Google proves control of the provider account/email, not government ID, an address, or a business. The displayed form step describes progress through the form, not approval or completed document verification. See [onboarding implementation decisions](onboarding-design-decisions.md).

Pending users can verify, complete their application, see status and access account settings. No operational dashboard or review access is granted until approval. Accounts with retained registration records receive a clear account-closure message rather than failing a restricted foreign-key delete.

## Identity and security behavior

Homepage and dedicated auth pages share the React auth dialog, including role choices, remember-me, errors and Google buttons. Password login normalizes email, regenerates the session, and preserves existing login rate limits. Registration regenerates sessions; logout invalidates them. Registration, Google initiation, password recovery/reset and verification resend are throttled.

Google login and registration have separate intents that expire after 15 minutes and are consumed once. Unknown identities cannot register from login intent. Existing Google identities retain their role. Email equality alone never links an existing password account; that user must use their existing sign-in method. Explicit linking is not implemented. Provider failures, cancellation, invalid state and unverified email produce a form error. Suspension also denies Google sign-in.

IDs and permits are stored on the private local disk, with generated names, content-based file validation, and a 5 MB limit. Only the applicant or authorized reviewer can download them; responses disable caching. Real document retention and support-assisted account closure still need an operational policy.

## Address dependency

The app uses the PSGC API at https://psgc.gitlab.io/api/ with a one-day server cache, dependent province/city/barangay selects, and an NCR option. Failed lookups display a retry error and leave the application unchanged. It is a third-party dataset: verify its current coverage and real connectivity before release. There is no unvalidated manual location fallback. Nationwide serviceability and scheduled dataset synchronization remain separate work.

## Provisioning and testing

Run php artisan lubosmart:create-admin to enter a name, unique email and a password interactively. It does not use a shared default password. Never provision administrators through public forms.

For local dashboard demonstrations, php artisan lubosmart:test-accounts creates missing verified active synthetic accounts, an approved test store and a sorting center. Repeat runs reuse existing accounts and preserve their credentials/state. It prints a random password for newly created accounts and refuses production environments. The explicit --reset-passwords option resets only reserved local test credentials when needed. See [testing workflow](testing-workflow.md).

## Remaining release verification

Real Google credentials, SMTP delivery, queue processing, address-service connectivity, mobile/keyboard behavior and MySQL concurrency require environment acceptance checks. The later UI update connects catalog/checkout, dispatch, private delivery proof, COD reconciliation, order conversations, and scoped reports; see [UI workflow](ui-workflow.md). Courier earnings, payouts, and disputes remain future work.
