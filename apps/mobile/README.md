# LubosMart Flutter application

Separate native client for Buyer, Seller and Rider. Laravel stays at the repository root and remains the shared backend for the website and mobile app. The client derives its workspace from the authenticated account; it cannot grant itself a role.

Source and automated checks are implemented. The Android SDK is now installed and Flutter's Android toolchain checks pass; see the [Android setup and APK build report](../../documentation/api/ANDROID_SETUP_2026_11_05.md) for the latest native build status and USB testing instructions. Android/iOS plugin integration on a real device and release signing still require acceptance.

## Run locally

Use a separate test installation and synthetic accounts. Preserve any existing Laravel .env, application key, database and uploads. Do not migrate or seed a live database just to try this app.

1. Install Flutter compatible with pubspec.yaml (verified here with Flutter 3.47.9 / Dart 3.13.7). The workspace SDK is at ../../.tools/flutter/bin; it is ignored by Git.
2. The workspace Android SDK and Java are configured on this machine. Run scripts/android-mobile.cmd doctor from the repository root to verify them. For another machine, install the Android SDK and platform tools, accept its licenses and run flutter doctor -v. Android Studio is optional for command-line builds and USB phone testing; an emulator is a separate installation.
3. Start the Laravel test server from the repository root: php artisan serve --host=0.0.0.0 --port=8000.
4. In this folder run:

```powershell
flutter pub get
flutter analyze
flutter test
flutter devices
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

10.0.2.2 reaches the host PC from the Android emulator. For a physical phone on the same controlled test network, substitute the PC's LAN address. The phone's localhost refers to the phone. Network/firewall access must already permit the connection. The debug Android manifest allows local HTTP; release requests require HTTPS. Configure Laravel APP_URL and asset URLs so the device can reach images and pagination links too.

A development APK can be built with:

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

Use a reachable HTTPS URL for release builds. Android currently retains the generated development application ID and debug release signing; choose your own application ID, launcher assets and protected release signing before distribution. iOS compilation requires macOS/Xcode, a bundle ID, provisioning and platform permission checks; it was not run on this Windows machine. Do not treat a successful Dart test as an installed native app test.

## Authentication and configuration

The client stores bearer tokens and pending mutation UUIDs in OS secure storage. Registration, email codes, password recovery, application corrections and approval gates use the API. An onboarding token cannot access marketplace operations. Company-invited Riders must finish their invitation activation first. Important profile/document changes can revoke tokens and require re-review.

Google sign-in is optional and hidden without GOOGLE_SERVER_CLIENT_ID. Configure Google OAuth credentials for your Android package/signing certificate and iOS bundle/client URL scheme as required by the installed google_sign_in package; then pass the server client ID:

```powershell
flutter run --dart-define=API_BASE_URL=https://your-test-host/api/v1 --dart-define=GOOGLE_SERVER_CLIENT_ID=your-web-oauth-client-id
```

No real Google credentials are included. The server verifies the provider access token and verified email. Existing email accounts are not silently linked; link them through the website. Unknown Google accounts still complete role documents, verification and approval.

## Implemented workspaces

| Role      | Native screens and actions                                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer     | Catalog/search/options/reviews, wishlist, cart, addresses and location selection, shipping/voucher review, COD checkout, purchases/cancellation, parcel messages/proof, delivered reviews and return requests |
| Seller    | Own orders/preparation, waybill review/PDF print, inventory/images/options with stock snapshots, vouchers, costs/voids/profit, unsettled sales/payout history, reports, returns receipt and messages          |
| Rider     | Own parcel queues/details/timeline, camera scan or explained manual waybill entry, custody transitions allowed by server, recipient/proof/COD capture, return collection, earnings and payment history        |
| All three | Password/Google sign-in, registration and required documents, email verification/recovery, approval/corrections, private support conversations/evidence, protected profile changes, appearance and logout     |

Admin and Logistics management, approval decisions, company invitation activation, return approval/assignment/refund recording and payout management remain website workflows. The mobile interface does not perform bank transfers.

## Code and tests

- lib/core/api.dart: guarded API origin, bearer transport, secure session restoration, multipart method override, money parsing and persistent action UUIDs.
- lib/features: account/onboarding, Buyer shopping, orders/custody, Seller finance/inventory and shared support/settings.
- lib/ui/common.dart: shared forms, confirmations, guarded actions, error/retry UI and foreground-only refresh.
- test: transport/UUID/security tests and role workspace/cart/PDF widget tests.

A timeout does not prove a mutation failed. The client preserves a pending checkout, print or delivery intent and reuses its UUID on explicit retry; it does not silently replay writes. Read refresh pauses when the app/page is inactive.

See the [API coverage](../../documentation/api/ROLE_COVERAGE.md), [OpenAPI](../../documentation/api/openapi.json), [Postman collection](../../documentation/api/lubosmart-v1.postman_collection.json), and [verification and manual acceptance guide](../../documentation/api/MOBILE_COMPLETION_2026_11_05.md).
