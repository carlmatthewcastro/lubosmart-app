# Rider 1.0.1 baseline

Artifact inventory checked on November 20, 2026 (Asia/Manila). This retains the latest existing local Rider APK as a reference while mobile UI development waits for the new Figma design.

| Field | Retained artifact |
| --- | --- |
| Path from repository root | `mobile/build/app/outputs/flutter-apk/app-release.apk` |
| App | LubosMart Rider |
| Package | `com.lubosmart.lubosmart_mobile` |
| Version | `1.0.1`, build `2` |
| Minimum / target Android API | `24` / `36` |
| Size | `74,885,263` bytes |
| SHA-256 | `B2C9F4B7D2F450B93DD3E784282876446AD77CAE8D656D848C8E97173395CBEF` |
| Signing configuration | Development/debug signing |

The size, checksum and package metadata above were read from the retained file during cleanup. They replace the older report's checksum, which no longer matched the local artifact. The APK was not rebuilt, installed or tested on a phone during this inventory.

Older APK backups, debug copies and superseded redesign/device reports were removed. Source history retains earlier tracked reports. Build outputs remain ignored by Git, so pushing the cleanup does not publish the APK. No GitHub Releases existed when inspected during cleanup.

The earlier delivery report recorded successful installation/launch and 26 passing Flutter tests. Those are historical results. Live sign-in, session restoration, QR/camera behavior, proof uploads, delivery/return mutations and accessibility require coordinated physical-device acceptance; they are not established by this artifact inventory.

Use the [Rider Android guide](RIDER_ANDROID.md) for builds and installation and the [mobile README](README.md) for the paused development scope.
