# Physical Android check — 17 November 2026

Device: Infinix X6876, Android 16, connected and authorized through USB ADB.

Installed artifact: `build/app/outputs/flutter-apk/app-release.apk`, version 1.0.0 (code 1), package `com.lubosmart.lubosmart_mobile`.

## Observed results

| Check | Result |
| --- | --- |
| ADB detection | Passed; authorized device detected |
| Preserve-data APK installation | Passed; `adb install -r` returned Success |
| Cold launch | Passed; Android reported Status ok and MainActivity opened |
| Rider login page | Observed on the physical phone |
| Authenticated assignment list | Active deliveries screen and two assignment references observed after the user attempted login |
| Reported initial sign-in difficulty | Cause not established; no persistent error was present in the inspected app text; no speculative fix applied |
| Camera permission | Not granted at the initial check; runtime permission/scanner test pending |
| Physical QR decode and assignment validation | Pending user participation |
| Fresh photo, preview and retake | Pending user participation |
| Successful proof upload and status update | Not submitted; requires explicit approval for the specific operation |
| Return state changes | Not submitted; requires explicit approval |

Device navigation and UI are changing as the user interacts. Further remote taps wait for the user to leave the intended Rider screen open. Credential fields are excluded from diagnostic output, and temporary UI dumps are deleted from the phone after inspection. Rider-process diagnostics did not show a matching Flutter exception or Android runtime failure in the inspected output; this does not establish a crash-free full workflow.

## Safe next checks

1. Leave the Rider Home screen open, then inspect actual dashboard counts and assignment details.
2. Scan the actual prepared parcel #52 reference for lookup only; do not press Confirm physical pickup. A locally generated preview using the original guide reference is at `build/device-tests/qr-check.html`; an invalid-reference QR is included for the rejection check.
3. On a delivery assignment, capture a fresh photo, preview it and retake if needed. Stop before delivery confirmation or upload submission.
4. Ask for approval naming the exact parcel/action before submitting any operation that changes parcel, delivery, COD or return state. Prefer a separate legitimate test assignment.

No parcel/return event or proof upload was submitted during these checks. The application source and backend were not changed for an unconfirmed issue.
