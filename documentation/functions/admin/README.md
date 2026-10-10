# Admin Functions

Admin oversees accounts, compliance and platform operations. Accounts are privately provisioned; public signup cannot select Admin. Approved, verified admins share the current admin permissions.

| Function | Current behavior |
| --- | --- |
| Registration reviews | Approve/reject buyer, seller and sorting-center applications; courier overrides require a reason |
| Account management | Review profiles and apply authorized restrictions/reactivation with recorded reasons |
| Seller compliance | Check category compliance, warn, hide/restore products or suspend sellers |
| Support | Review complaints, messages and private evidence; record resolutions |
| Finance/reports | Configure commission, view sales/commission reports and reconcile COD after cash handover |
| Platform content | Publish announcements and policies |
| Audit | Read recorded decisions and status changes |

Admins coordinate with all roles. Commission reporting is implemented; a complete payout/adjustment ledger is not.

Sources: `routes/web.php`, admin/account/review/support/report controllers, `app/Services/Admin/`, `app/Policies/`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
