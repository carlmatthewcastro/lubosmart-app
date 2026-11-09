# Android SDK setup — November 5, 2026

The Android SDK is installed locally in this workspace. Flutter's Android toolchain check passes, and the launcher-scoped flutter doctor reports **No issues found**. Android Studio and an emulator were not installed; neither is needed to build an APK or test with a USB-connected Android phone.

## Installed tools

| Tool                         | Verified version/location                                    |
| ---------------------------- | ------------------------------------------------------------ |
| Android command-line tools   | 22.0, .tools/android-sdk/cmdline-tools/latest                |
| Android platforms            | APIs 34, 35 and 36 (plugins require the older platforms too) |
| Android build tools          | 36.0.0                                                       |
| Android platform tools / adb | 37.0.1                                                       |
| Native Development Kit       | 28.2.13676358                                                |
| Java                         | Microsoft OpenJDK 17.0.19                                    |
| Flutter / Dart               | 3.47.9 / 3.13.7                                              |
| Gradle                       | 9.3.1, cached under .tools/gradle                            |

Google's [official SDK tools page](https://developer.android.com/studio) and [repository metadata](https://dl.google.com/android/repository/repository2-3.xml) supplied the downloads. The command-line tools archive matched Google's published SHA-256; platform, native compiler and build/platform-tool archives matched the checksums in Google's metadata. The SDK manager's package download stalled, so the verified archives were installed directly. Download archives were removed after extraction to reclaim disk space. Standard Android SDK licenses were accepted and Flutter verified them.

Flutter now points to the workspace SDK and the installed Java 17. A stale Java path pointing at a missing Android Studio installation was corrected. The launcher supplies PATH, ANDROID_HOME and GRADLE_USER_HOME for its own process; no machine-wide PATH edit is required. Keep the workspace in place or update Flutter's configured SDK path after moving it.

## Commands from the repository root

```powershell
.\scripts\android-mobile.cmd doctor
.\scripts\android-mobile.cmd devices
.\scripts\android-mobile.cmd build http://127.0.0.1:8000/api/v1
```

The explicit URL above creates a **USB test build**. Without the second argument, build/run default to the Android emulator host URL http://10.0.2.2:8000/api/v1. Use a reachable HTTPS server for production. The script does not start or modify the Laravel database/server.

## APK build result

The retained local log, `storage/app/android-setup-2026-11-05/apk-build-final.log`, ends with a successful `assembleDebug` and `Built build\app\outputs\flutter-apk\app-debug.apk`. The artifact exists at `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk` (187,864,044 bytes when inspected during documentation organization). The log also contains an SDK XML-version warning; the final build-success line is present.

This reconciles the previously pending build note using existing evidence. No build was rerun during documentation organization, and APK presence does not establish installation, device behavior or release readiness.

## Connect an Android phone

No Android phone or emulator was detected during setup. Phone installation and runtime acceptance therefore require the following physical steps:

1. Enable Developer options and USB debugging on your Android phone.
2. Connect a data-capable USB cable and accept the phone's “Allow USB debugging” prompt.
3. Run the devices command above. Confirm your phone appears as an Android device. If it says unauthorized, approve the prompt; if absent, check the cable and the phone manufacturer's Windows USB driver.
4. Start an isolated Laravel test installation in another terminal using synthetic accounts:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

5. Forward the phone's local API port to the PC and install the USB test APK:

```powershell
.\.tools\android-sdk\platform-tools\adb.exe reverse tcp:8000 tcp:8000
.\.tools\android-sdk\platform-tools\adb.exe install -r .\apps\mobile\build\app\outputs\flutter-apk\app-debug.apk
```

If multiple devices are connected, supply adb -s DEVICE_SERIAL before reverse/install. Repeat adb reverse after reconnecting or restarting the phone. This USB test build needs that connection to reach the PC's API. For a LAN/remote API, rebuild with its reachable URL instead.

6. Open LubosMart on the phone and use approved test accounts. Follow the [native acceptance worksheet](MOBILE_COMPLETION_2026_11_05.md) or [Excel-compatible checklist](../MOBILE_ACCEPTANCE_CHECKLIST.csv), including camera/proof, scanner, protected files, interrupted requests, secure storage and each role workflow.

Backend-generated asset and pagination URLs must also be reachable from the device. For USB port forwarding, use a test APP_URL at http://127.0.0.1:8000 and repeat the reverse command; for LAN testing use the PC's reachable address. Preserve real configuration and data.

## Evidence and limits

Logs and package checksums are under storage/app/android-setup-2026-11-05: doctor-final.log, devices.log, gradle-version.log, packages.json and apk-build-final.log. SDKs, caches, logs and APK build outputs are ignored development artifacts.

A successful build does not establish camera, printer, Google OAuth, mail, accessibility or real-device behavior. Release signing, owned application IDs/launcher assets, HTTPS hosting and distribution remain separate work. No backend migrations, production deployment or Git publication were performed.
