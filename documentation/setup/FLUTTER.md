# Flutter setup and API connection

Flutter lives in `apps/mobile` and shares the Laravel backend with the website. Start with the [web setup](WEB.md) on a dedicated test installation. Use a Flutter SDK compatible with [pubspec.yaml](../../apps/mobile/pubspec.yaml), which declares Dart `^3.13.7`; the November 5 SDK installation record is machine-specific evidence.

From `apps/mobile`, for the multi-role client:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

`10.0.2.2` reaches the host PC from an Android emulator. A physical phone needs a reachable test LAN/HTTPS address or USB forwarding; its own localhost is not the PC. Laravel `APP_URL` must also make image and pagination URLs reachable. Release requests require HTTPS.

The multi-role entry point is `lib/main.dart`. The dedicated Rider entry point is `lib/rider_main.dart`; its helper defaults to the live API, so supply an authorized test API URL for testing. Follow the existing [Rider Android guide](../../apps/mobile/RIDER_ANDROID.md) for explicit target, build arguments, installation and USB setup. Retain the [mobile README](../../apps/mobile/README.md) for workspace details and optional Google client configuration.

The [Android SDK setup record](../api/ANDROID_SETUP_2026_11_05.md) stays at its existing path because `scripts/android-mobile.cmd` references it. Its SDK paths, tool versions and APK results describe that earlier machine/run. The [November 17 device record](../../apps/mobile/DEVICE_TEST_2026_11_17.md) records Rider installation, launch and an authenticated assignment screen; it does not establish full camera, QR, proof-upload or return acceptance. Release signing remains development signing in the Rider guide. iOS compilation and provisioning require macOS/Xcode and separate acceptance.

Use the [API connection guide](../api/MOBILE_CONNECTION_GUIDE.md) for onboarding tokens, retries and uploads, and the [API guide](../api/README.md) for coverage and contract limitations. Native wallet screens and full physical-device journeys remain pending according to the existing records. No mobile tests or builds were run for this cleanup.

[Setup index](README.md)
