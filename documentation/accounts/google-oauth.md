# Google sign-in

Google supplies a provider identity, verified email, and display name. It never supplies a trusted application role, approval status, address, or business details. Socialite retains OAuth state validation.

| Action | Behavior |
| --- | --- |
| Create account | Requires selected buyer/seller/courier/sorting-center role and Terms/Privacy consent. A new account is email verified and incomplete, then opens its application. |
| Log in | An unknown email creates no account and prompts the user to choose a role at signup. |
| Existing account with matching verified email | Links Google without a duplicate, preserving password, role, and approval decision. An unverified signup becomes incomplete. |
| Existing Google identity | Signs into that same record; request/provider role and status values are ignored. Google cannot verify a locally changed email unless the verified provider email matches it. |
| Conflicting Google identity | Refused with support guidance. |
| Suspended or deactivated account | Sign-in blocked. |

The server stores the validated login/register intent for 15 minutes and consumes it on callback. Cancelled, expired, invalid-state, and unverified-provider-email attempts return a recoverable form error. New Google-only accounts have a null local password and must use Continue with Google. Older roleless Google accounts can choose a public role once; existing assigned roles cannot be switched through this page.

## Local configuration

Use the same hostname throughout the browser flow and set these privately in `.env`:

```dotenv
APP_URL=http://localhost:8000
GOOGLE_CLIENT_ID=<OAuth web client ID>
GOOGLE_CLIENT_SECRET=<OAuth web client secret>
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

Register that exact callback in the Google OAuth web client. For production, use the HTTPS application hostname and its exact callback. After editing environment values, run `php artisan config:clear`. Keep credentials out of chat, source control, logs, and screenshots.

Do not alternate `localhost` and `127.0.0.1` during OAuth: callback cookies must belong to the initiating hostname. Use database sessions and a stable application key. Google must allow the account in the configured test audience. Missing client credentials disable the button with email/password guidance. Automated tests fake Google; a real consent/callback check requires valid credentials and the configured browser origin.
