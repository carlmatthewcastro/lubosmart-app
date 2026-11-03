# Logistics and Rider demonstration

For ZXing camera scanning and free JsBarcode Code 128 labels, see
[parcel scanning](PARCEL_SCANNING.md). Existing Code 39 labels remain readable.

Updated 2026-10-22 (Asia/Manila). Logistics and Rider share parcel identity,
tracking references, center/coverage assignments, custody history and COD records.
Use two browser profiles to stay signed in as both roles. Refresh the other
profile after a handoff; notification counts poll separately.

## Existing local samples

**Johanna Manambit, account 35 / Flash Express, center 2** is approved and
email-verified as checked on 2026-10-22. Use this account's existing login.
Its DEMO Rider credentials are saved privately at
`storage/app/private/demo/logistics-35-credentials.json`.

| Parcel ID | Starting example | Tracking reference |
| --- | --- | --- |
| 5 | Pickup approval and assignment | `LM-1BB1AE3D1DE24CA99C2B7379AF4EFF20` |
| 6 | Incoming parcel: center receipt | `LM-D51AD8F3F58D41B2ADCC7351E57304EC` |
| 7 | Received parcel: sorting | `LM-93D15BBA4345443C8C48F5B7DEC95D45` |
| 8 | Prepared dispatch: Rider accepts handover | `LM-227EEE5082884AAA92490015937CE0B9` |
| 9 | Out for delivery: proof/COD or failed attempt | `LM-3BAD769090804BDF99E89B7B67CD5369` |

All use synthetic recipients, a hidden product, the DEMO destination and **PHP
150 COD** (PHP 100 item + PHP 50 shipping). Parcel 8 was already assigned for
dispatch when checked. Progress is preserved; examples leave their initial queue
after actions. Find them through All Parcels afterward.

Older parcel 9 has no dispatch acceptance evidence. Use parcel 8 after accepting
handover for the physical return-to-center demo. Newly created monitoring samples
include synthetic dispatch evidence; old history is never silently rewritten.

## Repeatable setup

```powershell
php artisan lubosmart:logistics-demo 35 --center=2
```

Replace IDs to prepare samples under another approved local Logistics account
and its owned operational center. Output includes delivery ID, seller-order /
waybill ID and tracking reference. IDs can differ; use the tracking reference
to identify the physical parcel.

Alternatively, `php artisan db:seed --class=RiderDemoSeeder` prepares a dedicated
DEMO company and Rider with an assigned pickup and prepared dispatch. Rider login:
`storage/app/private/demo/rider-login.json`. Newly created company login:
`storage/app/private/demo/logistics-login.json`. An older demo company needs its
existing credentials; reruns never reset its password.

## Full successful delivery demo

1. **Logistics**, `/dashboard/logistics`: open Pickup Requests, find parcel 5,
   approve pickup, choose the DEMO area and DEMO Rider, then assign pickup.
2. **Rider**, `/dashboard/rider`: open Pickups, enter parcel 5's exact reference,
   select manual capture and reason `Synthetic demo; no scanner`. Confirm pickup.
3. **Logistics**, `/logistics/scan`: look up the same reference. Check recipient
   and destination, choose **intact**, supply the manual-entry reason, and confirm
   center receipt. Incoming moves to Sorting.
4. Scan/enter the reference again. Choose the matching DEMO destination, enter
   bin/route `DEMO-A`, then confirm sorted. Assign the DEMO delivery Rider. This
   prepares a manifest; the Rider must still accept physical handover.
5. **Rider**, Dispatch: enter the reference and **Scan and accept dispatch
   handover**, then **Mark out for delivery**. Logistics Monitoring updates.
   For a shorter demonstration, start here with parcel 8.
6. **Rider**: enter the reference and recipient `DEMO Recipient`, upload a test
   JPG/PNG (up to 5 MB), enter actual COD **150.00**, and confirm delivered & COD
   collected. Completed/history and pending cash update.
7. **Logistics**, Cash Handovers: enter cumulative actual received cash **150.00**,
   reference `DEMO-CASH-001`, and confirm cash received. Rider pending cash clears.
