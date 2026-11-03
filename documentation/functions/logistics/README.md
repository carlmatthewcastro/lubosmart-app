# Logistics Functions

Update, 2026-10-26: Logistics exclusively handles Rider fees and payment records at `/rider-payments`; Admin cannot access that ledger. Logistics assigns approved whole-parcel returns; the assigned Rider collects and Seller confirms receipt. Admin separately handles buyer refund decisions/records and seller settlements. See [finance and returns](../../FINANCE_AND_RETURNS.md). These manual workflows supersede the older payout/return gaps below; automatic bank transfers, batch manifests, GPS routing and physical device acceptance remain outside the implemented scope.

Logistics companies coordinate riders, coverage and parcel custody. Registration requires ID, business/DTI permit and Admin approval. The stored role is `logistics`.

| Function | Current behavior |
| --- | --- |
| Rider management | Review own riders and apply permitted account changes; cannot undo Admin restrictions |
| Rider signup | Riders create their own accounts, verify email and choose the company/center; Logistics reviews the submitted requirements in Rider Applications |
| Shipping rates | Configure published barangay coverage, base fee, included weight, extra-kilogram fee and maximum weight |
| Pickup | Approve pickup requests and assign eligible riders |
| Scan Parcel | Open Operations > Scan Parcel in the sidebar for camera/scanner/manual lookup, parcel review and receipt/sorting/dispatch confirmations in one place |
| Parcel processing | Scan/enter the attached tracking reference, record receipt condition and destination bin/route, then prepare a one-parcel dispatch manifest; assigned rider separately accepts handover |
| Exceptions / returns | Record logistics decisions for failed delivery, hold, retry or scanned return-to-center receipt; damaged parcels remain held for escalation |
| Cash handover | Confirm actual cumulative cash and a receipt reference; shortages stay unresolved; Admin reconciles only verified full handovers |
| Reports/messages | View/export completed parcel reports and scoped conversations |

Quoted orders go to the buyer-selected provider. Legacy unallocated parcels can be claimed by a center. Shipping fees use destination and packed weight; both seller pickup and buyer destination need coverage.

Publishing the first shipping rate enables logistics quotes. After that, unsupported checkout is blocked rather than reverting to flat fees. Existing orders keep their original quotes. Report shipping totals are not rider earnings or confirmed payouts.

Updated 2026-10-16: printable Code 39 tracking labels, scanner/manual entry, optional supported-browser camera capture and parcel event/custody history are implemented locally. See [Logistics implementation and acceptance](../../standards/LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md) for verified checks and limitations. Physical printer/scanner acceptance, QR format selection, batch manifests, GPS routing, return-to-seller/refund/restocking policies and payouts remain pending.

Sources: `DeliveryController`, `RiderServiceAreaController`, `app/Http/Controllers/Logistics/`, `app/Services/Logistics/`, `resources/views/pages/logistics/`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
