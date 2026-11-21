# LubosMart mobile

The Flutter client is on hold while the team prepares a new Figma design. The website and shared Laravel API in [`web/`](../web/) remain the current priority. Resume mobile interface work from the agreed Figma mockups and guide.

The existing Buyer, Seller and Rider client is retained as a reference for API integration and account workflows. Its screens are provisional; the new Figma design will guide the next app.

## Project structure

| Path | Purpose |
| --- | --- |
| `lib/main.dart` | Buyer, Seller and Rider entry point |
| `lib/rider_main.dart` | Dedicated Rider entry point |
| `lib/core/api.dart` | API transport, secure sessions and mutation identifiers |
| `lib/features/` | Existing account and role workflows |
| `lib/ui/` | Existing shared widgets and Rider presentation |
| `assets/` | Referenced branding, illustrations, icons, fonts and font licenses |
| `test/` | API and widget regression tests |
| `scripts/` | Windows Android helpers using the workspace SDKs |

Unused PNG icons and superseded delivery reports have been removed. Keep assets referenced by Dart code, including the dynamic icon map in `lib/ui/rider_design.dart`, and declare bundled files in `pubspec.yaml`. Native Android/iOS launcher and splash resources belong to their platform projects.

## Run locally

Open `mobile/` in your editor. Install Flutter compatible with [`pubspec.yaml`](pubspec.yaml), which requires Dart `^3.13.7`. See [Flutter setup](../documentation/SETUP.md#flutter) for SDK and backend setup.

From this folder:

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --target lib/main.dart --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

`10.0.2.2` reaches the development PC from an Android emulator. For a physical phone, supply a reachable test API address. Start Laravel from `web/` against a dedicated test database with synthetic accounts. Preserve existing application keys, databases and uploads.

For Rider builds, installation and the retained APK, see [Rider Android](RIDER_ANDROID.md).

## Authentication and configuration

`API_BASE_URL` selects the shared Laravel API. Supply an authorized test URL explicitly: the Rider helper defaults to `https://lubosmart.app/api/v1`. Release builds require HTTPS.

`GOOGLE_SERVER_CLIENT_ID` enables the optional Google sign-in button. It requires matching Android/iOS OAuth configuration and the Web OAuth client ID as server client ID. Pass it with `--dart-define=GOOGLE_SERVER_CLIENT_ID=your-web-client-id` when running or building; the Rider helper does not supply it. Never commit credentials.

The server controls roles, approval, assignments and allowed actions. The client stores bearer tokens in OS secure storage and preserves supported mutation identifiers for explicit retries. A timeout requires checking server state before retrying a write.

## Current baseline

The retained local Rider APK is **1.0.1 (build 2)**. Its metadata and verification limits are recorded in the [baseline report](REFERENCE_UI_1_0_1.md). It is development-signed; a distributable store release needs production signing and platform acceptance.

The new Figma design, mobile UI rebuild and physical-device acceptance remain future work. Keep the API contracts and server authorization intact when rebuilding. See the [API guide](../documentation/api/GUIDE.md) and [role coverage](../documentation/api/ROLE_COVERAGE.md).
