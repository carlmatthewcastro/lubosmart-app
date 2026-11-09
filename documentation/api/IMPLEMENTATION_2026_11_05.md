# Mobile API v1 implementation and verification

Historical initial 24-operation report. The later [82-operation API and Flutter completion report](MOBILE_COMPLETION_2026_11_05.md) supersedes its current-scope statements; the evidence below records the earlier slice only.

Date: November 5, 2026, Asia/Manila. Implemented in the local working tree, preserving the existing testing/docs changes on `feat/platform-release-ui-onboarding`. No branch switch, commit, push, deployment, dependency install, schema change or migration against the configured database was performed.

## Delivered behavior

There are **24 method/path operations** under `/api/v1`: public eligible catalog/categories; expiring device-token login/logout; safe identity; Buyer addresses/cart/quotes/checkout/orders/cancellation; Seller parcel queues/preparation; Logistics configuration/unallocated pickup discovery; scoped delivery queues, custody/COD events and private proof.

The API shares the existing mutation handlers and checkout action with the website. API routes select JSON Resources rather than web redirects. API-only guards require actual bearer tokens, issued-role abilities and current operational eligibility. Existing store/company/assignment/coverage boundaries and ordered stock/finance transitions remain in force. Password/email/verification/role and restricted-status changes revoke tokens through User model events.

V1 JSON errors omit internal exception details even in debug mode. Fields are allow-listed rather than returning raw users/orders/files. Checkout requires reviewed totals and its existing UUID replay key; cart writes use absolute quantities; parcel events require their existing UUID replay protection. No mobile client, payment transfer or offline custody queue was introduced.

## Verification results

| Check                                    | Final result                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| New API feature suite                    | **44 passed, 260 assertions**                                                                 |
| Full backend suite including API         | **1,133 passed, 3 skipped, 0 failed; 9,058 assertions**                                       |
| Existing Seller/Buyer browser suite      | **17 passed**                                                                                 |
| Existing account-settings browser suite  | **9 passed**                                                                                  |
| Existing Logistics browser suite         | **19 passed**                                                                                 |
| Existing authentication browser suite    | **42 passed**                                                                                 |
| Existing general-dashboard browser suite | **45 passed**                                                                                 |
| New real-HTTP API smoke check            | **8 passed**                                                                                  |
| PHP Pint on changed/new PHP              | Passed                                                                                        |
| New HTTP script ESLint/Prettier          | Passed                                                                                        |
| OpenAPI/collection JSON and route checks | 24 operations match actual routes; local schema references resolve; Postman collection parses |

The 132 existing browser scenarios were rerun against the API-enabled backend; they do not use physical devices or real external services. The three backend skips remain the existing password-visibility cases delegated to browser verification. The real authentication browser run separately checks actual masking/reveal. No claim is made that every possible input is covered.

The new feature tests exercise valid/invalid/expired/insufficient tokens, all five roles, unapproved accounts, company restrictions, logout/revocation, safe errors, product eligibility, address ownership, absolute/variant cart lines, stale reviewed totals, multi-store privacy, checkout retry/cancellation and a cross-role pickup-to-delivery/proof/COD receipt/reconciliation journey. Foreign-company/Rider actions and early/skipped states are refused without their intended effects.

The HTTP smoke script uses a disposable local PHP server and actual fetch requests, with no browser cookie jar or Accept header. It verifies public JSON, token login, bearer identity, missing-token denial, cart/address mutation without session/CSRF dependencies, reviewed checkout/retry stock effects, cancellation-once, role denial and token revocation. It passes eight recorded scenarios. Postman itself and a physical mobile application were not executed.

## Reproduce and inspect evidence

Run the backend tests only after verifying the isolated test database/environment. This run explicitly used `APP_ENV=testing`, an absent temporary config-cache path, empty DB_URL, SQLite `:memory:`, array mail/cache/session and synchronous queues. Browser/HTTP scripts create separate guarded temporary SQLite databases and synthetic accounts; notifications and external services are faked. No actual money moved.

```powershell
php artisan test --compact tests/Feature/Api/MobileApiTest.php
php artisan test --compact
node tests/Frontend/mobile-api-http-check.cjs
```

Captured full-suite logs/JUnit, browser logs, route listing, copied final results and HTTP output are under `storage/app/mobile-api-verification-2026-11-05/`. Browser screenshot/PDF folders retain their existing locations. Hard-coded October date metadata inside older browser JSON is historical; this report identifies the actual run date. The Seller browser log contains two `/workspace/status` HTTP 401 messages while its final runtime/console assertions and process exit pass; the run is not a claim that all background HTTP requests succeeded.

OpenAPI was checked for JSON validity, matching operation paths/methods and resolvable local schema references. A separate full OpenAPI schema validator/code generator was not installed or executed.

## Remaining acceptance and API parity

Actual phone networking, secure token storage, camera/scanner permissions, multipart uploads on device, printed labels, physical cash/parcel/return handovers, complete accessibility, intended MySQL concurrency/load, backup restoration and live mail/OAuth/storage/queue/HTTPS acceptance remain outstanding.

The [endpoint guide](README.md) explicitly identifies remaining mobile API modules: enrollment/Google/recovery, inventory/waybill/vouchers, messaging/reviews, company/account administration, manual payout/Rider-pay/return/refund ledgers and reports. Their existing website workflows continue to work. This implementation is a functional first mobile API release, not full website parity or deployed acceptance.
