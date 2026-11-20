<div align="center">

# 🔒 Transactional email verification

**SMTP checks, inbox acceptance and recorded mail coverage.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Deployment](README.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This runbook covers transactional mail checks and controlled inbox acceptance. It is for operators and testers verifying an authorized installation without exposing credentials or changing real customer workflows.

<a id="how-it-works"></a>

## 🔄 How it works

Google-linked accounts can request Forgot password or set a LubosMart password in
Settings > Password after verifying an email code. Both Google sign-in and direct
email/password sign-in remain available. Invitation-only accounts still need their
activation flow. Codes expire after ten minutes, allow five verification attempts
and are limited to three requests per email per hour.

<a id="azure-docker-checks"></a>

<a id="commands"></a>

## ⚙️ Commands

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

<a id="inbox-acceptance"></a>

## 🧪 Inbox acceptance

SMTP authentication and automated tests do not prove live inbox delivery. Use
controlled test accounts/inboxes and existing workflows to verify:

1. Registration and email re-verification codes, including resend.
2. Forgot password for Google-linked and direct-sign-in accounts.
3. Settings password setup/change and profile confirmation codes.
4. Application approval and rejection notices.
5. Account suspension, deactivation and reactivation notices.
6. Rider invitation/activation messages.
7. Delivery updates and Seller listing review notices through the queue.

Check recipient, Inbox/Spam, sender, subject, HTML/plain text, expiry and links.
For Google accounts, finish the code/reset flow and confirm both sign-in methods
on the same account. Confirm consumed codes/tokens cannot be reused. Do not change
real account statuses or orders merely to test mail.

Public Forgot password intentionally returns the same message for unknown accounts,
throttled requests and sending failures. Inspect fresh application logs when a
controlled test fails; never infer inbox delivery from that message.

<a id="automated-coverage-and-ui-review"></a>

## 🧪 Automated coverage and UI review

`tests/Feature/Notifications/TransactionalMailTest.php` exercises all seven
notification classes using Laravel's in-memory mail transport, verifies headers
and HTML/plain text, and completes password reset using the rendered email code
for both account types. Auth/settings tests cover verification and reset security.
These tests send no external email and do not certify production delivery.

Final local regression on 2026-11-09: 991 passed, 3 skipped (6,921 assertions)
across Auth, Settings, Notifications, Account, API, Admin registration/management,
marketplace flow and Logistics approval tests. PHP formatting passed. An initial
delivery-proof storage assertion failed while two test processes overlapped; the
isolated test and the final regression without concurrent Laravel tests passed.

2026-11-09 UI review: password settings now exposes the existing form for Google
accounts, with copy explaining both sign-in methods. Current password is omitted
only for initial setup. Branding, shared controls and email confirmation remain.
ESLint, TypeScript, Prettier and production build passed. Browser visual, keyboard,
zoom and screen-reader acceptance were not performed; WCAG compliance is unverified.

---

<div align="center">

**LubosMart** · Transactional email verification · [Back to Documentation](../README.md)

</div>
