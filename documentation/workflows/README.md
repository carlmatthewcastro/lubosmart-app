# Current workflow guides

Use one guide per topic from this table. Historical implementation reports may explain earlier behavior; the current guide takes precedence for the documented source contract. Authorization, custody and money are separate: assignment is not receipt, delivery is not reconciliation, and displayed proceeds are not a payout.

| Topic | Current guide | Scope |
| --- | --- | --- |
| Buyer | [Buyer functions](../functions/buyer/README.md) | Shopping, checkout, tracking and support |
| Seller | [Seller functions](../functions/seller/README.md) | Listings, stock, preparation, waybills and reports |
| Rider | [Rider functions](../functions/rider/README.md) | Assigned work and account boundaries |
| Logistics | [Logistics functions](../functions/logistics/README.md) | Company riders, parcels, rates and cash |
| Admin | [Admin functions](../functions/admin/README.md) | Reviews, compliance, disputes and reconciliation |
| Orders | [Order journey](ORDERS.md) | Checkout, seller parcels, stock, custody and cash |
| Parcel scanning and proof | [Scanning and POD](PARCEL_SCANNING.md) | Three forward checkpoints, camera/labels, completion and acceptance limits |
| Finance, returns and refunds | [Finance and returns](FINANCE_AND_RETURNS.md) | COD handovers, settlements, compensation, version-3 returns and Lubos Coins |
| Vouchers | [Shop vouchers](VOUCHERS.md) | Visibility, selection, revalidation and usage |
| Account settings | [Account settings](ACCOUNT_SETTINGS.md) | Logistics settings, private files and review controls |
| Approval notifications | [Approval and notifications](ADMIN_APPROVAL_NOTIFICATIONS.md) | Queue/notification behavior; see onboarding qualification below |

## Reading older account and workflow guidance

Role guides retain useful role-specific details. For custody and delivery, follow the current scanning guide; for refunds, follow the version-3 finance contract. Earlier whole-parcel/manual-refund descriptions are superseded. Buyer email/password signup activates after email verification as documented in the backend/Buyer guide; older blanket all-Buyer approval statements describe prior or legacy onboarding. The Rider role guide describes the combined signup form. No onboarding acceptance was rerun here.

Notification event matrices and demo fixtures are retained in the [historical archive](../archive/README.md), with links from the relevant current guide. Do not use old demo reports as evidence of a current deployment.

[Documentation index](../README.md)
