# Historical documentation archive

These records retain original findings, unique implementation details and test/migration/deployment evidence. They describe their stated dates and environments; no historical pass count or deployment claim was reverified during this cleanup. Links and relative source/asset paths were adjusted after moves.

Use the [current workflow guides](../workflows/README.md), [setup](../setup/README.md) and [testing index](../testing/README.md) for current navigation. In particular, old whole-parcel/manual-refund and pre-recipient-name POD instructions are superseded.

## Audits, repairs and handoffs

| Record | Original subject |
| --- | --- |
| [ADMIN_CENTER_SIMPLIFICATION_2026_11_16.md](reports/ADMIN_CENTER_SIMPLIFICATION_2026_11_16.md) | Admin Center simplification — 16 November 2026 |
| [AUTOMATED_TEST_REPORT_2026_11_05.md](reports/AUTOMATED_TEST_REPORT_2026_11_05.md) | Automated verification report |
| [BUYER_SELLER_VERIFICATION_2026_11_01.md](reports/BUYER_SELLER_VERIFICATION_2026_11_01.md) | Buyer and Seller logic verification |
| [FINANCE_AND_RETURNS_HISTORY.md](reports/FINANCE_AND_RETURNS_HISTORY.md) | Seller settlement, Logistics Rider payments, returns and profit |
| [FINANCIAL_FULFILLMENT_AUDIT_2026_11_11.md](reports/FINANCIAL_FULFILLMENT_AUDIT_2026_11_11.md) | Financial and fulfillment audit — 2026-11-11 |
| [FINANCIAL_FULFILLMENT_IMPLEMENTATION_2026_11_11.md](reports/FINANCIAL_FULFILLMENT_IMPLEMENTATION_2026_11_11.md) | Finance and fulfillment implementation — November 11, 2026 |
| [FRONTEND_HANDOFF.md](reports/FRONTEND_HANDOFF.md) | Frontend development handoff |
| [FULFILLMENT_PROTECTION_2026_11_11.md](reports/FULFILLMENT_PROTECTION_2026_11_11.md) | Fulfillment protection audit — November 11, 2026 |
| [FULFILLMENT_PROTECTION_VERIFICATION_2026_11_11.md](reports/FULFILLMENT_PROTECTION_VERIFICATION_2026_11_11.md) | Fulfillment protection — final verification, November 11, 2026 |
| [GITHUB_HANDOFF_2026_11_15.md](reports/GITHUB_HANDOFF_2026_11_15.md) | GitHub handoff — November 15, 2026 |
| [LOGISTICS_DEMO.md](reports/LOGISTICS_DEMO.md) | Logistics and Rider demonstration |
| [LOGISTICS_RIDER_VERIFICATION.md](reports/LOGISTICS_RIDER_VERIFICATION.md) | Logistics / Rider connection verification |
| [MOCK_DEFENSE_VERIFICATION_2026_11_09.md](reports/MOCK_DEFENSE_VERIFICATION_2026_11_09.md) | Mock-defense source verification |
| [PARCEL_SCANNING_HISTORY.md](reports/PARCEL_SCANNING_HISTORY.md) | Parcel scanning and free barcode generation |
| [PROJECT_ORGANIZATION.md](reports/PROJECT_ORGANIZATION.md) | Project organization and testing roadmap |
| [QR_POD_WORKFLOW_2026_11_14.md](reports/QR_POD_WORKFLOW_2026_11_14.md) | QR checkpoints and proof of delivery, 14 November 2026 |
| [RESUMED_WORK_2026_11_11.md](reports/RESUMED_WORK_2026_11_11.md) | Resumed work — November 11, 2026 |
| [RETURN_REFUND_REPAIR_2026_11_16.md](reports/RETURN_REFUND_REPAIR_2026_11_16.md) | Return/refund repair — November 16, 2026 |
| [RIDER_DEMO.md](reports/RIDER_DEMO.md) | Rider dashboard and local samples |
| [ROLE_FEATURE_AUDIT_2026_11_01.md](reports/ROLE_FEATURE_AUDIT_2026_11_01.md) | Role feature audit |
| [ROLE_NOTIFICATIONS.md](reports/ROLE_NOTIFICATIONS.md) | Role-based notifications implementation report |
| [SELLER_BUYER_COMPLETION.md](reports/SELLER_BUYER_COMPLETION.md) | Seller and buyer workflows and role connections |

## API implementation evidence

| Record | Original subject |
| --- | --- |
| [IMPLEMENTATION_2026_11_05.md](api/IMPLEMENTATION_2026_11_05.md) | Mobile API v1 implementation and verification |
| [MOBILE_COMPLETION_2026_11_05.md](api/MOBILE_COMPLETION_2026_11_05.md) | Mobile API and Flutter verification — November 5, 2026 |

## Deployment and release evidence

| Record | Original subject |
| --- | --- |
| [DEFENSE_SOURCE_RELEASE_2026_11_17.md](deployment/DEFENSE_SOURCE_RELEASE_2026_11_17.md) | Defense source release — 17 November 2026 |
| [DEMO_PREPARATION_RESULTS.md](deployment/DEMO_PREPARATION_RESULTS.md) | Demonstration preparation results — 17 November 2026 |
| [REFUND_RELEASE_READINESS_2026_11_16.md](deployment/REFUND_RELEASE_READINESS_2026_11_16.md) | Refund release readiness — 2026-11-16 |
| [RELEASE_2026_10_15.md](deployment/RELEASE_2026_10_15.md) | October 15, 2026 release handoff |

## UI implementation history

See the [UI audit inventory](ui-audits/README.md). Operational standards remain in [standards](../standards/UI_UX_RULES.md); dated verification belongs here.

## Records retained at existing paths

- [Android SDK/build record](../api/ANDROID_SETUP_2026_11_05.md): referenced by `scripts/android-mobile.cmd`; machine-specific historical evidence.
- Account creation [audit](../requirements/ACCOUNT_CREATION_AUDIT.md), [traceability](../requirements/ACCOUNT_CREATION_TRACEABILITY.md), [implementation plan](../requirements/ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md), [final report](../requirements/ACCOUNT_CREATION_FINAL_REPORT.md) and [evidence directory](../requirements/evidence/): preserved together with their workbook references. The audit retains one unresolved historical reference to the absent `app/Models/SortingCenter.php`; do not substitute a different model as if it were the same evidence.
- [Logistics implementation/acceptance](../standards/LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md), [marketplace redesign](../standards/MARKETPLACE_REDESIGN_2026_11_14.md) and [compact reference](../standards/MARKETPLACE_COMPACT_REFERENCE_2026_11_14.md): existing requirements/design context; recorded checks are historical.
- [Branch cleanup proposal](../BRANCH_CLEANUP_2026_11_17.md), [featured-card audit](../standards/HOME_FEATURED_CARD_LIMIT_UI_AUDIT_2026_11_17.md) and [Rider Android audit](../standards/RIDER_ANDROID_UI_AUDIT_2026_11_17.md): unrelated pending documentation retained at its original paths.
- Mobile [redesign record](../../apps/mobile/REDESIGN_2026_11_17.md) and [device record](../../apps/mobile/DEVICE_TEST_2026_11_17.md): retained alongside ongoing mobile work.

[Documentation index](../README.md)
