<div align="center">

# API integration

**Authentication, response formats and safe client integration.**

[Home](../../README.md) · [Documentation](../README.md) · [Website](https://lubosmart.app)

</div>

## Overview

The shared Laravel API is served under `/api/v1`, alongside the session-authenticated Inertia.js website. The retained [Flutter client](../../mobile/README.md) covers Buyer, Seller and Rider workflows; mobile UI development is paused pending new Figma designs. For test networking and SDK requirements, use [Flutter setup](../SETUP.md#flutter).

## Contract references and limitations

| Reference                                                                   | How to use it                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Endpoint inventory](ENDPOINTS.md)                                          | Older 82-operation snapshot, with middleware and controller mappings           |
| [OpenAPI](openapi.json) and [Postman](lubosmart-v1.postman_collection.json) | Matching integration snapshots; incomplete against current routes and behavior |
| [Finance/return compatibility](FINANCE_2026_11_11.md)                       | Later cash, wallet and version-3 return additions and legacy behavior          |
| [Mobile role coverage](ROLE_COVERAGE.md)                                    | Retained native modules, website-only operations and acceptance limits         |

The snapshots omit newer routes, including finance, wallet, notification and return-proof operations. OpenAPI also retains the old `apps/mobile` description. Check [routes/api.php](../../web/routes/api.php), [routes/mobile.php](../../web/routes/mobile.php) and the relevant request/controller before implementing against a snapshot. Flexible `RoleResponse` projections are not a fully typed generated SDK contract.

<a id="authentication-and-boundaries"></a>

## Authentication and boundaries

V1 requires per-device Sanctum bearer tokens. Browser sessions and CSRF cookies alone do not authenticate it. Existing `/api/account/*` endpoints retain their same-origin session/CSRF boundary.

1. Send `POST /auth/session` with `email`, `password` and `device_name`, or use configured Google sign-in at `POST /auth/google`.
2. Store `data.access_token`, `kind`, `user` and `expires_at` in OS secure storage. Send `Authorization: Bearer <token>`; never log tokens.
3. For `kind=onboarding`, use only the allowed status, verification, resend, application, promotion and logout routes. Replace the saved token whenever the server issues one, including after verification. Promotion succeeds only when operational eligibility is met.
4. For `kind=operational`, use `/me` and authorized role endpoints. A 401 requires clearing the expired/revoked session and signing in again; 403 can mean lost eligibility or role denial. There is no refresh token.
5. Logout revokes the current token. Password reset and sensitive account/status changes revoke tokens; changed documents or partner details may require review.

Approved operational accounts receive a server-configured token lifetime, defaulting to 30 days; eligible incomplete/unverified/pending/rejected Buyer, Seller and Rider accounts receive restricted one-hour onboarding access. Enrollment and email verification do not bypass approval. `POST /onboarding/promote` exchanges eligible access; `DELETE /onboarding/token` revokes onboarding access. `POST /auth/tokens` remains an operational-only login endpoint, including supported Logistics/Admin accounts.

Register using multipart `POST /auth/register` with role fields, documents and policy consent. New complete Buyer/Seller registrations require Admin review; Rider review belongs to affiliated Logistics. The server enforces age, location, uniqueness, document and account-state rules.

Google sign-in verifies a provider access token. Unknown identities receive `registration_required` without a device token, then enroll using `google_access_token`. Native enrollment prohibits password fields and verifies identity again. An existing email cannot be silently linked; use the website's supported linking flow. Company-invited Riders must activate through their invitation. See [web/native enrollment differences](../standards/REGISTRATION_REQUIREMENTS.md#google-registration).

<a id="response-details"></a>

## Response formats

| Response               | Shape                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Resource               | Root `data`; pagination adds `links` and `meta`                                            |
| Some role read lists   | Nested paginator: `data.data`, `data.current_page`, `data.last_page`, `data.next_page_url` |
| Locations              | Raw array                                                                                  |
| Shipping quote         | `options`, with numeric peso and explicitly named cent fields where supplied               |
| Mutation               | May return `message`; token deletion returns 204                                           |
| Private proof/evidence | Authorized binary download; include bearer headers                                         |
| Report export          | CSV                                                                                        |

Errors contain safe `message`/`code` and validation `errors`, with 401/403/404/409/422/429 as applicable. Handle `Retry-After`; public and authenticated requests are throttled. Protected responses are private/no-store. Role, center membership, assignment and ownership are checked server-side.

Resource money is generally a two-decimal peso string; reports use explicitly named integer-cent fields. Total in centavos and preserve server allocations. A parent order total differs from an individual parcel's COD. Use server `cod_total`/`cod_due_cents`; vouchers are already included in net merchandise and coins are a payment source. Shipping is excluded from commission and remains cash.

<a id="writes-and-retries"></a>

## Writes and retries

- Preserve `checkout_key` and delivery/waybill `request_key` UUIDs across uncertain retries. A new UUID means a new action; check server state after timeouts or conflicts.
- Cart quantities are absolute. Inventory edits require last-read `expected_stock`; existing variant rows also require their own expected stock.
- Use the documented method for JSON writes. For file-bearing PUT/PATCH, send multipart POST with `_method=PUT` or `_method=PATCH` so PHP parses uploads.
- Waybill audit requires `packages=1` and `request_key`; the client builds a printable PDF from the authorized parcel response.
- Return receipt requires physical condition and explicit restock intent. Damaged goods cannot automatically restock. Use server actions and task status, not a legacy parcel-return status, for reverse custody.

<a id="regenerate-and-validate"></a>
<a id="commands"></a>

## Regeneration and verification

For a separately reviewed contract update, run from `web/`:

```powershell
node scripts/generate-mobile-api-contract.cjs
php artisan test tests/Feature/Api
node tests/Frontend/mobile-api-http-check.cjs
```

The generator rewrites `ENDPOINTS.md`, OpenAPI and Postman. Review the resulting route inventory, schemas, examples and prose together; regeneration can replace the inventory's manual snapshot notice. Its structural checks compare routes and local schema references, not full semantic correctness or external OpenAPI validation.

Postman bodies are editable templates. Supply required fields, files and IDs from owned test resources; do not run the full collection blindly against live data or export populated secrets. This documentation cleanup did not regenerate contracts or run application tests. Native/device acceptance remains separate from source coverage.

[Documentation](../README.md)
