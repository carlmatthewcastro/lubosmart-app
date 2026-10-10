# Backend

Laravel handles authentication, approvals, products, checkout, delivery operations and administration. Existing routes return Inertia pages, redirects, downloads and selected JSON responses.

## Code organization

| Location | Responsibility |
| --- | --- |
| `routes/web.php`, `routes/auth.php`, `routes/settings.php` | Web endpoints |
| `bootstrap/app.php` | Routing and middleware |
| `app/Http/Controllers/` | Requests and responses; some business operations |
| `app/Http/Requests/` | Form validation and request authorization |
| `app/Models/` | Relationships, casts and queries |
| `app/Policies/` | Account, application and support permissions |
| `app/Actions/Checkout/CreateOrderFromCart.php` | Transactional checkout |
| `app/Services/` | Shipping quotes, locations, email security and workspace data |
| `app/Notifications/`, `routes/console.php` | Notifications and scheduled cleanup |

## Accounts and access

Public roles are `buyer`, `seller`, `courier` and `sorting_center`. Admin accounts are provisioned with `php artisan lubosmart:create-admin`.

Password signup follows **unverified → incomplete → pending → approved or rejected**. Email verification opens the application; submission requests approval. Rejected applicants can correct and resubmit. Suspension/deactivation blocks existing sessions as well as new access.

| Role | Reviewer | Required documents |
| --- | --- | --- |
| Buyer | Admin | ID |
| Seller | Admin | ID and business permit |
| Courier / Rider | Selected sorting center; reasoned Admin override | ID, driver's license and OR/CR |
| Sorting Center | Admin | ID and business/DTI permit |

`User::canOperate()` checks approval/verification and courier center eligibility. Middleware, Policies/Gates and ownership checks protect operations. An inactive center or unapproved center operator blocks affiliated couriers.

Google signup requires a verified provider email and still requires application approval. Google login does not create unknown accounts. Linking preserves existing roles and approval decisions. Signup currently does not require a consent checkbox; do not claim consent was recorded unless submitted.

## Security and business rules

- Passwords are hashed; bank fields are encrypted and hidden from ordinary serialization.
- Verification links are hashed, expire after 24 hours and can be consumed once. Recovery codes expire after ten minutes and limit failed attempts.
- Registration documents and delivery proofs are private. Downloads recheck permission; registration links also have a short-lived signature.
- Checkout locks inventory, uses server prices, snapshots address/shipping/commission data and supports a buyer-scoped UUID retry key.
- Payments are COD only. The default commission is 10% of item subtotal, excluding shipping. Delivery completion records commission; this is not proof of a seller payout.
- Security mail sends synchronously. Decision/status mail queues after commit. Daily cleanup requires the scheduler to run.

For the API migration, reuse actions/services and extract controller transactions as needed. Web and API controllers must share business rules. See [API](../api/README.md) and [setup](../deployment/README.md).

Checks: `php artisan test`, `php vendor/bin/pint --test`. Tests exist under `tests/`; production locking behavior also needs MySQL checks.

[Documentation](../README.md)
