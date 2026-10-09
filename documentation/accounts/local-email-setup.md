# Gmail SMTP and real registration on localhost

Real Gmail inbox delivery works from a local Laravel server with internet access. Hosting is not required to send mail. Configure private Gmail credentials and a matching sender, then check SMTP authentication and a real signup to confirm delivery.

1. Enable [Google 2-Step Verification and create an App Password](https://support.google.com/mail/answer/185833). Availability depends on your Google account; managed accounts may require administrator approval.
2. Enter these values privately in `.env`. Replace the examples with your full Gmail address and app password. Do not use your normal Google password or share the app password in chat.

```dotenv
APP_URL=http://localhost:8000
MAIL_MAILER=smtp
MAIL_SECURITY_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your-address@gmail.com
MAIL_PASSWORD=your-app-password-without-spaces
MAIL_FROM_ADDRESS=your-address@gmail.com
MAIL_FROM_NAME="LubosMart"
MAIL_REPLY_TO_ADDRESS=your-address@gmail.com
MAIL_REPLY_TO_NAME="LubosMart Support"
MAIL_LOGO_URL="https://lubosmart.app/email-logo.png"
```

These host and port values follow [Google's SMTP settings](https://support.google.com/mail/answer/7104828). Use the same Gmail address for username and sender unless you have configured an authorized sender alias.

See [Email branding and previews](email-branding.md) for production URLs, browser previews, sending each email type to your own inbox, and a future migration to authenticated domain sending.

3. Reload configuration and check authentication without sending any mail:

```powershell
php artisan config:clear
php artisan lubosmart:mail-status --check-connection
```

The command hides credentials. A successful connection confirms SMTP authentication, not inbox delivery. Complete a real registration and check Inbox, Spam, and Promotions to confirm delivery. Verification links and email codes send synchronously; their raw secrets are not serialized into persistent queues. Signup saves the account if sending fails and displays a clear resend message.

4. Run the app, assets, and notification worker. `composer run dev` starts these together, or run them in separate terminals:

On Windows, use `PHP_CLI_SERVER_WORKERS=1` in `.env` to avoid PHP's unsupported-fork warning.

```powershell
php artisan serve
npm.cmd run dev
php artisan queue:work --tries=3
```

Approval, rejection, and suspension notifications use the database queue. Restart a running worker after code or configuration changes. Production also needs the Laravel scheduler for expired-code cleanup.

## Verification links on local devices

`APP_URL` must match the reachable application URL. A link to `localhost:8000` works when opened on the same PC while the server is running. On another phone or computer, localhost refers to that device. To test across devices, use a reachable local-network URL with the server bound to the appropriate interface, or an HTTPS development tunnel, and update `APP_URL` accordingly. Google OAuth additionally requires its configured callback URI to match the application URL.

The verification token is stored hashed, expires in 24 hours, is consumed once, and is replaced on resend. It verifies only the email attached to that token and never logs another device into the account. The original verification page checks every five seconds and advances after successful verification elsewhere.

Local test-account inboxes are synthetic and are not intended to receive real email. Use an email address you control for the real signup test.
