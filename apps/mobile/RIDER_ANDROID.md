# LubosMart Rider Android — 17 November 2026

The Rider application reuses the existing Flutter project in `apps/mobile`. Its dedicated entry point is `lib/rider_main.dart`. Only Rider accounts are accepted; Buyer, Seller, Admin and Logistics workspaces cannot be entered from this app. The original general-purpose entry point remains available for existing development work.

## Build and configuration

From `C:\xampp\htdocs\lubosmart-app`:

```powershell
.\scripts\rider-android.cmd build debug
.\scripts\rider-android.cmd build release
.\scripts\rider-android.cmd test
.\scripts\rider-android.cmd analyze
```

The API defaults to `https://lubosmart.app/api/v1`. Override it explicitly when building for another authorized environment:

```powershell
.\scripts\rider-android.cmd build release https://your-host.example/api/v1
```

The launcher supplies the installed workspace Flutter/Android SDK, Gradle cache, Android preferences and Dart telemetry directories. This machine also uses `.tools/rider-pub-cache`, copied from the already installed dependencies, because JNI's native build writes into its package directory and the original user cache is protected. The cache is ignored and contains no application credentials. Other machines can use their normal writable Pub cache. Dependencies remain pinned by `pubspec.lock`; no new package was required.

Both APK modes use the existing development signing configuration. These are installable demonstration builds, not a Play Store distribution release. The package ID remains `com.lubosmart.lubosmart_mobile`; installing may update a previous LubosMart development installation. If Android rejects a signature mismatch, preserve needed app data and use a clean device/test profile rather than uninstalling blindly.

## Implemented functionality

- Rider login, persistent encrypted token storage, token revocation, session expiration and existing verification/approval onboarding.
- Rider-only registration with existing address lookups, operational-center selection, private documents and server field validation.
- Home, Tasks, Returns, History and Profile bottom navigation; server-supplied dashboard counts, pull-to-refresh and foreground refresh.
- Pickup, dispatch, active delivery, exception, COD, completed and all-parcel queues, with pagination and parcel history.
- Parcel identity, available contacts/addresses, COD amount and only server-permitted actions.
- Camera QR decoding and exact authenticated backend assignment lookup. Pickup, dispatch and transfer checkpoints require an actual scanner result; selected identifiers are reused automatically.
- Camera proof capture, compression, preview, retake, 5 MB validation, recipient name, delivery notes, COD confirmation and multipart upload progress. Failed-attempt notes and optional supporting photo follow the backend rules.
- Delivery action UUIDs survive interrupted responses and are reused on explicit retry. Writes are never automatically replayed.
- Return collection, seller dispatch acceptance and seller delivery, when allowed by the API; fresh camera proof and recipient for collection/delivery, original references and private proof viewing. Interrupted return writes require checking refreshed state before retry because this endpoint has no idempotency key.
- Completed delivery history, tracking events, Rider profile, supported earnings/payment records, light/dark appearance and bundled Poppins typography.

The server remains authoritative for assignment, contacts, allowed transitions, COD, approval and return eligibility. There is no direct database connection or mobile refund approval.

## Installation and launch

**Recommended APK:** `C:\xampp\htdocs\lubosmart-app\apps\mobile\build\app\outputs\flutter-apk\app-release.apk`. This path now contains the presentation refresh; see [current build results and backup](REDESIGN_2026_11_17.md) for its checksum and acceptance limits. It retains universal ARMv7/ARM64/x86-64 support, Android 7.0/API 24 minimum and target API 36. The earlier 70,976,594-byte build is preserved separately as the before-redesign backup.

The latest installed version is **1.0.1 (code 2)**. Use the [current reference-layout delivery report](REFERENCE_UI_1_0_1.md) for its checksum, native observations and remaining verification.

The verified debug artifact is `C:\xampp\htdocs\lubosmart-app\apps\mobile\build\app\outputs\flutter-apk\app-debug.apk` (188,068,385 bytes; universal ARMv7, ARM64 and x86-64). Its Android signature verification passed. SHA-256: `0d4c94e050156ec78749df0531ade1d9f58c61e1e7df66abc6e8db3f5b07de34`.

1. Copy the APK to an Android 7.0/API 24 or newer phone and open it. If prompted, allow installation from that file manager for this installation.
2. Open **LubosMart Rider** from the launcher.
3. Use the primary Rider credentials in the existing private demonstration account guide. Credentials are not bundled in source or the APK.
4. Allow **Camera** when scanning or taking proof. Internet access is declared in the manifest and does not require a runtime permission dialog. Proof uses fresh camera capture; no location, signature or broad photo-library permission is required.

