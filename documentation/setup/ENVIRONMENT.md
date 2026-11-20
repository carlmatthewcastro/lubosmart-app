<div align="center">

# ⚙️ Environment-variable reference

**Laravel environment settings and Flutter compile-time definitions.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Mail verification](../deployment/MAIL_VERIFICATION.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This reference covers environment-variable names and configuration boundaries. It is for developers and operators configuring an installation while preserving keys, data and private uploads.

<a id="how-it-works"></a>

## 🔄 How it works

Set values privately in the intended installation. This reference lists names, not credentials. Preserve existing `APP_KEY`, database contents and private uploads. Flutter compile-time definitions are separate from Laravel `.env` settings.

<a id="environment-variables"></a>

## ⚙️ Environment variables

| Area             | Names and purpose                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application      | `APP_ENV`, `APP_DEBUG`, `APP_URL`, `APP_KEY`: environment, diagnostics, generated URLs and encryption key                                               |
| Session          | `SESSION_DRIVER`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`: storage and browser cookie scope; the example uses database sessions                       |
| Database         | `DB_CONNECTION`; MySQL also uses `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`; Compose requires `DB_ROOT_PASSWORD`                 |
| Queue            | `QUEUE_CONNECTION`: the example uses database jobs; a worker processes operational notifications                                                        |
| Mail             | `MAIL_MAILER`, `MAIL_SECURITY_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` |
| Google web login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`                                                                                       |
| Flutter          | `API_BASE_URL`, ending in `/api/v1`; optional `GOOGLE_SERVER_CLIENT_ID` for mobile Google login                                                         |

<a id="mail-and-google-login"></a>

<a id="configuration"></a>

## ⚙️ Configuration

Configure `MAIL_MAILER=smtp` and `MAIL_SECURITY_MAILER=smtp` with the provider's authorized sender, host, port and scheme. Security mail is synchronous; approval/status mail uses the queue. The [mail verification runbook](../deployment/MAIL_VERIFICATION.md) distinguishes provider connection from actual inbox acceptance. Do not paste real credentials into reports.

Google's registered redirect must exactly match `GOOGLE_REDIRECT_URI`. The existing local example is `http://localhost:8000/auth/google/callback`; use the same hostname throughout login. Mobile Google sign-in additionally needs platform OAuth configuration, described in the [mobile README](../../mobile/README.md#authentication-and-configuration).

The example environment defaults to SQLite, database sessions and database queues. Defaults in Laravel configuration can differ when an environment variable is absent. Provider availability, OAuth console settings and live environment values were not verified in this cleanup.

Sources: [example environment](../../web/.env.example), [database configuration](../../web/config/database.php), [mail configuration](../../web/config/mail.php), [provider configuration](../../web/config/services.php), [Compose definition](../../web/docker-compose.yml).

<a id="related-documentation"></a>

## 📚 Related documentation

[Setup index](README.md)

---

<div align="center">

**LubosMart** · Environment-variable reference · [Back to Documentation](../README.md)

</div>
