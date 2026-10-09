# LubosMart transactional emails

Verification, application decisions, account status changes, and email codes share the LubosMart header, purple buttons, team signature, and automated-message footer. Order and listing notifications use the same branding. Laravel Markdown produces both HTML and plain text. First names come from `user_profiles.first_name`; older accounts fall back to the first part of `users.name`, then `Hello!` if no name is available.

## Configure the sender and public links

The local `.env` uses `APP_ENV=local` and `APP_URL=http://localhost:8000`. Keep that URL only for local testing. Set these values in the **production environment**, where the app is hosted:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_NAME="LubosMart"
APP_URL=https://lubosmart.app
MAIL_FROM_NAME="LubosMart"
MAIL_FROM_ADDRESS="lubosmart.app@gmail.com"
MAIL_REPLY_TO_ADDRESS="lubosmart.app@gmail.com"
MAIL_REPLY_TO_NAME="LubosMart Support"
MAIL_LOGO_URL="https://lubosmart.app/email-logo.png"
```

While using Gmail SMTP, use your authenticated Gmail mailbox for `MAIL_USERNAME` and `MAIL_FROM_ADDRESS` (or an authorized sender alias). The current local Reply-To matches the existing Gmail sender. Monitor that inbox, or set Reply-To to another real support inbox you read. Do not switch From to `noreply@lubosmart.app` until domain sending is authenticated.

The email logo is `public/email-logo.png`, a 144 × 136 PNG (~11 KB) exported from the existing `public/logo.svg`. It displays at 56 × 53 pixels. Deploy that asset with the application and open its absolute HTTPS URL without signing in to check it loads. You may use another public HTTPS URL via `MAIL_LOGO_URL`. The header always includes **LubosMart** as text, even when images are blocked. Public availability of the production asset could not be confirmed from this workspace.

Routes and `url()` use the origin configured in `APP_URL`, including when a notification is sent during an HTTP request. Set it to the externally reachable URL. Approved users receive `/dashboard/{role}`, rejected users receive `/application`, and verification emails retain their one-time verification link. Restricted accounts receive the monitored support address because they cannot open in-app support.

After changing `.env`, run:

```powershell
php artisan config:clear
php artisan view:clear
php artisan queue:restart
```

Production deployments that cache configuration should then run `php artisan config:cache`. Ensure a queue worker is running for application decisions and account status notifications. Verification and security codes remain synchronous so their raw secrets do not enter persistent queues. See [Gmail SMTP setup](local-email-setup.md) for private credentials and connection checks.

## Preview every email without sending

Start the local app with `php artisan serve`, then open `php artisan tinker` in another terminal. Paste the following code. It uses an unsaved sample recipient and creates private HTML/text files, without changing accounts or sending mail. The verification link and code below are samples and cannot verify an account or change a password.

```php
$recipient = new \App\Models\User;
$recipient->forceFill(['name' => 'Maria Santos', 'email' => 'your-address@example.com', 'role' => 'seller']);
$recipient->first_name = 'Maria';
$samples = [
    'verify' => new \App\Notifications\VerifyAccountEmail(route('verification.verify', ['token' => str_repeat('a', 64)])),
    'approved' => new \App\Notifications\ApplicationReviewed('approved', null),
    'rejected' => new \App\Notifications\ApplicationReviewed('rejected', 'Please upload a clearer photo of your ID.'),
    'suspended' => new \App\Notifications\AccountStatusChanged('suspended', 'We need to review your application documents.'),
    'deactivated' => new \App\Notifications\AccountStatusChanged('deactivated', 'Requested by the account owner.'),
    'reactivated' => new \App\Notifications\AccountStatusChanged('approved', 'Your account review is complete.'),
    'password-code' => new \App\Notifications\EmailSecurityCode('123456', 'password'),
    'profile-code' => new \App\Notifications\EmailSecurityCode('123456', 'profile'),
];
// Local browser preview only: load the logo from the running local server.
config(['mail.logo_url' => url('/email-logo.png')]);
$directory = storage_path('app/private/mail-previews');
\Illuminate\Support\Facades\File::ensureDirectoryExists($directory);
foreach ($samples as $type => $notification) {
    $message = $notification->toMail($recipient);
    file_put_contents($directory.'/'.$type.'.html', (string) $message->render());
    file_put_contents($directory.'/'.$type.'.txt', (string) app(\Illuminate\Mail\Markdown::class)->renderText($message->markdown, $message->data()));
}
$directory;
```

Open `storage/app/private/mail-previews/approved.html` in a browser (or use `Invoke-Item .\storage\app\private\mail-previews\approved.html` in PowerShell). Open the other files to check each type. Check a narrow viewport around 375 pixels, disable images to confirm the text brand remains visible, and compare each `.txt` file. These files are private; there is no public preview endpoint containing real tokens or account data.

## Send each sample to your inbox

In the same Tinker session, replace the address below with your own inbox. Restore the public logo URL so the receiving email client can load it, then send a selected sample:

```php
$recipient->email = 'your-real-address@example.com';
config(['mail.logo_url' => 'https://lubosmart.app/email-logo.png']);
$recipient->notifyNow($samples['approved']);
```

Repeat with `verify`, `rejected`, `suspended`, `deactivated`, `reactivated`, `password-code`, or `profile-code`. To send every sample, run:

```php
foreach ($samples as $notification) { $recipient->notifyNow($notification); }
```

`notifyNow` intentionally sends these previews immediately, bypassing the queue. Check From, Reply-To, subjects, Inbox/Spam, both body formats, and that button and fallback URLs match. The sample verification link and code are intentionally inactive. Do not use a sample email to test a real password reset.

For a working verification email, register a test account using an inbox you control, or resend for an existing **unverified** account through the verification screen. For a working password code, request it through Forgot password or Settings → Password. Existing server logic enforces the 24-hour verification expiry and 10-minute code expiry. Approval/rejection/suspension flows can be tested through the admin UI using a test account. Sending preview notifications does not change its status.

Run the automated email and account-flow checks:

```powershell
php artisan test --compact tests/Feature/Notifications/TransactionalMailTest.php
php artisan test --compact tests/Feature/Auth/EmailVerificationTest.php tests/Feature/Auth/EmailCodeTest.php tests/Feature/Auth/PasswordResetTest.php tests/Feature/Auth/ApplicationWorkflowTest.php tests/Feature/LogisticsApprovalChainTest.php
```

## Reduce spam and move to domain sending later

Branding fixes the confusing sender and content; it cannot guarantee inbox placement. Gmail also considers authentication and sending practices. In Gmail, open a delivered email → **Show original** and inspect SPF, DKIM, and DMARC results and alignment before diagnosing the cause of spam placement. Follow [Google's sender guidelines](https://support.google.com/mail/answer/81126?hl=en).

Keep one consistent From identity and a monitored Reply-To. Use direct HTTPS links, avoid shorteners and tracking redirects for security links, keep the small logo and mostly text content, and send transactional messages only for actual account events. Check bounces and spam reports. Production links must point to `https://lubosmart.app`; localhost links in local previews are expected.

