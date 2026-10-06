# Google OAuth integration and polish

The existing server-side Socialite authorization-code flow is the starting point. Do not add a second Google authentication library or put the client secret in React. This guide separates configuration that can be completed now from changes needed before release.

## Existing integration map

| File | Current responsibility |
| --- | --- |
| `composer.json` / lock | Socialite is already a dependency; use `composer install`, no duplicate installation |
| `config/services.php` | Reads Google client ID/secret and redirect URI; fallback app URL plus callback |
| `.env.example` | Google variable placeholders already exist |
| `routes/auth.php` | Guest `POST /auth/google/redirect` and `GET /auth/google/callback` |
| `GoogleAuthController` | Validates public role/store, stores session intent, redirects through Inertia, fetches Google identity, creates/links user, logs in and regenerates session |
| `2026_10_05_143122_add_google_id_to_users_table.php` | Unique nullable Google ID |
| `resources/js/pages/welcome.tsx` | Homepage modal Google button using Inertia form POST |
| `tests/Feature/Auth/GoogleAuthTest.php` | Existing fake-provider tests, including automatic same-email linking |

Standalone `/login` and `/register` pages do not yet share the modal's Google/role workflow. The initiation handler currently requires a role and seller store details even for sign-in. The callback reads only the current session's `google_registration` and redirects to one dashboard.

## 1. Prepare Google configuration

In Google Cloud Console, select a project and configure **Google Auth Platform** (branding, audience and data access). Console labels may evolve; follow the current [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server).

Use an External audience if buyers/sellers outside your organization need access. During Testing, add the demonstration accounts as test users. Provide support contact and application/domain details. Before public launch, review publishing and verification requirements shown for your app/scopes; do not assume every sign-in-only project requires sensitive-scope review.

Create an OAuth client with application type **Web application**. Prefer separate local/staging/production clients. For local `php artisan serve`, register:

```text
http://localhost:8000/auth/google/callback
```

For the repository's documented production domain, register:

```text
https://lubosmart.app/auth/google/callback
```

Match scheme, hostname, port, path and trailing slash exactly. If developing under an XAMPP hostname/subdirectory, register that actual callback and use the same browser host throughout. `localhost` and `127.0.0.1` are different hosts. Use one canonical production host; redirect `www` before starting the flow.

The current server redirect flow does not need a Google browser SDK or JavaScript origin configuration for that SDK. Keep scopes limited to identity/profile/email; no Drive, contacts, payments or offline access is needed.

## 2. Set environment values

Local example (placeholders, never commit credentials):

```dotenv
APP_URL=http://localhost:8000
GOOGLE_CLIENT_ID=replace-with-local-client-id
GOOGLE_CLIENT_SECRET=replace-with-local-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=false
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

Keep `SESSION_DOMAIN` unset/null for a host-only cookie unless a tested shared-domain requirement exists. Use a real, unchanged local `APP_KEY` and migrated session table. Run:

```powershell
composer install
php artisan migrate
php artisan config:clear
php artisan route:list --path=auth/google
php artisan serve
```

Run `npm ci` and `npm run dev` in a separate terminal if dependencies/assets need starting. Use the application URL, not Vite's asset-server URL, in the browser.

Production uses production client credentials, `APP_URL=https://lubosmart.app`, the HTTPS callback, `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, HTTP-only cookies and SameSite Lax. Configure these on the VM, not just Windows. The database session driver needs the production session table and stable database storage.

The current bootstrap trusts proxy headers and Compose exposes app port 80 only internally. Preserve that network boundary; configure trusted proxies deliberately if topology changes. Stable HTTPS/cookie host settings matter when returning from Google.

## 3. Keep the Inertia redirect contract

The current initiation route is a **POST** that validates application intent. Do not link to it with a GET anchor without changing the route. For the current registration contract:

```tsx
const google = useForm({
    role: 'buyer',
    store_name: '',
    store_description: '',
});

<button
    type="button"
    disabled={google.processing}
    onClick={() => google.post(route('auth.google.redirect'))}
>
    Continue with Google
</button>
```

For seller registration, copy the validated store fields from the shared registration form. Surface `google.errors` and callback errors; avoid silent failures. The server's `Inertia::location(...)` causes a full browser navigation to Google; this behavior is supported by [Inertia external redirects](https://inertiajs.com/docs/v2/the-basics/redirects).

