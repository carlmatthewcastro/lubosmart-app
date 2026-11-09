# Parcel scanning and free barcode generation

Updated 2026-11-05 (Asia/Manila).

## Barcode and QR on the same waybill

Each web waybill now shows the existing Code 128 barcode and an additional square
QR carrying exactly the same `LM-...` tracking reference. The QR uses the installed
ZXing writer, with a four-module white margin and medium error correction. It
contains no URL, recipient data or new parcel identity. Existing Code 39 labels
remain supported. Both Logistics and Rider use the shared decoder; permissions
and handover confirmations are unchanged.

Physical verification on November 5: the connected Infinix X6876 phone running
Chrome captured the QR for parcel #15, populated the exact tracking reference,
displayed the matching authorized parcel, and stopped the camera. The next state
remained waiting for Rider pickup; the assistant submitted no parcel action.
Evidence is private at
`storage/app/private/scanner-diagnostics/phone-qr-success.json`.

The original Code 128 screen-to-camera attempt did not decode reliably, including
a complete captured image. The precise optical/rendering cause remains unresolved;
do not attribute every failure to positioning or claim that physical barcode
scanning passed. QR is the verified phone-camera option for this setup. Printed
Code 128/Code 39 and other camera/device combinations still need physical tests.

The extended browser harness passed 31 scenarios, including actual rendered
waybill QR pixels at 0 and 15 degrees, matching parcel lookup, and rejection of
an unrelated URL QR. These automated cases supplement the actual phone QR test.
Refresh both the Seller waybill and the Logistics/Rider page after rebuilding.
Use USB forwarding for phone localhost camera access, or a trusted HTTPS origin.

## Web camera reliability update

The shared Logistics/Rider camera now requests an ideal 1920x1080 stream (the
device may supply a lower resolution), shows the full uncropped preview, and
tries ZXing when the native decoder returns nothing, invalid data, or errors.
Software decoding searches more rows and retries rotated and inverted pixels.
Only a valid LubosMart tracking reference is captured; URLs and unrelated codes
cannot initiate a parcel action.

Successful capture stops the camera and displays **Captured tracking reference**.
The Logistics scan page then performs the authorized lookup; Rider forms fill
the tracking field. Neither operation confirms a physical handover. After eight
seconds without capture, the camera displays positioning/clarity guidance. Stop
also cancels pending camera permission and releases any late-arriving stream.

Initial verification before the QR addition: 28 browser scenarios passed, including real Code 128/Code 39
pixel decoding, native-decoder failures, rotated/inverted/off-center labels,
permission denial/cancellation, unreadable frames, Logistics lookup and Rider
capture. Relevant backend regression: 58 passed, 1,109 assertions. ESLint,
TypeScript, changed-file Prettier and production build passed. The old decoder's
native-empty failure was reproduced before the fix. Evidence is local under
`storage/app/scanner-fix-1793878734636/`; camera input in the automated browser
run uses generated video frames, not a physical webcam. Actual printed/phone
label capture on the user's laptop was then unverified, as were full accessibility
and physical-device acceptance. Existing database records were not used for
mutating tests.

For a physical retest, hard-refresh the local website, open the owning Seller's
waybill, and scan the complete barcode including its white margins from a clear
print or another screen. A camera preview or manually entered reference alone
does not count as a successful camera scan.

## Demo

1. Seller opens a prepared order's waybill and selects **Print waybill**. The
   audited print request uses a free Code 128 barcode for the tracking reference.
   Reprints retain the same reference.
2. Logistics opens **Operations > Scan Parcel**, selects **Scan with camera**,
   allows camera access, and points the camera at the label. Rider camera
   scanning uses the same component in assigned parcel actions.
3. Approved pickup requests stay in Pickup Requests until **Assign Pickup Rider**
   is completed. After actual pickup, center receipt and sorting, Logistics can
   assign a delivery Rider from either the parcel's dispatch-queue dialog or this
   scan workspace. Both require the attached label reference. The assigned Rider
   then sees the parcel in their **Dispatch** queue and accepts the handover.
4. Capture stops the camera. Check the parcel and choose the appropriate action.
   Capture alone never confirms pickup, receipt, sorting or delivery.
5. USB/Bluetooth scanners still enter text in the tracking field. Manual entry
   remains available with the existing required reason.

Use HTTPS or localhost for camera access. Plain HTTP LAN addresses usually cannot
request the camera. Existing printed Code 39 labels still scan; parcel identity
and database structure stay unchanged. Labels contain the tracking reference,
not recipient details. Generating an arbitrary barcode does not create an order
or grant access to another company's parcels.

## Libraries

- The linked [ZXing project](https://github.com/zxing/zxing) is Java-based.
  LubosMart uses [ZXing's JavaScript browser layer](https://github.com/zxing-js/browser),
  with `@zxing/browser` 0.1.5 and `@zxing/library` 0.21.3, compatible with Node 22.
  It decodes Code 39 and Code 128 frames when native BarcodeDetector lacks these
  formats. The fallback loads on demand when camera scanning starts.
- [JsBarcode](https://github.com/lindell/JsBarcode) is the free, MIT-licensed
  generator integrated into the waybill. It produces Code 128 SVG with black
  bars, white quiet margins, proportional scaling and readable tracking text.
  Its [standalone generator](https://lindell.me/JsBarcode/generator/) is also
  available for separate sample labels; real parcels should use the app's waybill.

Both libraries are bundled locally. Camera frames and generated references are
not sent to an external decoder/generator service. Authorized parcel lookup still
requires the application server. The square QR added on November 5 carries the
same tracking identity alongside the linear barcode.

## Verification

- 103 relevant PHP tests passed (1,806 assertions): Logistics, Rider/Seller workspace,
  marketplace flow, live indicators, finance and returns; same/different delivery Riders.
- The Logistics operations browser run passed 19 checks, including actual ZXing
  decoding of JsBarcode Code 128 and Code 39 pixels with native BarcodeDetector
  disabled. Checks retain permission/manual fallback, ignored URL payloads,
  stopped camera tracks, receipt, sorting, offline actions, mobile dark reflow
  and audited label printing.
- TypeScript, targeted ESLint, Prettier and production build passed. The waybill
  screenshot was inspected. Evidence:
  `storage/app/logistics-operations-ui-check/`.

Browser tests use canvas-backed streams. Physical camera/printer/scanner, label
stock, phone focus, full accessibility, screen-reader and 200%/400% zoom checks
remain acceptance work. See the [Logistics/Rider demo](LOGISTICS_DEMO.md) for
local samples and the full custody workflow.
