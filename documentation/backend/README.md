# Backend

Laravel handles authentication, approvals, products, checkout, delivery operations and administration. Existing routes return Inertia pages, redirects, downloads and selected JSON responses.

November 5, 2026 update: `routes/api.php` adds stateless mobile API v1 routing alongside the website. See [the API guide](../api/README.md) for device-token lifecycle, safe Resources, shared checkout/custody operations, tests and remaining parity. `routes/account.php` retains its existing session-based account endpoints.

## Code organization

| Location                                                   | Responsibility                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `routes/web.php`, `routes/auth.php`, `routes/settings.php` | Web endpoints                                                 |
| `bootstrap/app.php`                                        | Routing and middleware                                        |
| `app/Http/Controllers/`                                    | Requests and responses; some business operations              |
| `app/Http/Requests/`                                       | Form validation and request authorization                     |
| `app/Models/`                                              | Relationships, casts and queries                              |
| `app/Policies/`                                            | Account, application and support permissions                  |
| `app/Actions/Checkout/CreateOrderFromCart.php`             | Transactional checkout                                        |
| `app/Services/`                                            | Shipping quotes, locations, email security and workspace data |
| `app/Notifications/`, `routes/console.php`                 | Notifications and scheduled cleanup                           |

## Accounts and access

Current public role identifiers are `buyer`, `seller`, `rider` and `logistics`; older records use courier/sorting-center terminology. Admin accounts are provisioned with `php artisan lubosmart:create-admin`.

Rider signup collects its application in the combined registration form; after verification, a complete submission waits for Logistics review. See the [Rider guide](../functions/rider/README.md). Current Buyer password signup activates after email verification. Complete Seller/Logistics registrations become pending after verification for Admin review. Legacy/Google onboarding can require completing an application first. Rejected applicants can correct and resubmit. Suspension/deactivation blocks existing sessions as well as new access.

| Role            | Reviewer                                                                                     | Required documents             |
| --------------- | -------------------------------------------------------------------------------------------- | ------------------------------ |
| Buyer           | Admin for review-required applications; current password signup activates after verification | ID                             |
| Seller          | Admin                                                                                        | ID and business permit         |
| Courier / Rider | Selected Logistics company / sorting center                                                  | ID, driver's license and OR/CR |
| Sorting Center  | Admin                                                                                        | ID and business/DTI permit     |

`User::canOperate()` checks approval/verification and courier center eligibility. Middleware, Policies/Gates and ownership checks protect operations. An inactive center or unapproved center operator blocks affiliated couriers.

Google signup requires a verified provider email and still follows application approval for the selected role. Google login does not create unknown accounts. Linking preserves existing roles and approval decisions. Email/password signup requires Terms and Privacy Policy acceptance; application submission also requires consent to review the submitted details and documents.

## Security and business rules

- Passwords are hashed; bank fields are encrypted and hidden from ordinary serialization.
- Registration verification uses emailed six-digit codes; the old verification-link endpoint returns 410. Recovery codes are a separate flow. See `EmailVerificationLinks`, `RegistrationEmailCodes` and `VerifyEmailController` for the current handlers.
- Registration documents and delivery proofs are private. Downloads recheck permission; registration links also have a short-lived signature.
- Checkout locks inventory, uses server prices, snapshots address/shipping/commission data and supports a buyer-scoped UUID retry key.
- Shipping remains cash; merchandise can also use opt-in Lubos Coins as described in the [current finance contract](../workflows/FINANCE_AND_RETURNS.md). The default commission is 10% of item subtotal, excluding shipping. Delivery completion records commission; this is not proof of a seller payout.
- Security mail sends synchronously. Decision/status mail queues after commit. Daily cleanup requires the scheduler to run.

The implemented API and website share actions/services where available. Web and API controllers must share business rules. See [API](../api/README.md) and [setup](../deployment/README.md).

Checks: `php artisan test`, `php vendor/bin/pint --test`. Tests exist under `tests/`; production locking behavior also needs MySQL checks.

[Documentation](../README.md)
