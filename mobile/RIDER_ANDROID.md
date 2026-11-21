# LubosMart Rider Android

The dedicated Rider entry point is `lib/rider_main.dart`. It accepts Rider accounts and uses the shared Laravel API. Mobile UI development is paused pending the new Figma design; see the [mobile README](README.md).

## Build and verify

Run from `mobile/` with the workspace Flutter and Android SDKs installed:

```powershell
.\scripts\rider-android.cmd analyze
.\scripts\rider-android.cmd test
.\scripts\rider-android.cmd build release https://your-test-host.example/api/v1
```

Replace the example URL with a reachable authorized HTTPS test API. Omitting it uses the live `https://lubosmart.app/api/v1` endpoint. The helper also supports `build debug` and `devices`. On another machine, use an installed Flutter SDK directly:

```powershell
flutter pub get
flutter build apk --release --target lib/rider_main.dart --dart-define=API_BASE_URL=https://your-test-host.example/api/v1
```

The output is `build/app/outputs/flutter-apk/app-release.apk`. Both modes currently use Android debug signing. The application ID is `com.lubosmart.lubosmart_mobile`; installation may update an existing development app. Preserve needed app data if Android reports a signature mismatch.

## Retained APK and installation

Keep the latest Rider release APK at `build/app/outputs/flutter-apk/app-release.apk`. Build outputs are ignored by Git and are not included in a source push. Older local APK backups and debug APK copies were removed during cleanup; no GitHub Releases existed at the time of inspection.

See the [1.0.1 baseline report](REFERENCE_UI_1_0_1.md) for the retained artifact's checksum and version. From `mobile/`, install on a connected test phone with USB debugging enabled:

```powershell
..\.tools\android-sdk\platform-tools\adb.exe devices
..\.tools\android-sdk\platform-tools\adb.exe install -r .\build\app\outputs\flutter-apk\app-release.apk
```

Open **LubosMart Rider**. The retained build requires Android 7.0/API 24 or newer and internet access to its configured API. Camera permission is used for scanning and fresh delivery/return proof. Do not uninstall or clear app data as a routine troubleshooting step.

## Acceptance still required

Use synthetic accounts and legitimate test assignments on a test environment to check sign-in/session restoration, assignment queues, real QR scanning, camera permission denial/retry, fresh proof capture/upload, COD confirmation, returns and website propagation. Check interrupted requests before retrying and verify that supported retries reuse their mutation identifiers.

Review light/dark mode, large text, landscape and TalkBack on a physical device. Existing automated tests and earlier installation observations do not establish acceptance of the future Figma design or successful delivery/return mutations.
