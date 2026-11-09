# LubosMart API and Flutter client

The versioned Laravel API has **82 operations** under /api/v1. A separate Flutter application lives in [apps/mobile](../../apps/mobile/README.md), focused on Buyer, Seller and Rider. Existing Laravel/Inertia pages and the shared database remain in place.

Start with the [role coverage](ROLE_COVERAGE.md), [endpoint inventory](ENDPOINTS.md), [OpenAPI contract](openapi.json), [Postman collection](lubosmart-v1.postman_collection.json) and [connection guide](MOBILE_CONNECTION_GUIDE.md). The [completion report](MOBILE_COMPLETION_2026_11_05.md) records passing checks and native build limitations. The earlier [initial implementation report](IMPLEMENTATION_2026_11_05.md) describes the historical 24-operation slice.

## Authentication and boundaries

Use Authorization: Bearer with per-device Sanctum tokens. V1 is stateless: browser sessions and CSRF cookies alone do not authenticate it. Existing /api/account routes keep their web authentication boundary.

POST /auth/session accepts email/password/device_name. Approved operational accounts receive a 30-day token (configured server-side); unverified or pending Buyer/Seller/Rider accounts receive a restricted one-hour onboarding token. Enrollment and OTP verification do not bypass approval. POST /onboarding/promote exchanges an eligible onboarding token; replace the stored token on every issuance. DELETE /onboarding/token revokes restricted access. Existing /auth/tokens remains the operational-only login endpoint, including previously supported company/Admin roles.

POST /auth/google verifies a provider access token. Unknown identities receive registration_required without a device token, then complete multipart registration using google_access_token. The server verifies email identity again and prohibits password fields in this flow. Existing emails cannot be silently linked. Company-invited Riders must activate the invitation through its existing flow.

Password reset and sensitive account/status changes revoke device tokens. Changed documents/partner details can require re-review. Expiry requires sign-in again; there is no refresh token. Use OS secure storage and never log tokens. Operational eligibility, role, center membership and resource ownership are checked on each request.

## Response details

JSON resources use data; resource pagination adds root links/meta. New role read paginators may instead use data.data with data.current_page/last_page/next_page_url. The Flutter rows helper supports both. GET /locations returns a raw array. Quotes retain options. Mutations may return message rather than a resource; token deletion returns 204. Proof/evidence return private binary files, report export returns CSV. OpenAPI includes all routes; RoleResponse intentionally remains flexible for newer read projections, so it is not a fully typed generated SDK contract.

Errors contain safe message/code and validation errors; statuses include 401/403/404/409/422/429. Responses use private/no-store. Handle revoked credentials and Retry-After. Public and authenticated requests are throttled.

Resource money is generally a two-decimal peso string. Shipping quotes can expose numeric pesos and fee_cents; financial reports use explicitly named integer-cent fields. The Flutter client totals money in centavos. Parent order totals differ from a single parcel's COD amount; shipping is excluded from commission.

## Writes and retries

Checkout shares the website action, locks and reviewed totals. Preserve checkout_key across uncertain retries; delivery and waybill actions use request_key. A new UUID means a new action. Cart quantities are absolute. Seller inventory updates require expected_stock; existing variant rows also require their own expected_stock. Return receipt requires physical condition and an explicit restock decision; damaged items cannot be automatically restocked.

JSON writes use their documented HTTP method. For uploaded files use multipart POST; PUT/PATCH additionally supply \_method=PUT/PATCH so PHP parses files. Waybill audit requires packages=1 and request_key; the client creates the printable PDF from the authorized parcel response.

## Regenerate and validate

```powershell
node scripts/generate-mobile-api-contract.cjs
php artisan test tests/Feature/Api
node tests/Frontend/mobile-api-http-check.cjs
```

The generator compares every documented route to Laravel's route list, checks local schema references and recreates the parameterized Postman collection and endpoint inventory. This is a structural consistency check, not a full external OpenAPI validator. Postman request bodies are editable templates: fill required fields and role-specific documents, select files, and set IDs from your own test resources. Do not run the whole collection blindly against real data or export populated secrets.

The mobile scope does not include every Admin/Logistics website feature. See [coverage and remaining acceptance](ROLE_COVERAGE.md).