Retain stateful `Socialite::driver('google')->redirect()` and `->user()` on the server; never add `stateless()` to conceal lost sessions. Socialite configuration and provider retrieval are described in [Laravel 12 Socialite](https://laravel.com/docs/12.x/socialite).

## 4. Separate login, registration and linking

Proposed change: store a short-lived server-validated intent (`login`, `register`, `link`), creation time and allowed return destination. Preserve Socialite's own `state` protection rather than replacing its reserved parameters.

| Intent | Expected behavior |
| --- | --- |
| Login | No role/store input; find the linked Google ID; existing account retains role/status; unknown identity proceeds to explicit onboarding |
| Register | Allow buyer/seller/rider only; new user remains pending; complete remaining application fields |
| Link | Separate authenticated initiation/callback routes with recent local reauthentication; bind callback to initiating user and one-time intent |

The existing callback is guest-only. An authenticated linking flow needs its own route/middleware design, not reuse of that guest route. Expire stored intent, consume once, reject callbacks without a valid session, and show a restart action. The current single intent slot means starting OAuth in two tabs can invalidate one attempt; initially explain/restart safely rather than accepting mismatched state.

Recommended callback decision order:

1. Handle provider denial with a clear cancellation message and fresh retry option.
2. Validate intent/session and call Socialite `user()` so state and code exchange are enforced.
3. Require a non-empty provider ID, valid email within schema limits and verified email signal. Keep name within the 160-character database limit; do not trust profile lengths.
4. Find by unique Google ID first. Do not replace role, status or local email from callback/request values.
5. If no provider match but local email already exists, require proof of local-account access through sign-in or a fresh mailbox challenge before linking. Do not log in by email match alone.
6. If both are new, transactionally create a pending identity/application; collect missing fields in onboarding. Seller store remains pending.
7. Enforce suspension and application access rules. Pending accounts land on onboarding/status; approved accounts land on their authorized destination.
8. Commit, emit appropriate events once, regenerate session and redirect. Never retain access/refresh tokens for sign-in-only use.

The current same-email auto-link and corresponding test should be replaced together. Google warns that a verified email on a third-party domain does not always establish current ownership; this supports the conservative linking policy above. [Google backend identity guidance](https://developers.google.com/identity/sign-in/web/backend-auth).

Use database uniqueness as the final guard for concurrent new-account/link attempts. Row locks on absent records are not sufficient on every database; handle duplicate-key races by reloading/revalidating the identity without assigning it to the wrong user. Bound name/store-description input and keep registration rules consistent between both paths.

## 5. Handle failure and polish the UI

Catch state failures (`InvalidStateException`) and provider/network failures around identity retrieval; report sanitized diagnostic context and show a retry message. Catch specific errors rather than hiding every exception as cancellation. Do not log authorization codes, tokens, secrets or full provider profiles. Include a neutral configuration-unavailable message instead of telling production users to edit `.env`.

Use the shared auth form on all entry points; show required seller fields only during registration/onboarding. Disable duplicate submissions and explain approval after Google verification. Reopen/show the modal or an inline banner after callback errors; test this after a full browser navigation. Include accessible labels, keyboard focus management, focus restoration and mobile spacing. Preserve sign-in through local credentials when the provider is unavailable.

## 6. Verify locally, then deploy

Run the existing OAuth suite:

```powershell
php artisan test tests/Feature/Auth/GoogleAuthTest.php
```

Add coverage when behavior changes for pending creation, no privileged role grants, explicit linking proof, suspension, expired/missing intent, conflicting Google IDs, duplicate callback/race handling, provider failure and existing-role preservation. Fakes establish application behavior; they do not prove real Google credentials, cookies or proxy settings. Manually exercise a real test account through localhost and staging.

After reviewed code is released, update the production environment using [deployment](deployment.md), recreate the app container, clear/rebuild config cache as appropriate, and confirm callback route/migration presence. Use a real designated account on the canonical HTTPS domain and check that cancellation, pending landing, approved access and logout work. Configuration alone does not resolve the release gaps listed above.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `redirect_uri_mismatch` | Console URI versus actual configured scheme/host/port/path/trailing slash; correct client/environment |
| Invalid state | Cookie returned on callback, same host, database sessions, stable app key, Lax cookie, expiration, multiple tabs |
| HTTP 419 | CSRF/session cookies and request host; retain CSRF middleware |
| Google disabled | Both credentials present in app container; config refreshed; never print their values |
| Access denied | Test audience/accounts and publishing configuration; provider cancellation |
| Seller validation on login | Existing flow conflates login/registration; implement intent separation |
| HTTP 500 after consent | Missing migration, provider timeout/state error, overlong profile, uniqueness conflict; inspect redacted logs |
| Wrong dashboard | Existing generic destination; implement authorized role/pending resolver |
