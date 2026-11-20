# Flutter setup and API connection

Flutter lives in `mobile` and shares the Laravel backend with the website. Start with the [web setup](WEB.md) on a dedicated test installation. Use a Flutter SDK compatible with [pubspec.yaml](../../mobile/pubspec.yaml), which declares Dart `^3.13.7`..

From `mobile`, for the multi-role client:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

`10.0.2.2` reaches the host PC from an Android emulator. A physical phone needs a reachable test LAN/HTTPS address or USB forwarding; its own localhost is not the PC. Laravel `APP_URL` must also make image and pagination URLs reachable. Release requests require HTTPS.

The multi-role entry point is `lib/main.dart`. The dedicated Rider entry point is `lib/rider_main.dart`; its helper defaults to the live API, so supply an authorized test API URL for testing. Follow the existing [Rider Android guide](../../mobile/RIDER_ANDROID.md) for explicit target, build arguments, installation and USB setup. Retain the [mobile README](../../mobile/README.md) for workspace details and optional Google client configuration.

Install the Android SDK and platform tools for Android development. Release signing and physical-device acceptance require separate verification; iOS builds require macOS/Xcode.

Use the [API connection guide](../api/MOBILE_CONNECTION_GUIDE.md) for onboarding tokens, retries and uploads, and the [API guide](../api/README.md) for coverage and contract limitations. Native wallet screens and full physical-device journeys remain pending according to the existing records.

[Setup index](README.md)
