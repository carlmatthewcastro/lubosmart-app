# Registration and authentication

The current flow implements the owner's October 9, 2026 requirements for all four public roles. See [account approval and security](account-security.md) for server checks, data storage, and permissions.

1. Create an account with a selected role, email, password and confirmation, and Terms/Privacy consent. Admin is unavailable at public signup. Personal, address, business, vehicle, and document fields belong to the application page.
2. Password accounts start `unverified` and receive a one-time 24-hour verification link. Unverified sessions always open the full verification page, which supports resending, email correction, logout, and cross-device detection. Google signup with a verified provider email starts `incomplete` and skips this step.
3. Complete the role application or save a partial draft and return later. The server calculates age, validates address hierarchy, identifies the owner from the session, and stores uploads privately.
4. Submit to become `pending` and open the Waiting for approval page. Role menus stay locked. Admin reviews buyers, sellers, and sorting centers. The selected sorting center reviews its couriers; Admin can override with a reason.
5. Approval enables the role menu. Rejection shows a reason and allows correction and resubmission. Decision email is queued. Suspension/deactivation blocks access immediately, including current sessions; disabling a center also blocks its couriers.

Password login chooses the next page from server state, uses a generic credentials error, and applies a failed-attempt lockout. Google login cannot create an unknown account. A provider-verified email can link to an existing password account without duplication or privilege changes; see [Google setup and rules](google-oauth.md).

Recovery and password changes use hashed six-digit email codes, limited attempts, and a one-time reset token. Changing a sensitive profile field requires password or email-code confirmation. Approved identity/business/bank/vehicle changes can trigger re-review.

For local testing, `php artisan lubosmart:test-accounts` creates missing synthetic approved accounts and preserves existing credentials on repeat runs, including legacy test-email names. `--reset-passwords` explicitly resets reserved test credentials; do not run it merely to update role names. Synthetic test emails cannot receive real mail.

Real email registration can run on localhost through Gmail SMTP once private credentials and a matching sender are configured. See [local Gmail setup](local-email-setup.md). Verification from another device requires that device to reach the configured `APP_URL`. Run a queue worker for decision notifications.
