# Transactional email verification

Google-linked accounts can request Forgot password or set a LubosMart password in
Settings > Password after verifying an email code. Both Google sign-in and direct
email/password sign-in remain available. Invitation-only accounts still need their
activation flow. Codes expire after ten minutes, allow five verification attempts
and are limited to three requests per email per hour.

## Azure Docker checks

Run these read-only checks on the VM after an authorized deployment:

```bash
docker exec lubosmart-app-app-1 php artisan lubosmart:mail-status --check-connection
docker exec lubosmart-app-app-1 php artisan queue:failed
docker logs --tail 50 lubosmart-app-queue-1
```

The mail-status command checks the security mailer only. Verify privately that both
`MAIL_MAILER` and `MAIL_SECURITY_MAILER` select the intended SMTP mailer in the
deployed configuration. Other notifications use the default mailer. Both app and
queue containers need correct mail configuration. Delivery updates, listing reviews
and account status notices need a running queue worker. Do not post credentials,
environment dumps, codes, tokens or unredacted recipient logs.

## Inbox acceptance

SMTP authentication and automated tests do not prove live inbox delivery. Use
controlled test accounts/inboxes and existing workflows to verify:

- Registration and email re-verification codes, including resend.
- Forgot password for Google-linked and direct-sign-in accounts.
- Settings password setup/change and profile confirmation codes.
- Application approval and rejection notices.
- Account suspension, deactivation and reactivation notices.
- Rider invitation/activation messages.
- Delivery updates and seller listing review notices through the queue.

Check recipient, Inbox/Spam, sender, subject, HTML/plain text, expiry and links.
For Google accounts, finish the code/reset flow and confirm both sign-in methods
on the same account. Confirm consumed codes/tokens cannot be reused. Do not change
real account statuses or orders merely to test mail.

Public Forgot password intentionally returns the same message for unknown accounts,
throttled requests and sending failures. Inspect fresh application logs when a
controlled test fails; never infer inbox delivery from that message.

## Automated coverage and UI review

`tests/Feature/Notifications/TransactionalMailTest.php` exercises all seven
notification classes using Laravel's in-memory mail transport, verifies headers
and HTML/plain text, and completes password reset using the rendered email code
for both account types. Auth/settings tests cover verification and reset security.
These tests send no external email and do not certify production delivery.

Final local regression on 2026-11-09: 991 passed, 3 skipped (6,921 assertions)
across Auth, Settings, Notifications, Account, API, admin registration/management,
marketplace flow and logistics approval tests. PHP formatting passed. An initial
delivery-proof storage assertion failed while two test processes overlapped; the
isolated test and the final regression without concurrent Laravel tests passed.

2026-11-09 UI review: password settings now exposes the existing form for Google
accounts, with copy explaining both sign-in methods. Current password is omitted
only for initial setup. Branding, shared controls and email confirmation remain.
ESLint, TypeScript, Prettier and production build passed. Browser visual, keyboard,
zoom and screen-reader acceptance were not performed; WCAG compliance is unverified.