8. **Admin**, with an existing authorized account: reconcile the verified
   collection. Open Reports to show the completed parcel. Logistics cannot do
   Admin reconciliation; delivery/COD totals are not Rider earnings or payouts.

Every manual capture needs a reason. Camera/scanner capture selects a parcel;
actions still require confirmation. Private delivery proof is available only to
authorized order participants, assigned Rider, Logistics and Admin.

## All-function demo checklist

| Function | Sample action | Expected result / Rider connection |
| --- | --- | --- |
| Dashboard/search/notifications | Search a reference, inspect queues and refresh both profiles after a handoff | Logistics sees its centers; Rider sees assigned work; counts follow persisted actions |
| Rider signup and review | Register a synthetic Rider against this company, supply required private documents, verify through a local mailer, then review in Rider Applications | Only the chosen company approves; operations stay blocked until approval |
| Company Riders/account access | Inspect the DEMO Rider; suspend and restore permitted access if demonstrating access controls | Suspended Rider cannot operate; Logistics cannot undo Admin restrictions |
| Rider coverage | `/logistics/rider-coverage`: inspect the DEMO Rider's DEMO area | Assignment requires matching company, center and coverage |
| Shipping rates | In a separate demo database, publish supported coverage: PHP 50 base, 1 kg included, PHP 10 extra kg, 5 kg maximum; quote a 1.5 kg seller parcel | PHP 60 shipping; pickup and destination need coverage; existing order quotes stay unchanged |
| Seller preparation/waybill | Matching DEMO Seller opens Orders and a sample waybill; request one label or reprint | Code 128 and readable text retain tracking identity; print intent is audited; old Code 39 labels still scan |
| Scan/camera/manual lookup | `/logistics/scan`: scan/paste parcel 6 or 7's reference | Exact own-center parcel appears; unknown/foreign references show no match; camera fallback keeps manual entry |
| Damaged receipt | Receive parcel 6 as damaged instead of intact | Parcel is held; sorting, dispatch and automatic retry are blocked; escalate through support |
| Failed attempt/hold | Rider records `DEMO recipient unavailable` on an out-for-delivery parcel; Logistics holds it for review | Both exception queues show the issue; ordinary progression is blocked |
| Retry with Rider custody | Logistics authorizes retry with a reason | Rider can mark out for delivery again; failure and decision history remain |
| Return and redispatch | On parcel 8 after accepted handover/out-for-delivery, record failure; Logistics requests return, scans intact return receipt, then authorizes retry | Sorting, a new dispatch and Rider handover acceptance are required again |
| Cash shortage | After delivery, Logistics enters **100.00**, receipt `DEMO-SHORT-001`, reason `DEMO shortage PHP 50` | Discrepancy stays open; Admin reconciliation is blocked; later enter cumulative **150.00**, not just the extra PHP 50 |
| Reports/export | Open `/reports` and Logistics CSV export after completing a sample | Scoped completed parcel and COD totals appear; Rider reports show assigned deliveries |
| Messages/support | Logistics starts a conversation with its Rider through `/support`; Rider replies | Authorized participants see replies; other companies cannot access them |
| Privacy/validation | Try wrong tracking, an unassigned Rider, missing proof, short COD or repeated completion | Rejected without duplicate custody events or collections |

These scenarios consume their starting samples: for example, use parcel 8 for
either the successful-delivery shortcut or the return demo, then continue it
through sorting/redispatch to finish delivery. No reset is required.

Signup/email, access changes and published rates are separate deliberate demo
actions, not pre-completed by the parcel generator. Use a local log/array mailer
for synthetic `example.invalid` addresses. Publishing the first rate changes
checkout coverage enforcement: demonstrate it in a separate demo database.

## Guarantees and limits

Creation is restricted to local/testing and preserves existing passwords,
verification, approvals, progress and real records. It adds no published rates,
completed deliveries, proof uploads or collections. Synthetic counts and later
test collections appear in local reports. No destructive reset is provided.

GPS/live maps, automatic first-come pickup, batch manifests, Rider earnings and
payouts, cross-company center transfers, and complete return-to-seller/refund/
restocking policies remain unimplemented. Physical printer/scanner/phone testing
is still required. See [implementation acceptance](standards/LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md)
and [current verification results](LOGISTICS_RIDER_VERIFICATION.md).
