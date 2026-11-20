<div align="center">

# 👥 Logistics functions

**Logistics rider management, parcel custody and cash operations.**

[🛒 Home](../../../README.md) · [📚 Documentation](../../README.md) · [Parcel scanning](../../workflows/PARCEL_SCANNING.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the implemented Logistics workspace and its operational boundaries. It is for maintainers and operators reviewing Rider management, parcel handling and cash handovers.

<a id="context"></a>

## 🔄 Context

> [!NOTE]
> The October update below is historical. Use the [current finance and returns contract](../../workflows/FINANCE_AND_RETURNS.md) for version-3 item/quantity refunds and independent return tasks.

Update, 2026-10-26: Logistics exclusively handles Rider fees and payment records at `/rider-payments`; Admin cannot access that ledger. Logistics assigns approved whole-parcel returns; the assigned Rider collects and Seller confirms receipt. Admin separately handles Buyer refund decisions/records and Seller settlements. See [finance and returns](../../workflows/FINANCE_AND_RETURNS.md). These manual workflows supersede the older payout/return gaps below; automatic bank transfers, batch manifests, GPS routing and physical device acceptance remain outside the implemented scope.

Logistics companies coordinate Riders, coverage and parcel custody. Registration requires ID, business/DTI permit and Admin approval. The stored role is `logistics`.

<a id="workspace-functions"></a>

## 👥 Workspace functions

| Function             | Current behavior                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rider management     | Review own Riders and apply permitted account changes; cannot undo Admin restrictions                                                                                                   |
| Rider signup         | Riders create their own accounts, verify email and choose the company/center; Logistics reviews the submitted requirements in Rider Applications                                        |
| Shipping rates       | Configure published barangay coverage, base fee, included weight, extra-kilogram fee and maximum weight                                                                                 |
| Pickup               | Approve pickup requests and assign eligible Riders                                                                                                                                      |
| Scan Parcel          | Open Operations > Scan Parcel in the sidebar for camera/scanner/manual lookup, parcel review and receipt/sorting/dispatch confirmations in one place                                    |
| Parcel processing    | Scan/enter the attached tracking reference, record receipt condition and destination bin/route, then prepare a one-parcel dispatch manifest; assigned Rider separately accepts handover |
| Exceptions / returns | Record Logistics decisions for failed delivery, hold, retry or scanned return-to-center receipt; damaged parcels remain held for escalation                                             |
| Cash handover        | Confirm actual cumulative cash and a receipt reference; shortages stay unresolved; Admin reconciles only verified full handovers                                                        |
| Reports/messages     | View/export completed parcel reports and scoped conversations                                                                                                                           |

<a id="how-it-works"></a>

## 🔄 How it works

Quoted orders go to the Buyer-selected provider. Legacy unallocated parcels can be claimed by a center. Shipping fees use destination and packed weight; both Seller pickup and Buyer destination need coverage.

Publishing the first shipping rate enables Logistics quotes. After that, unsupported checkout is blocked rather than reverting to flat fees. Existing orders keep their original quotes. Report shipping totals are not Rider earnings or confirmed payouts.

Updated 2026-10-16: printable Code 39 tracking labels, scanner/manual entry, optional supported-browser camera capture and parcel event/custody history are implemented locally. See Logistics implementation and acceptance for verified checks and limitations. That October 16 record is historical. Current QR/POD and reverse-return behavior is documented in the [scanning guide](../../workflows/PARCEL_SCANNING.md) and [finance/returns guide](../../workflows/FINANCE_AND_RETURNS.md). Physical acceptance, batch manifests and GPS routing are not established by that report.

<a id="source-references"></a>

## 📚 Source references

Sources: `DeliveryController`, `RiderServiceAreaController`, `app/Http/Controllers/Logistics/`, `app/Services/Logistics/`, `resources/views/pages/logistics/`.

<a id="related-documentation"></a>

## 📚 Related documentation

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)

---

<div align="center">

**LubosMart** · Logistics functions · [Back to Documentation](../../README.md)

</div>