Alternatively, enable USB debugging, connect the phone, accept the debugging prompt, then run from the repository root:

```powershell
.\.tools\android-sdk\platform-tools\adb.exe devices
.\.tools\android-sdk\platform-tools\adb.exe install -r .\apps\mobile\build\app\outputs\flutter-apk\app-debug.apk
.\.tools\android-sdk\platform-tools\adb.exe shell am start -n com.lubosmart.lubosmart_mobile/.MainActivity
```

Use `app-release.apk` in the install command for the release build. No local Laravel server, database, `adb reverse` or shared Wi-Fi connection to this PC is needed; the phone needs internet access to the live HTTPS API.

## Physical-device acceptance procedure

The subsequent connected-device session is recorded separately in [Physical Android check](DEVICE_TEST_2026_11_17.md). Installation and launch passed on an Infinix X6876 running Android 16; remaining steps below are not assumed complete.

No device was connected during implementation. These steps still require a phone and operator participation:

1. Login; compare Home counts and the pickup/dispatch/delivery queues against the Rider website. Force-close and reopen to check secure session restoration.
2. Open an assigned pickup. Scan its real printed/displayed waybill QR. Confirm the reference resolves to that assignment. Cancel before confirming pickup to preserve the demonstration. Scan an unrelated/invalid QR and verify a clear error without any status change.
3. Deny camera permission, retry, then enable it in Android Settings → Apps → LubosMart Rider → Permissions. Verify the scanner and flashlight on the actual device.
4. Use a separate legitimate test assignment for successful state changes. The normal Logistics workflow must prepare it first. Scan and confirm pickup; check the website and mobile state, then perform the existing facility/dispatch workflow through the appropriate authorized operators. Accept dispatch by scanning, then start delivery without an extra scan.
5. At delivery, select a supported note, enter the actual recipient, capture a fresh photo, preview/retake, confirm any COD, and submit. Verify upload progress, success, completed history, private proof and the corresponding website status. Check that tapping repeatedly does not create duplicate events.
6. Test an interrupted delivery submission on a separate assignment. Refresh status first; retry the saved action only if still offered. Its UUID must be reused.
7. With a separately assigned return, test collection photo/recipient/notes, normal facility receipt, seller dispatch acceptance and final seller handover proof. The Rider does not approve refunds or mark facility receipt.
8. Test logout and reopening; confirm login is required. Test expired/revoked credentials, airplane mode, server validation errors, 320px-equivalent layout, landscape, larger text and dark mode.

Prepared demo deliveries #52–53, #58–59, #60–61 and completed parcel #31 were read only. Order #30's eligible return scenario was not submitted or consumed. Do not run through all prepared scenarios merely to complete this checklist.

## Verification limits

Current automated results: **20 Flutter tests passed**, **Flutter analysis: no issues**, **Dart formatting: clean**, and **52 relevant Laravel tests passed with 490 assertions**. Both native debug and optimized release APK builds passed. The final release build took 145 seconds after build caches were prepared; initial attempts failed on protected cache writes, a manifest conflict and restricted artifact downloads, which were resolved. A nonfatal SDK XML version warning remains. No failing automated tests remain. The live check returned 201 for Rider login, 200 for all read checks and 204 for token revocation. At verification time the actual workspace reported 3 pickups, 2 dispatch parcels, 2 active deliveries and 17 completed parcels; the app fetches fresh values rather than embedding this snapshot.

Live login, read-only endpoints, exact QR reference lookup and token revocation were verified after explicit approval. Automated multipart tests use synthetic bytes to verify transport; they do not prove physical camera acquisition or a successful live POD update. No placeholder proof was uploaded to the live service. Successful live delivery/return mutations, website propagation, fresh registration/email delivery, physical accessibility and camera behavior remain unverified. Automated tests do not establish WCAG compliance.

No backend source, database records, seeders or deployed release were changed. No commit, push or deployment was performed. ESLint and TypeScript do not apply to the changed Dart/native-manifest files; Flutter analysis, Dart formatting, Flutter tests, native APK compilation and relevant Laravel tests provide the applicable checks.

Public build references: [Flutter Android builds](https://docs.flutter.dev/deployment/android), [mobile_scanner](https://pub.dev/packages/mobile_scanner), [Poppins source and license](https://github.com/google/fonts/tree/main/ofl/poppins).
