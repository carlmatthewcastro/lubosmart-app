# Parcel scanning and free barcode generation

## Current custody refinement — November 16, 2026

The Rider role now has Logistics-owned pickup/delivery/both capabilities and separate assignments. Three forward scans remain mandatory: seller collection by the pickup rider, facility receipt by Logistics, and dispatch acceptance by the delivery rider. Sorting/assignment do not add scans. Final delivery uses private photo evidence, recipient name, selected DeliveryNotes, optional remarks, and exact remaining COD confirmation instead of a fourth forward scan.

The remaining cash amount is net merchandise minus original coin payment plus shipping. Waybills, resources, notifications, and rider screens use that amount. Voucher discounts already belong to net merchandise; do not subtract them twice or treat coins as a discount.

Assignment history and actual custody are distinct. Logistics may replace an undelivered rider after physical facility return with a documented reason. The replacement scans `accept_transfer`; original forward checkpoint timestamps and actual COD collector remain intact. This exception transfer has no forward-checkpoint key and cannot reopen a delivered parcel.

New reverse returns use independent return events: delivery-capable buyer collection → facility receipt → pickup-capable seller-return assignment → facility release → seller receipt/condition. They carry the same tracking reference and never reset completed forward checkpoints. Existing in-progress version-1 returns retain their historical handover behavior.

See [Finance and Returns](FINANCE_AND_RETURNS.md) for custody and financial rules.

## Label and camera behavior

Waybills carry Code 128 and a square QR containing the same LM tracking reference, without a URL or recipient information. Existing Code 39 labels are also supported. A capture or manual lookup selects a parcel; authorized server confirmation performs the custody action. Forward checkpoints require scanner capture. Do not treat an interrupted request as a completed handover.

The shared web camera uses the native decoder and a ZXing fallback; label generation uses JsBarcode and the ZXing QR writer. Camera access needs localhost or trusted HTTPS. A physical phone over insecure LAN HTTP is not sufficient for browser camera permission.

## Proof of delivery

After the three forward checkpoints, sorting, assignment and Start Delivery, the assigned rider submits a private JPG/PNG photo (up to 5 MB), recipient name, a contextual delivery note and COD confirmation when cash is due. The server derives the remaining cash amount. There is no fourth forward scan. Failed delivery is a separate reasoned action and does not create a COD collection. Signature and GPS are not required by this completion handler.

Recipient-name and positive-COD requirements were checked in [DeliveryController](../../web/app/Http/Controllers/DeliveryController.php). The November 14 report describes an earlier form without a required recipient name; preserve it as history. Use the [finance and returns guide](FINANCE_AND_RETURNS.md) for current version-3 return tasks rather than that report's older reverse-return sequence.

## Acceptance limits

Validate printed labels, camera permissions, proof uploads and printer output on the intended physical devices.

[Workflow index](README.md)
