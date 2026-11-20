<div align="center">

# 👥 Admin functions

**Admin account, compliance, support and finance responsibilities.**

[🛒 Home](../../../README.md) · [📚 Documentation](../../README.md) · [Access rules](../../backend/README.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the implemented Admin workspace and its protected responsibilities. It is for maintainers and operators reviewing account decisions, compliance and platform finance.

<a id="how-it-works"></a>

## 🔄 How it works

Admin oversees accounts, compliance and platform operations. Accounts are privately provisioned; public signup cannot select Admin. Approved, verified Admins share the current Admin permissions.

<a id="workspace-functions"></a>

## 👥 Workspace functions

| Function             | Current behavior                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Registration reviews | Approve/reject eligible Buyer, Seller and Logistics applications; Rider approval and management belong exclusively to Logistics |
| Account management   | Review profiles and apply authorized restrictions/reactivation with recorded reasons                                            |
| Seller compliance    | Check category compliance, warn, hide/restore products or suspend Sellers                                                       |
| Support              | Review complaints, messages and private evidence; record resolutions                                                            |
| Finance/reports      | Configure commission, view sales/commission reports and reconcile COD after cash handover                                       |
| Platform content     | Publish announcements and policies                                                                                              |
| Audit                | Read recorded decisions and status changes                                                                                      |

<a id="finance-and-returns"></a>

## 🔄 Finance and returns

Admin records Seller payouts only after full COD receipt and reconciliation, and reviews current version-3 item/quantity refund requests. Approval credits Lubos Coins and records liability separately from any required physical-return task; it does not wait for Seller receipt or cash-reserve funding. See the [current finance/returns contract](../../workflows/FINANCE_AND_RETURNS.md). Historical sales remain intact; adjustments and Seller balances are separate. Admin cannot create, read or pay Rider compensation records; Logistics handles them exclusively.

<a id="source-references"></a>

## 📚 Source references

Sources: `routes/web.php`, admin/account/review/support/report controllers, `app/Services/Admin/`, `app/Policies/`.

<a id="related-documentation"></a>

## 📚 Related documentation

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)

---

<div align="center">

**LubosMart** · Admin functions · [Back to Documentation](../../README.md)

</div>
