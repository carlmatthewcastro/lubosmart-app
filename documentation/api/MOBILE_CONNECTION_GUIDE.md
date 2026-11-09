# Connect the Flutter client

The native client is in [apps/mobile](../../apps/mobile/README.md). Follow that README for Flutter/Android setup. The Laravel root remains the server; do not duplicate its database or business logic into the app folder.

## Test network

Use synthetic accounts in an isolated test installation. From the Laravel root:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

From apps/mobile, use flutter run with API_BASE_URL=http://10.0.2.2:8000/api/v1 for an Android emulator, or the PC's reachable LAN address for a phone. Local HTTP is enabled only for debug development; use HTTPS for actual operation. APP_URL and asset/pagination URLs must be reachable from the phone. No firewall or deployment change was performed.

## Session flow

1. POST auth/session with email/password/device_name, or configured Google provider access token to auth/google.
2. Securely save data.access_token, kind, user and expires_at; send Authorization: Bearer.
3. If kind=onboarding, use only onboarding status/verify/resend/application endpoints. Replace the token after verification. Approval is still required; promote only when eligible.
4. If kind=operational, use /me and role endpoints. On 401 clear login state and sign in again. A 403 can mean lost eligibility or role denial.
5. Logout revokes the current token. Password reset or important account changes revoke tokens and can require review.

For new accounts use multipart auth/register with required role fields/documents. The Flutter form performs location selection and policy consent. Backend validation remains authoritative. Google enrollment still requires documents and approval; company invitations retain their activation flow.

## Safely submit changes

Keep action UUIDs until a response conclusively resolves the action. Never create a new checkout_key/request_key just because a response timed out. Compare latest server state after conflicts. Stock editing sends the last-read expected_stock; do not silently overwrite newer stock.

Use multipart POST plus \_method for file-bearing PUT/PATCH. Private proof/evidence downloads require bearer headers. GET locations is a raw array; other lists can use either Resource or nested Laravel paginator envelopes. See [API details](README.md).

The Android SDK is now installed and its toolchain checks pass. See the [Android setup and APK report](ANDROID_SETUP_2026_11_05.md) for the current build status and USB testing instructions. No Android phone or emulator was connected during setup; actual native integration still needs the [device checklist](MOBILE_COMPLETION_2026_11_05.md).
