# Sorting Center Functions

Sorting centers coordinate couriers, coverage and parcel custody. Registration requires ID, business/DTI permit and Admin approval. The stored role is `sorting_center`.

| Function | Current behavior |
| --- | --- |
| Courier management | Review own couriers and apply permitted account changes; cannot undo Admin restrictions |
| Shipping rates | Configure published barangay coverage, base fee, included weight, extra-kilogram fee and maximum weight |
| Pickup | Approve pickup requests and assign eligible couriers |
| Parcel processing | Confirm receipt, sorting and dispatch; monitor own-center parcels |
| Cash handover | Receive collected COD; Admin performs final reconciliation |
| Reports/messages | View/export completed parcel reports and scoped conversations |

Quoted orders go to the buyer-selected provider. Legacy unallocated parcels can be claimed by a center. Shipping fees use destination and packed weight; both seller pickup and buyer destination need coverage.

Publishing the first shipping rate enables logistics quotes. After that, unsupported checkout is blocked rather than reverting to flat fees. Existing orders keep their original quotes. Report shipping totals are not courier earnings or confirmed payouts.

Barcode scanning, GPS routing and a complete assignment-history/return workflow are not verified.

Sources: `DeliveryController`, `RiderServiceAreaController`, `app/Http/Controllers/Logistics/`, `app/Services/Logistics/`, `resources/js/pages/logistics/`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
