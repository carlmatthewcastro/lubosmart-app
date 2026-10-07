# Testing the LubosMart role workflows

The current working branch is docs/project-handbook. These changes have not been pushed, merged or deployed. Start XAMPP MySQL before using the local website; the automated suite uses isolated in-memory SQLite.

## Local setup

From the project root, using your existing .env:

```powershell
php artisan migrate
php artisan db:seed --class=MarketplaceCategorySeeder
php artisan lubosmart:test-accounts
```

The last command creates missing buyer, seller, rider, logistics and admin test accounts at `lubosmart-ROLE@testing.app` and is restricted to local/testing environments. Credentials are saved in the private, Git-ignored [login document](../../storage/app/private/local-test-accounts.md). Restarting `artisan serve` preserves accounts and passwords. Repeat setup reuses accounts, preserves status/credentials, and avoids duplicate stores/centers. Legacy test email addresses are adopted without duplicating user records. Add `--demo` to create three sample products, a synthetic buyer address, and rider membership for local workflow testing; no sample transactions are generated. Separately register fresh applicants to exercise approval.

If you forgot the local test password, explicitly reset the five reserved accounts:

```powershell
php artisan lubosmart:test-accounts --reset-passwords
```

This prints and saves a new random password for accounts marked Created or Password reset, rotates their remember tokens, and preserves roles, account status and unrelated users. The private guide updates automatically. The local password metadata is needed to display known credentials; password hashes cannot be reversed. A conflicting role at a reserved test email produces a clear error and rolls back the command.

Run in separate terminals:

```powershell
php artisan serve
```

```powershell
npm.cmd run dev
```

```powershell
php artisan queue:work --tries=3
```

Open http://localhost:8000. Use npm.cmd/npx.cmd on Windows if PowerShell blocks unsigned npm.ps1 scripts. Do not change system execution policy.

## Manual journeys

1. Sign in as each test role and check its dashboard. A buyer visiting /dashboard/admin must receive 403. Counts/activity must include only the signed-in user's store, orders or center.
2. Register a fresh buyer and verify email. With MAIL_MAILER=log, the verification link is in storage/logs/laravel.log; this does not send email. Use SMTP when testing actual delivery. The new buyer reaches its own dashboard without an ID application, and adds an address only when needed.
3. Register a fresh seller and verify email. Complete the application steps, save a partial draft, sign out/back in, and confirm progress resumes. Upload synthetic private documents, review the final summary, and submit. Sign in as test admin to approve or request changes. Pending partner accounts see the application instead of an operational dashboard.
4. Repeat with a seller, choosing a department and uploading a business permit. Approval approves the store. Reject another application with a reason, then correct and resubmit it.
5. Register logistics with business/permit details. Admin approval creates the center and its membership. Register a courier, select that center, and upload the required vehicle and identity documents. Only logistics for that center can approve it.
6. Suspend a test buyer through admin Manage accounts while its session is open elsewhere. Its next protected request must fail. Reactivate with an audit reason. Logistics manages only approved riders from its center.
7. Check Google login/register, cancellation and provider failure with actual configured OAuth credentials. Existing password accounts cannot be auto-linked by matching email.
8. Check password recovery, remember-me, validation errors, logout, keyboard focus and mobile layouts. Test documents must not be accessible to other applicants.

For catalog → shopping bag → COD checkout → seller preparation → center receipt/assignment → rider proof/collection → cash receipt/reconciliation, follow the complete [UI workflow](../design/ui-workflow.md). Order conversations, cancellation before preparation, printable waybills, inventory/photo editing, and reports are connected. Courier earnings, seller settlement, returns, variants, vouchers, and live chat remain future work.

## Checks

Validation on 2026-10-07: 130 PHP tests passed (748 assertions), covering the full role journey, checkout retries, stock/ownership boundaries, proof uploads, cancellation, conversations, financial settings, and persistent credentials. TypeScript, ESLint, and the production frontend build passed. Changed PHP files pass Pint; full Pint still reports pre-existing formatting in unrelated files. Local MySQL migrations and test provisioning succeeded. Chrome completed a synthetic order through all five roles; desktop/mobile pages and mobile sidebar behavior were checked. Actual OAuth/mail/address services, MySQL concurrency under load, and Docker runtime remain environment acceptance tasks.

```powershell
php artisan test
php vendor/bin/pint --test
npx.cmd tsc --noEmit
npx.cmd eslint resources/js
npm.cmd run build
```

Do not overwrite .env, regenerate an established key, use migrate:fresh, or roll back populated foundation tables. Use [deployment](../operations/deployment.md) and [release readiness](../operations/release-readiness.md) before updating the live Azure site. Apply the new additive registration migration before activating code that needs its columns. Production uses the Compose queue service for review emails. For local uploads larger than XAMPP's defaults, set upload_max_filesize=5M and post_max_size=20M in the PHP configuration used by the server and restart it; production Docker sets these limits.
