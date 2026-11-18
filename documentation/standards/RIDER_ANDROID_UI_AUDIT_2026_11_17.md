# Rider Android implementation and UI verification

Date: 17 November 2026, Asia/Manila.

Scope: the existing separate Flutter project at `apps/mobile`, using the dedicated `lib/rider_main.dart` entry point. No website redesign or backend/database change. Existing unrelated homepage audit work was retained. Changes remain uncommitted on the existing branch; a future focused publication should use `feat/rider-android` after the required review/approval.

## Interface

The Rider build keeps the LubosMart logo, purple/lavender palette, rounded cards and flat Material controls. Poppins regular and semibold are bundled with their open font license. Five destinations expose Home, Tasks, Returns, History and Profile. The general-purpose application entry point remains available for existing development, but the Rider entry point rejects non-Rider accounts and fixes registration to Rider.

Queue counts come directly from `/workspace`; assignment details, contacts, allowed actions, note suggestions and history come from the API. No dashboard statistics are embedded in production code. Synthetic counts exist only in automated fixtures. Status is displayed as text, not color alone. Existing pull-to-refresh, empty/error/retry states, foreground-only refresh and guarded asynchronous buttons are reused.

Custody actions use camera QR acquisition plus an authenticated exact-reference lookup; no editable tracking reference can claim a scanner capture. Delivery and return photos use the camera, compression, preview/retake and size validation. Delivery includes the backend-required recipient name, supported note and conditional COD confirmation. Multipart progress distinguishes bytes sent from server confirmation. Return actions reuse the original return ID and parcel references and expose only server-permitted Rider actions.

## Evidence

- A 320 × 780 Flutter widget render of the Rider app showed all five bottom destinations and readable Poppins typography without a layout exception. The synthetic-data screenshot is `storage/app/flutter-ui-check/rider-only-dashboard.png`.
- Dedicated tests cover Rider-only token rejection/revocation, fixed-role registration, server count rendering, required camera custody and multipart recipient/file/UUID/progress handling.
- Live authorized read checks passed for login, identity, workspace, pickup/dispatch/monitoring/completed queues, returns, earnings and profile; correct and invalid QR reference searches passed; the verification token was revoked.
- Preserved delivery states were checked read-only: #52–53 assigned, #58–59 in_transit, #60–61 out_for_delivery, #31 delivered. The return scenario for order #30 was not submitted.
- Relevant backend tests passed: 52 tests, 490 assertions (`.tools/defense-final/rider-backend-tests.log`).
- Final Flutter validation passed: 20 tests, no analysis issues and clean Dart formatting. Both debug and optimized release APKs built; the final release APK signature verified. The release artifact is 70,976,594 bytes; SHA-256 is recorded in the installation guide.
- Build/install and physical acceptance instructions: [Rider Android guide](../../apps/mobile/RIDER_ANDROID.md).

## Unresolved verification

No Android phone/emulator was attached (`adb devices` returned an empty list). Widget rendering is not physical-device validation. Camera permissions, physical QR acquisition, flashlight behavior, fresh proof capture, successful live upload and parcel/return status changes, corresponding website updates, fresh registration/email delivery, logout/session persistence on a phone, dark-mode visual review, landscape, large text, keyboard navigation, TalkBack and contrast measurements require acceptance. Automated checks do not establish WCAG compliance.

The original release configuration uses a development signing key. App-store signing/distribution is outside this demonstration build. The existing launcher icon was retained. The earning view retains the existing first-page payment presentation; the completed parcel queues support pagination. Photo recovery after Android destroys the process during camera capture remains a physical-device risk to test.

Dart formatting, Flutter static analysis, Flutter tests, native APK builds and relevant Laravel tests are the applicable checks. ESLint/TypeScript checks do not apply to these Dart and Android-manifest changes.
