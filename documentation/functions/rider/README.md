<div align="center">

# 👥 Rider functions

**Rider registration, assigned custody, proof and COD responsibilities.**

[🛒 Home](../../../README.md) · [📚 Documentation](../../README.md) · [Parcel scanning](../../workflows/PARCEL_SCANNING.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the implemented Rider workspace and registration flow. It is for maintainers and operators reviewing assigned work, custody evidence and COD responsibilities.

<a id="how-it-works"></a>

## 🔄 How it works

The interface calls this role Rider; its stored role is `rider`. Existing database names such as `rider_profiles` and `deliveries.rider_id` remain.

<a id="registration"></a>

## 🔒 Registration

Riders submit one registration at `/register?role=rider`, presented in three steps: personal/contact details with grouped name fields, Rider/address details and documents, then review/account security. Each step validates before continuing; Back retains details and selected files. The final submission includes their password, vehicle and plate number, operational Logistics center, ID, driver's license and OR/CR. All requirements are validated before creating an account.

After email verification they go directly to the waiting page; there is no second details submission for a new signup. Only the selected Logistics company/center reviews Rider applications; Admin can inspect them but cannot approve them. Rejection permits corrected resubmission through the existing application workflow. Delivery access remains gated by Logistics approval.

Public Rider signup uses email/password; existing Rider accounts can still use supported Google sign-in/linking, while incomplete Google-created Rider signup is blocked.

Existing company-created invitations and their activation URLs remain compatible. They are no longer the main signup flow. The Company Riders page prioritizes application review and account management.

<a id="workspace-functions"></a>

## 👥 Workspace functions

| Function        | Current behavior                                                          |
| --------------- | ------------------------------------------------------------------------- |
| Assigned work   | View parcels assigned to the Rider                                        |
| Pickup/delivery | Advance assigned → picked_up → in_transit → out_for_delivery → delivered  |
| Proof           | Upload a private delivery photo before confirming completion              |
| COD             | Confirm collection at delivery; center receives cash and Admin reconciles |
| History/support | View delivery history/reports and authorized conversations                |

Operations require an approved account and operational center. Assignment must match center and service-area eligibility. Center receipt/sorting is required before dispatch for destination/weight quoted orders.

Reasoned failed attempts, Logistics holds/retries and scanned return-to-center receipt are implemented. Riders also see their own Logistics-recorded fees/payment history and can collect approved return-to-Seller parcels assigned by Logistics. Admin has no rider-payments access. Fees require actual work evidence; COD/shipping totals are not wages. First-come self-assignment and automatic bank transfers are not implemented. See [finance and returns](../../workflows/FINANCE_AND_RETURNS.md) and the Logistics and Rider demo.

<a id="source-references"></a>

## 📚 Source references

Sources: `DeliveryController`, `DashboardController`, `ReportController`, `User::canOperate`, `rider_service_area`.

<a id="related-documentation"></a>

## 📚 Related documentation

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)

---

<div align="center">

**LubosMart** · Rider functions · [Back to Documentation](../../README.md)

</div>
