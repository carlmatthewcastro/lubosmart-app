> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Rider COD handover — 2026-11-16

The rider COD handover queue now exposes Submit COD handover for delivered
collections owned by the assigned delivery rider. The form displays the fixed
collected COD amount and a system-derived collection reference, with optional notes.
The confirmation asks the rider to confirm physical handover. Existing shared
fields, confirmation dialog, processing state, and error feedback are reused.

Submission is an audited parcel event and not a receipt or reconciliation.
The rider and Logistics see the submitted details and Awaiting Logistics
confirmation. Logistics receives an action-required notification and independently
records the cash received. COD remains collected and included in the pending cash
queue until that confirmation. A recorded discrepancy permits another rider
submission. Retried pending submissions do not create duplicate events or alerts.
No schema migration is required.

The normal Logistics receipt confirms the same fixed rider amount and reference;
the server rejects overrides. Report cash discrepancy separately enables the
actual amount and requires a reason when it differs. Historical collections with
no rider submission retain their backend receipt compatibility.

Logistics can then open Shipping & Remittances → View details → Hand over cash
to Admin. The server derives the product cash amount and generates an LMHO
reference; shipping remains with Logistics. Submission is audited, idempotent and
company scoped. Admin receives an action-required notification linking to that
page. Admin can verify COD reconciliation there and then choose Confirm cash
received from Logistics. The receipt uses the same submission reference and fixed
product amount. Actual receipt date and evidence remain required. Submission
does not create a platform receipt or release Seller funds. Existing historical
Admin receipt recording remains available.

Validation: 139 feature tests pass (2,284 assertions) across RiderWorkspaceTest,
LogisticsWorkspaceTest, SettlementAndReturnsTest and NotificationInboxTest.
Targeted ESLint, TypeScript, Prettier, PHP formatting and whitespace checks pass.
Production build passes with existing runtime asset-resolution warnings for
catalog, orders, returns and category artwork.

Browser verification of mobile reflow, both themes, keyboard, screen reader and
zoom remains pending. Automated checks do not establish WCAG compliance.
