# Rider reference-layout correction — 1.0.1

17 November 2026, Asia/Manila. This supersedes the earlier presentation refresh, which was too close to the original stacked-card interface.

## Installed artifact

- APK: `C:\xampp\htdocs\lubosmart-app\apps\mobile\build\app\outputs\flutter-apk\app-release.apk`.
- Version **1.0.1**, version code **2**; package `com.lubosmart.lubosmart_mobile`; same signing certificate as the previous release.
- Size: **72,240,322 bytes** (68.9 MiB).
- SHA-256: `a01d2655f0ee70f9599858456e6514967c91d5ac0f7f6bd75e9bb05ff3554808`.
- Installed with `adb install -r` on the Infinix X6876; Android reported Success and installed version 1.0.1/code 2. App data was not cleared. The illustrated login was visually inspected on the physical device.
- Previous APK retained at `.tools/defense-final/LubosMart-Rider-before-reference-fix.apk`; the earlier working backup is also preserved separately.

## Visible correction

The montage now guides the actual screen composition rather than only theme tokens. Official purple/orange remains authoritative over the montage's green palette.

- Branded wordmark and original logo; original code-drawn rider/motorcycle artwork on login and an illustrated rider avatar on Home. These are interface illustrations, never proof evidence.
- Home uses a personalized greeting, four operational tiles with icons/counts, a completed banner, QR and earnings actions, and compact exception/all-parcel links. All seven counts still come from the API.
- Tasks is now the real parcel list, with All-first queue chips, exact-reference search, compact store/location/COD/status cards and authorized next-action labels. Action buttons navigate to the existing detail/handover workflow; they do not silently submit transitions.
- Parcel details use a reference/status summary and separate store, pickup, delivery and COD sections. The full original reference remains accessible, and QR custody validation, notes, proof fields and confirmation remain intact.
- Returns use compact reference/status cards and distinct details/history/evidence screens, preserving every server-authorized Rider action.
- Earnings uses an earned/paid summary and appropriate empty history. Profile uses an initials/status header and structured contact, vehicle, compensation and settings sections.
- Registration retains four steps with circular progress indicators, field icons, birthday picker, preserved values, original uploads and original final server validation.
- Light and dark screenshots were reviewed. No new dependency, backend endpoint, database update, website deployment or Git publication was introduced.

## Actual verification

**25 Flutter tests passed**, including existing auth/session/UUID/multipart checks, retained registration inputs, exact money/timestamps, branded login, assignment filters and full-reference detail navigation. The new navigation test asserts that its requests are GET-only. Analysis reports no issues; formatting and release build passed; the APK signature and matching certificate were verified.

Fresh authorized live verification also passed: Rider login 201; identity/workspace/queues/returns/earnings/profile/detail and exact QR-reference reads 200; new verification token revocation 204. Live counts were 3 pickups, 2 dispatch, 2 active deliveries, 5 COD handovers, 17 completed and 27 all parcels. Production code does not embed these values.

Prepared deliveries remained #52–53 assigned, #58–59 in_transit, #60–61 out_for_delivery and #31 delivered. No parcel/return event or proof upload was submitted by the assistant. Actual assigned returns, a return form's required-notes validation and the existing private-evidence viewer/disclosure were observed on the phone. These observations do not establish a successful handover or fresh POD upload.

After a restart the login page was visible; a subsequent authenticated returns screen was observed. The cause of that login prompt was not established, so persistent-login behavior should be checked in a coordinated device session rather than claimed passed or changed speculatively.

## Remaining physical checks

1. Sign in and check Home, Tasks filters/search, complete parcel references, Returns, History, earnings and Profile in light/dark modes.
2. Scan a real assigned waybill and an invalid reference. Stop before custody confirmation. Test camera permission denial/retry on the phone.
3. Capture a fresh delivery/return photo, preview and retake. Stop before submitting. Actual upload, backend status change and website propagation require approval naming the specific parcel/action; prefer a separate legitimate test assignment.
4. Check secure session restoration after closing/reopening, larger text, landscape, keyboard focus and TalkBack. Automated checks and screenshots are not WCAG certification.

Mock renders are under `storage/app/flutter-ui-check/reference-*.png`; those contain explicitly synthetic test fixtures. Native captures are under `apps/mobile/build/device-tests/`. No placeholder image was uploaded as evidence.
