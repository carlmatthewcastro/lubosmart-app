# Account approval and security

Current implementation for the owner's October 9, 2026 requirements. These rules supersede earlier automatic buyer approval and the legacy `rider`/`logistics` role names.

## Roles and lifecycle

Public signup accepts exactly `buyer`, `seller`, `courier`, and `sorting_center`. Admin accounts are provisioned interactively with `php artisan lubosmart:create-admin`. Requests cannot assign an admin role, approval status, verified email, reviewer, or another user's identity.

Password signup creates an `unverified` account and a draft application. Verification changes it to `incomplete`; application submission changes it to `pending`; a reviewer changes it to `approved` or `rejected`. Rejected applicants see the reason and can save corrections and resubmit. `suspended` and `deactivated` accounts are blocked, including existing sessions, with logout available.

| Role | Approver | Required documents |
| --- | --- | --- |
| Buyer | Admin | ID |
| Seller | Admin | ID and business permit |
| Sorting center | Admin | ID and business/DTI permit |
| Courier | Selected sorting center; Admin can override with a reason | ID, driver's license, and OR/CR |

Sorting centers can review and deactivate only their own couriers. Suspension and reactivation are Admin actions. Couriers store their assignment in `users.sorting_center_id`. A center must be active and have an approved, verified sorting-center operator; disabling the center or its operator blocks associated couriers immediately without overwriting their individual approval history.

The server chooses every login destination: verification, application, waiting page, or role dashboard. Password login uses the same error for a missing email and a wrong password; Google-only accounts receive Google sign-in guidance. Five failed attempts cause a short lockout. Middleware and record policies check the session identity, verified email, status, role, and center ownership on protected reads and mutations. Submitted applicants cannot edit their application until rejected. Visitor browsing remains available for verified applicants; unverified users are always redirected to verification.

Unapproved buyers cannot use cart, checkout, orders, or chat. Unapproved sellers cannot operate, and their products are hidden. Courier deliveries and sorting-center parcel handling, assignments, and courier management require approval.

## Verification, forms, and documents

The short signup form contains role, email, password, confirmation, strength feedback, without an agreement checkbox for now. Registration without agreement does not record policy consent. Published policies remain accessible from platform information.

Verification links contain a random token stored only as SHA-256, expire after 24 hours, and are consumed once. Resending revokes the previous link, enforces a server-side 60-second cooldown, and is endpoint rate limited. The full verification page shows the target email, spam guidance, email correction with current-password confirmation, and polling every five seconds. Verification on another device never signs that device into the applicant's account; the original authenticated page detects the changed state. Mail failure leaves the account recoverable and allows another send.

Each role supplies names, sex, birthday, contact number, server-verified email, Philippine province/city/barangay selections, house number, street, postal code, and role documents. Seller and sorting-center forms add business details; couriers select an operational center and vehicle details. Age is calculated on the server. Full submissions and partial saved address selections are validated against the PSGC hierarchy. The location service is cached for one day; outages return a form error and preserve the draft. Existing combined street-address submissions remain compatible.

Partial drafts are stored separately in `registration_application_drafts`, including form progress. Draft saving grants no privileges. Uploads use generated names on private local storage, validate actual MIME/type and a 5 MB limit, and have no public storage URL. Only the assigned approver and Admin can view a registration document, using authenticated signed URLs valid for five minutes. The download handler rechecks authorization even for a valid signature and disables caching. Applicants can see document metadata and replace uploads while editing an application.

## Decisions, profile changes, and audit

Submission and review lock the user before the application and update state transactionally. Approval requires a submitted application, verified email, pending status, matching role, and an operational center for couriers. Reject requires a reason. Approval/rejection email is queued after commit; suspension/deactivation/reactivation notifications use the same queue.

Approve, reject, suspend, deactivate, and reactivate decisions retain actor, time, reason, old status, and new status in `audit_events`. Admin can filter the read-only audit page at `/admin/audit-log` by an action choice or a name/email search. Profile re-review also records its status transition. Bank details are encrypted and hidden from normal model serialization; audit entries record that they changed without copying bank numbers.

Sensitive email, phone, and bank edits require the current password or a one-time email-code confirmation. Email changes invalidate old challenges and send verification to the new address. Approved users changing business name, bank details, plate number, or ID become pending for re-review. A sorting center's re-review also blocks its couriers until approved again. All self-service edits take the identity from the server session.

## Password recovery and change

Public forgot-password requests always return: "If an account exists for that email, we've sent a code." Six-digit codes are random and hashed, expire after ten minutes, and lock after five wrong attempts. At most three requests per email per hour are allowed across purposes, alongside endpoint/IP throttles. Successful verification consumes the code and issues a random, hashed, one-time reset token lasting ten minutes. Password changes consume the token, delete outstanding challenges, rotate the remember token, and revoke other sessions. Google-only accounts cannot reset a nonexistent local password.

Admin account settings allow edits to the name and password only; email is read-only and contact fields are omitted. Admin password changes require the current password before requesting an email code; the code must be verified before saving. All approved, verified administrators share the same access; sub-admin roles are no longer used.

Password settings show the new-password form first. Clicking Change password validates both password fields on the server and sends a code without changing the saved password. Only then does the code form appear. After verification, Save new password applies the change; Cancel clears the unsaved password. Validation and delivery failures preserve the form for retry, and expired confirmation tokens are no longer shown as confirmed.

Verification links and security-code mail are synchronous through `MAIL_SECURITY_MAILER`, so raw tokens/codes are never serialized into the database queue. Use SMTP, not the log mailer or a failover to log. Approval/account/delivery notifications use `MAIL_MAILER` and need a queue worker. See [Gmail SMTP on localhost](local-email-setup.md).

## Database and operation

The new alignment migration maps legacy roles to the canonical names, renames the courier foreign key, adds `unverified`, copies saved drafts into their own table, and adds hashed verification tokens and explicit audit fields. `email_verified_at` remains the authoritative verification record; `email_verified` is derived from it. Existing passwords, accounts, documents, decisions, and order history are preserved. Migrations are forward-only to avoid losing security state.

Run `php artisan migrate`, rebuild assets, run the queue worker, and enable the scheduler. Daily cleanup removes expired challenges and old request-limit entries. SMTP inbox delivery, Google credentials/redirects, and live address-provider connectivity must be checked with the actual environment configuration; automated tests fake external providers.
