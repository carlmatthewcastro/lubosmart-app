# Mobile API and Flutter verification — November 5, 2026

This records the initial automated verification before Android SDK setup. The SDK has since been installed; see the later [Android toolchain and APK report](ANDROID_SETUP_2026_11_05.md) for current native build status. The original test results below remain historical evidence.

Implemented a separate [Flutter application](../../apps/mobile/README.md) and expanded the Laravel /api/v1 surface from 24 to 82 operations. Buyer, Seller and Rider flows share the existing website business rules, database, transactions and authorization. No database migration was added for this expansion.

## Executed checks

| Check                                        | Result                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full Laravel suite                           | 1,150 passed, 3 skipped; 9,185 assertions                                                                                                                                                |
| API feature subset                           | 61 passed; 387 assertions (included in full suite)                                                                                                                                       |
| Existing website browser suites              | 132 checks passed: Seller 17, Account 9, Logistics 19, Auth 42, Dashboard 45                                                                                                             |
| Real HTTP API smoke                          | 13 passed, including bearer/no cookies, role denial, once-only checkout/cancellation, support, financial reads and real multipart identity upload/re-review revocation                   |
| Flutter tests                                | 13 passed: transport/origin boundaries, persisted action UUIDs, uncertain writes, revocation/offline recovery, money/raw lists, three role workspaces, sign-in, multi-store cart and PDF |
| Flutter analysis                             | No issues found                                                                                                                                                                          |
| Website ESLint, TypeScript, production build | Passed                                                                                                                                                                                   |
| Android APK/bundle                           | Not built: Android SDK unavailable                                                                                                                                                       |
| iOS/native phone or emulator                 | Not run                                                                                                                                                                                  |

Backend/HTTP/browser tests use disposable synthetic fixtures; they do not prove deployed behavior or MySQL contention correctness. HTTP upload smoke configures an isolated writable PHP upload temporary directory; default XAMPP upload directory configuration should be checked on the actual server. Fixture emails/provider responses are faked.

Evidence is stored locally under storage/app/mobile-completion-2026-11-05; HTTP results are also under storage/app/mobile-api-http-check/results.json. Flutter widget captures under storage/app/flutter-ui-check are synthetic test renders, not device screenshots. No populated tokens or SDK files belong in Git.

## Repeat automated checks

```powershell
php artisan test tests/Feature/Api
php artisan test
node tests/Frontend/mobile-api-http-check.cjs
node scripts/generate-mobile-api-contract.cjs
npx.cmd eslint .
npx.cmd tsc --noEmit
npm run build
```

In apps/mobile:

```powershell
flutter pub get
flutter analyze
flutter test
```

Use package.json for the existing browser harness commands. Build website assets first. The [black-box guide](../BLACK_BOX_TESTING_GUIDE.md) and [CSV worksheet](../BLACK_BOX_TEST_RESULTS.csv) remain available for website testing; the following acceptance adds native coverage.

## Native/manual acceptance worksheet

Download the same checklist as an [Excel-compatible CSV](../MOBILE_ACCEPTANCE_CHECKLIST.csv), then record actual results, tester, date and evidence while testing on a device.

| Step | Action                                                                                    | Expected result                                                                           | Current status                |
| ---- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| 1    | Install Android SDK, doctor/licenses, debug APK, launch emulator/phone                    | Build/install succeeds; no native plugin or network errors                                | Not run                       |
| 2    | Register each role with valid/invalid documents and location selections                   | Required documents validated; verification/approval gates enforced                        | Device pending                |
| 3    | Use real SMTP, correct/wrong/expired/reused OTP and recovery                              | Mail arrives; invalid/reused tokens denied; reset revokes sessions                        | External service pending      |
| 4    | Configure real Google OAuth per platform and signing certificate                          | Verified linked login; new identity enrollment; no arbitrary email linking                | External service pending      |
| 5    | Buyer shops two stores, selects options/address/voucher, compares quote and COD           | Correct per-store shipping, parcel totals and once-only stock changes                     | Device pending                |
| 6    | Disconnect immediately after checkout, restart, explicitly retry same purchase            | Same order; no second stock deduction; changed purchase requires resolving pending intent | Device pending                |
| 7    | Seller edits inventory concurrently with purchase/another editor                          | Stale snapshots rejected; current stock reloads; held/retired variants protected          | MySQL/device pending          |
| 8    | Seller prepares and prints waybill on actual printer/PDF destination                      | Same parcel/tracking; one-package audit; repeated intent does not duplicate event         | Native printer pending        |
| 9    | Rider uses camera scan, permissions denied, manual fallback and wrong reference           | Correct reference required; manual entry needs reason; no unauthorized custody            | Native camera pending         |
| 10   | Rider records recipient, actual COD and proof; disconnect/restart/retry                   | Required proof/amount, same UUID, no duplicate receipt; proof remains private             | Native camera/network pending |
| 11   | Logistics website approves/assigns return; Rider collects; Seller receives intact/damaged | Role-scoped transitions; explicit restock; damaged goods not auto-restocked               | Device workflow pending       |
| 12   | Compare Seller profit/unsettled/payouts and Rider fees/payments with website              | Exact scoped totals; recorded payments do not imply bank transfers                        | Device acceptance pending     |
| 13   | Test support attachments, private evidence, cross-account IDs and revoked tokens          | Authorized access only; no path/bank/token leakage                                        | Device acceptance pending     |
| 14   | Change protected profile/document, background/restore app, logout/account switch          | Password/OTP enforced; re-review/revocation handled; pending intents remain user-scoped   | Secure storage/device pending |
| 15   | Small/large screens, dark/light, large text, TalkBack/VoiceOver and keyboard              | Readable controls, clear focus/errors, usable scanner/forms and no overflow               | Accessibility pending         |
| 16   | iOS build on macOS and repeat native scenarios                                            | Correct signing/permissions, storage, scanner/picker/printing and OAuth                   | Not run                       |

Before distribution, configure owned Android/iOS IDs, launcher assets, protected release signing and a reachable HTTPS server; run native and production-like MySQL acceptance. Existing generated Android release signing uses debug credentials and is not distribution-ready.

This work was not deployed, committed or pushed. Admin/Logistics management and financial approval/recording remain website workflows. The result is implemented mobile/API source with passing automated coverage, not a claim of 100% production readiness.
