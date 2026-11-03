# Admin Functions

Admin oversees accounts, compliance and platform operations. Accounts are privately provisioned; public signup cannot select Admin. Approved, verified admins share the current admin permissions.

| Function | Current behavior |
| --- | --- |
| Registration reviews | Approve/reject eligible buyer, seller and logistics applications; Rider approval and management belong exclusively to Logistics |
| Account management | Review profiles and apply authorized restrictions/reactivation with recorded reasons |
| Seller compliance | Check category compliance, warn, hide/restore products or suspend sellers |
| Support | Review complaints, messages and private evidence; record resolutions |
| Finance/reports | Configure commission, view sales/commission reports and reconcile COD after cash handover |
| Platform content | Publish announcements and policies |
| Audit | Read recorded decisions and status changes |

Admin records seller payouts only after full COD receipt and reconciliation, and reviews whole-parcel return requests. Refund records require confirmed seller receipt, a bounded actual amount and a unique manual payment reference. Historical sales remain intact; adjustments and seller balances are separate. Admin cannot create, read or pay Rider compensation records; Logistics handles them exclusively. See the [system feature checklist](../../SYSTEM_FEATURE_CHECKLIST.md).

Sources: `routes/web.php`, admin/account/review/support/report controllers, `app/Services/Admin/`, `app/Policies/`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
