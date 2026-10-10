# Rider / Courier Functions

The interface calls this role Courier; its stored role is `courier`. Existing database names such as `rider_profiles` and `deliveries.rider_id` remain.

Registration requires vehicle details, plate number, ID, driver's license, OR/CR and selected sorting-center approval. Admin can override a review with a reason.

| Function | Current behavior |
| --- | --- |
| Assigned work | View parcels assigned to the courier |
| Pickup/delivery | Advance assigned → picked_up → in_transit → out_for_delivery → delivered |
| Proof | Upload a private delivery photo before confirming completion |
| COD | Confirm collection at delivery; center receives cash and Admin reconciles |
| History/support | View delivery history/reports and authorized conversations |

Operations require an approved account and operational center. Assignment must match center and service-area eligibility. Center receipt/sorting is required before dispatch for destination/weight quoted orders.

First-come pickup requests, courier earnings payouts and complete failed-attempt/return handling are not implemented.

Sources: `DeliveryController`, `DashboardController`, `ReportController`, `User::canOperate`, `rider_service_area`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