The following migration is a future task; this change does not create provider accounts, change DNS, or replace Gmail SMTP:

1. Choose Brevo, Resend, or SendGrid and add `lubosmart.app` as an authenticated sending domain. Configure a support mailbox or forwarding address you can read. Domain verification for sending does not automatically create an inbound support mailbox.
2. Copy the exact DNS records supplied by the provider. **SPF** authorizes sending infrastructure for the envelope/Return-Path domain; **DKIM** verifies the message signature for your domain. Providers may use a sending subdomain and CNAMEs instead of a new root SPF TXT record. Keep only one SPF record per hostname and preserve existing authorized senders. Brevo's flow supplies its verification code, DKIM and DMARC records; follow its instructions for SPF rather than inventing an include. See [Brevo authentication](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC), [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction), and [SendGrid domain authentication](https://www.twilio.com/docs/sendgrid/api-reference/domain-authentication/authenticate-a-domain).
3. Configure **DMARC** at `_dmarc.lubosmart.app`. DMARC checks that the visible From domain aligns with a passing SPF or DKIM domain. Start with a monitoring policy such as `v=DMARC1; p=none` and add `rua` only after setting up a mailbox/report service to receive reports. Review all legitimate senders before tightening to `quarantine` or `reject`; do not add a second DMARC record if one already exists. See [SendGrid's DMARC explanation](https://www.twilio.com/docs/sendgrid/ui/sending-email/dmarc) and Google's guidelines above.
4. Wait for the provider's domain checks to pass. Add its private SMTP credentials to production mail settings, or configure its supported Laravel API transport. Set **both** `MAIL_MAILER` and `MAIL_SECURITY_MAILER` to the intended provider/mailer so verification and codes migrate too. Keep security delivery synchronous.
5. Set `MAIL_FROM_ADDRESS=noreply@lubosmart.app`, `MAIL_FROM_NAME="LubosMart"`, and `MAIL_REPLY_TO_ADDRESS` to the real support inbox. Reload/cache configuration, restart workers, send a small set of test messages, and inspect their authentication headers and delivery. Correctly authenticated sending improves trust but still does not guarantee Inbox placement.
