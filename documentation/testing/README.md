# Testing and acceptance

Use the [black-box testing guide](BLACK_BOX_TESTING_GUIDE.md) as the main execution method. Supporting references are the [feature checklist](SYSTEM_FEATURE_CHECKLIST.md) and [workspace acceptance walkthrough](WORKSPACE_ACCEPTANCE.md). Their older workflow examples must be reconciled with the current [scanning/POD](../workflows/PARCEL_SCANNING.md) and [finance/returns](../workflows/FINANCE_AND_RETURNS.md) guides, particularly version-3 partial-item returns and immediate approved coin credits.

Result templates remain at their existing paths: [black-box results CSV](../BLACK_BOX_TEST_RESULTS.csv) and [mobile acceptance CSV](../MOBILE_ACCEPTANCE_CHECKLIST.csv). A template or a Not Run case is not evidence of a pass. Record the actual revision/build, environment, steps, result, evidence and unresolved defects for a future run; do not copy historical totals into new acceptance results.

## Dated results

- [November 5 backend/browser report](../archive/reports/AUTOMATED_TEST_REPORT_2026_11_05.md)
- [November 5 mobile verification](../archive/api/MOBILE_COMPLETION_2026_11_05.md)
- [November 14 QR/POD report](../archive/reports/QR_POD_WORKFLOW_2026_11_14.md)
- [November 16 return/refund repair](../archive/reports/RETURN_REFUND_REPAIR_2026_11_16.md)
- [November 17 physical Rider record](../../apps/mobile/DEVICE_TEST_2026_11_17.md)
- [All historical reports and UI audits](../archive/README.md)

These preserve their original pass/fail/skip counts and limits. They are not a current combined test result. Source presence, successful builds and generated camera streams do not establish physical-device acceptance, MySQL concurrency safety, external-service delivery or WCAG compliance.

## Safe future execution

Before database-backed checks, inspect `phpunit.xml`, the process environment and cached configuration. Use disposable databases/uploads, synthetic accounts and fake external services. Never point a harness at populated application data. Review each harness's fixtures and cleanup behavior before running it; SQLite evidence does not establish MySQL row-lock behavior.

No application tests, builds or test harnesses were run during this documentation cleanup. Only local document links/assets, whitespace and scope were checked. Commands in historical reports are reproduction instructions, not commands executed by this task.

[Documentation index](../README.md)
