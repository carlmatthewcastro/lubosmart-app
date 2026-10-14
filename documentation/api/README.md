# API

**Planned:** a Laravel REST API using JSON over HTTPS under `/api/v1`, secured by Laravel Sanctum. Sanctum is not installed, and `routes/api.php` is absent in the reviewed checkout. Existing JSON responses are still web endpoints.

## Target design

Keep Laravel, React/Inertia, MySQL and the existing workflows. Add API controllers that call the same actions/services as web controllers. Use Form Requests for validation, Resources for safe JSON, Policies/Gates for permission, and rate limits for sensitive endpoints.

| Client | Planned authentication |
| --- | --- |
| First-party browser | Laravel session cookies with Sanctum stateful authentication and CSRF protection |
| Mobile/external client | Per-device Sanctum bearer token with limited abilities, explicit expiry and revocation |

Operational tokens require verified, approved accounts. Recheck restrictions, ownership and center eligibility on every request. Preserve existing restricted browser onboarding; define a separate mobile onboarding contract if needed. Token abilities do not replace authorization.

## Proposed endpoint examples

These paths are examples, not implemented routes. All begin with `/api/v1`.

| Module | Proposed routes |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/tokens`, `DELETE /auth/token`, `GET /me` |
| Catalog | `GET /products`, `GET /products/{product}` |
| Buyer | `GET /cart`, `PUT /cart/items/{product}`, `POST /orders`, `GET /orders` |
| Seller | `GET, POST /seller/products`, `PATCH /seller/products/{product}`, `GET /seller/orders` |
| Rider / Courier | `GET /courier/deliveries`, `POST /courier/deliveries/{delivery}/events` |
| Sorting Center | `GET /sorting-center/parcels`, `POST /sorting-center/parcels/{delivery}/events` |
| Admin | `GET /admin/applications`, `PATCH /admin/applications/{application}`, `PATCH /admin/accounts/{user}` |

## Responses and security

Use a `data` wrapper for successful Resources and `links`/`meta` for pagination. Errors should provide a safe message, code and validation field errors. Use 200/201/204 for success; 401/403/404 for access/resource failures; 409 for stale state; 422 for validation; 429 for throttling. Browser CSRF failures need a JSON recovery path.

Return money as decimal strings or documented integer centavos. Do not expose passwords, token hashes, private paths, bank information or unrelated users' data. Return a new token once; use OS secure storage for mobile clients. Browser clients should use secure session cookies rather than localStorage bearer tokens. Logout revokes the current token; password resets and account restrictions must revoke affected tokens too.

## Migration checklist

- [ ] Install Sanctum, add token storage and register versioned API routes alongside web routes.
- [ ] Configure cookie/CSRF/CORS behavior and token eligibility/expiry/revocation.
- [ ] Extract shared controller operations while preserving checkout retries, locks, approvals and parcel/COD transitions.
- [ ] Add validated Requests, allow-listed Resources, ownership policies and JSON errors/rate limits.
- [ ] Document the accepted contract in OpenAPI and test cookie/bearer access with Pest, including denied access and retries.
- [ ] Roll out catalog, buyer, seller, courier/center and admin modules gradually; retain working web routes until parity is accepted.

Reference: [Laravel 12 Sanctum](https://laravel.com/docs/12.x/sanctum). See [Backend](../backend/README.md) and [Deployment](../deployment/README.md).

[Documentation](../README.md)
