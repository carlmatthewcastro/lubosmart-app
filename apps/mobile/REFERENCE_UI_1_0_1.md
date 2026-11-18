# Rider reference-layout correction — 1.0.1

17 November 2026, Asia/Manila. This supersedes the earlier presentation refresh, which was too close to the original stacked-card interface.

## Installed artifact

- APK: `C:\xampp\htdocs\lubosmart-app\apps\mobile\build\app\outputs\flutter-apk\app-release.apk`.
- Version **1.0.1**, version code **2**; package `com.lubosmart.lubosmart_mobile`; same signing certificate as the previous release.
- Size: **74,835,575 bytes** (71.4 MiB).
- SHA-256: `F22D1FF0B741BF6187AC4133E4E5CB0F1C683BC0FE71CC6CC2B8B928701C9D59`.
- APK signer SHA-1: `c432ae1f75a000cf1c5a4c56253f9c4c23d64f93`; SHA-256: `4bd39ea04dc42b0b6a2f185f87c19a44a6cb0c6f187db4815508527bff2d9632`. The current release build uses the existing debug signing configuration; production signing/OAuth fingerprints are not configured here.
- Rebuilt with the supplied violet/orange rider illustrations, tinted PNG icon set and branded launcher assets. Installed with `adb install -r` on the connected Android device; Android reported Success and installed version 1.0.1/code 2. App data was preserved. The app launched to the Rider sign-in screen and the supplied hero artwork was visually checked on-device.
- The APK package name and app label, signing certificate, packaged illustration/icon assets, adaptive launcher resources and Android 12+ splash attributes were checked. No live sign-in, QR scan, camera capture or parcel state workflow was performed in this build check.
- Previous APK retained at `.tools/defense-final/LubosMart-Rider-before-reference-fix.apk`; the earlier working backup is also preserved separately.

## Visible correction

The montage now guides the actual screen composition rather than only theme tokens. Official purple/orange remains authoritative over the montage's green palette.

- Branded wordmark and official logo; supplied LubosMart violet/orange delivery-rider artwork on login, with the supplied avatar in a clipped violet/orange frame on the dashboard and Profile. Registration omits a duplicate logo/hero to preserve space; these illustrations are never proof evidence.
- Home uses a personalized greeting, four operational tiles with icons/counts, a completed banner, a centered Scan QR action, compact Earnings link and exception/all-parcel links. Metric labels remain readable at narrow widths; counts still come from the API.
- Tasks has All, Pickups, Dispatch and Active queue chips, exact-reference search, compact store/location/COD/status cards and authorized next-action labels. Action buttons continue into the existing detail/handover workflow.
- Rider parcel details use a reference/status summary and a compact store, pickup, delivery and COD section. Full references, scanner custody validation, notes, proof fields and confirmations remain intact. Other mobile roles retain their existing detail presentation.
- Returns now separate Active and Completed Rider tasks, with reference search, compact status cards and the existing details/history/evidence/actions. The tabs classify whether a Rider action is currently available; they do not change return status.
- COD handovers and completed deliveries have tracking-reference search. The existing Rider API exposes the cash queue as collected COD only and completed deliveries as delivered parcels; it does not provide Pending/Collected/Delivered cash subtabs or a Returned-history category, so those unsupported filters were not added.
- Earnings has Total Earned, Paid and Pending summaries using the existing fee and paid totals; Pending is their difference. Payment history and the COD-liability notice remain unchanged. Profile uses the supplied Rider avatar and structured contact, vehicle, compensation and settings sections. Navigation and key parcel, contact, search, scan and payment icons use the supplied transparent PNG icon pack, tinted to match LubosMart branding.
- Registration now matches the reference's three-step Personal, Vehicle and Documents presentation, while retaining all existing fields, address lookups, password/policy requirements, file uploads and backend validation.
- Light and dark appearance are exercised by the widget tests. Physical-device visual acceptance remains outstanding. No new dependency, backend endpoint, database update, website deployment or Git publication was introduced.
- The Android launcher uses the supplied violet/orange app-icon artwork at legacy densities and an adaptive foreground built from the official LubosMart shopping-bag mark, padded on a pale disc over a violet/orange gradient. Pre-Android 12 and Android 12+ use the official mark on the branded splash screen without an artificial delay.

## Actual verification

**26 Flutter tests passed**, including existing auth/session/UUID/multipart checks, retained registration inputs, exact money/timestamps, branded login, assignment filters, return Active/Completed presentation and full-reference detail navigation. The reference-navigation test asserts its requests are GET-only. Analysis reports no issues; formatting and release build passed; the APK signature and matching certificate were verified.

Fresh authorized live verification also passed: Rider login 201; identity/workspace/queues/returns/earnings/profile/detail and exact QR-reference reads 200; new verification token revocation 204. Live counts were 3 pickups, 2 dispatch, 2 active deliveries, 5 COD handovers, 17 completed and 27 all parcels. Production code does not embed these values.

Prepared deliveries remained #52–53 assigned, #58–59 in_transit, #60–61 out_for_delivery and #31 delivered. No parcel/return event or proof upload was submitted by the assistant. Actual assigned returns, a return form's required-notes validation and the existing private-evidence viewer/disclosure were observed on the phone. These observations do not establish a successful handover or fresh POD upload.

After a restart the login page was visible; a subsequent authenticated returns screen was observed. The cause of that login prompt was not established, so persistent-login behavior should be checked in a coordinated device session rather than claimed passed or changed speculatively.

## Remaining physical checks

1. Sign in and check Home, Tasks filters/search, complete parcel references, Returns, History, earnings and Profile in light/dark modes.
2. Scan a real assigned waybill and an invalid reference. Stop before custody confirmation. Test camera permission denial/retry on the phone.
3. Capture a fresh delivery/return photo, preview and retake. Stop before submitting. Actual upload, backend status change and website propagation require approval naming the specific parcel/action; prefer a separate legitimate test assignment.
4. Check secure session restoration after closing/reopening, larger text, landscape, keyboard focus and TalkBack. Automated checks and screenshots are not WCAG certification.

Mock renders are under `storage/app/flutter-ui-check/reference-*.png`; those contain explicitly synthetic test fixtures. Native captures are under `apps/mobile/build/device-tests/`. No placeholder image was uploaded as evidence.
