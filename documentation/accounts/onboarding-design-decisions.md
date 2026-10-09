# Progressive registration and verification

> Historical October 7 design notes. Current rules require approval for all four public roles, including buyers. See [account approval and security](account-security.md) and [registration flow](registration-authentication.md) for the implemented October 9 requirements.

Applied from `Marketplace_Registration_and_Verification_System_Design.docx` on 2026-10-07, alongside the existing ERP role boundaries. The document is a design reference. The implementation uses the existing Laravel account, application, document, address, and audit models instead of replacing historical records.

## Account journeys

| User | Working journey | Review |
| --- | --- | --- |
| New buyer | Name/email/password or Google → email verification → buyer dashboard → shop → address at checkout | No ID application or administrator approval for ordinary signup |
| Seller | Short account setup → verified email → personal → business/category → address → private documents → review → submit | Administrator |
| Courier | Short account setup → verified email → personal → vehicle/center → address → private documents → review → submit | Logistics member of the selected active sorting center |
| Logistics | Short account setup → verified email → personal → business → address → private documents → review → submit | Administrator; approval creates center and membership |
| Administrator | Trusted console provisioning | Public signup cannot create administrators |

The seller category dropdown lives in the business application step. Store name and category are not prerequisites for creating the email account. The store is created at final submission if absent, and remains pending until approval. Optional store/category inputs from older signup clients remain supported and validated.

## Progress and persistence

Email signup now collects only **account type, email, password and password confirmation**. Name fields are deferred until Profile or the partner application. New email accounts start with the neutral display name “LubosMart member”; the application does not treat this as a legal name. Existing clients submitting a full name or structured first/last names remain supported. Existing accounts keep their names. Google signup continues to use the provider's display name.

The login/signup modal keeps its header, tabs and close button visible while the form scrolls. Compact role choices and an independently scrolling body make account creation usable on narrow or short screens.

Login and signup disable native browser validation pop-ups and show brief, accessible warnings under each field using the purple theme. Client checks cover missing values, email format, password length and confirmation; backend validation remains authoritative. The homepage includes a product search that uses the existing catalog search route, clearer category icons and concise descriptions of the working COD flow.

After Google signup, users can edit their **display name** under Settings → Profile. Google verifies the email address; its display name is not a reviewed legal identity. Editing the display name keeps the linked Google ID and email verification intact, and does not alter application identity records. This edit is also available to email/password accounts. Login and signup share a Google button using Google's official icon, stored locally at `public/images/google-g.png` from [Google's branding guidelines](https://developers.google.com/identity/branding-guidelines).

Applications have separate draft, submitted, approved, and rejected states. Editable draft/rejected applications use five steps and a **Save draft** action. Legacy buyer applications have four steps, omitting business/vehicle information. The form displays the current step and last saved timestamp; this is form progress, not a claim of verification or approval.

Partial drafts are validated and stored in `registration_applications.draft_data`, with `draft_saved_at`. Private documents can also be saved before all fields are complete. A draft does not update approved identity/profile fields, create a store, or activate privileges. The server locks the applicant and application for both draft saving and submission. Submitted applications reject further draft writes. A rejected application retains its decision/reason until final resubmission; then the old decision fields clear and review starts again. Existing uploaded document versions are retained as private records.

Final submission still validates every required field, geographic parent/child relationship, required document, and consent regardless of the displayed form step. Users see a final summary before submission and an awaiting-review screen afterward. Reviewers can filter pending, approved, and rejected applications within their assigned scope. Review dates/reviewer/reason appear on the details screen, and new decision audit entries retain the rejection reason.

## Authentication and verification boundaries

- Email signup requires the existing signed verification link before protected shopping or application actions.
- Google signup accepts backend-validated, provider-verified email and a trusted provider ID. New Google buyers are active; partners still require review.
- Previously linked Google identities log into their existing account and keep their role. Matching email alone never attaches Google to a password account. Explicit account linking is deferred until a flow proves control of the existing account.
- Google login intent does not silently create an unknown account. Signup and login remain explicit, so a login cannot unexpectedly create a role application.
- A contact phone number is saved contact information, not verified by SMS. Phone OTP, QR login, Facebook login, separate per-document verification queues, buyer transaction-specific identity checks, role upgrades, and a deactivation workflow are not added by this change.
- Historical pending/rejected/submitted buyer applications, suspended accounts, and existing approvals are preserved. The short ordinary-buyer flow applies to newly created accounts; historical decisions are not automatically bypassed.

## Local acceptance steps

1. Run `php artisan migrate` and `npm.cmd run build`. Start MySQL and `php artisan serve`.
2. Register a **new buyer**, verify its email, and confirm it reaches the buyer dashboard without uploading an ID. Add an address in Settings or at checkout.
3. Register a **new seller** without store details. Verify email. Complete personal details, choose the store category in the business step, and save a partial draft.
4. Log out and log back in. Confirm the saved fields and step return. Save synthetic ID/permit files, resume, review the summary, and submit.
5. Sign in with the existing local test admin. Filter awaiting review and open the application. Request changes with a reason; confirm the applicant can save corrections, review, and resubmit.
6. Approve the seller. Confirm the store and seller workspace activate. Repeat logistics and courier workflows, verifying that only the assigned center can review its courier.
7. Check signed-out access, email gating, submitted-draft blocking, private document downloads, and account/center isolation.

Use synthetic documents. Existing dashboard test accounts are already approved and are unsuitable for testing initial onboarding. Their credentials remain in `storage/app/private/local-test-accounts.md`; no password reset is needed for this update.

`MAIL_MAILER=log` writes verification emails to `storage/logs/laravel.log` instead of delivering them. Real inbox testing needs a configured mail transport. Run `php artisan queue:work` to process queued application decisions; Google OAuth credentials are needed for live provider acceptance. Local account passwords and other environment secrets are not included in this document.
