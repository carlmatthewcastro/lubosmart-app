> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Seller return reference — 2026-11-16

Seller returned-goods receipt now prefills the selected parcel's original
tracking reference and makes it read-only. Instructions ask the seller to match
the physical parcel and inspect its condition, without requiring a scanner.
Condition, restocking decision and inspection notes remain explicit decisions.
The existing authorized receipt endpoint validates the reference and persists
receipt, inventory decisions and return history. Financial refund checks remain
in place; no refund is fabricated when receipt, reconciliation, responsibility,
buyer consent or actual backing is missing.

Targeted ESLint, TypeScript, production build and return/settlement feature tests
are run for this change. Results are reported with task completion. Browser,
keyboard, zoom and theme verification remain pending; automated checks do not
establish accessibility compliance. The reported failing refund still requires
the affected parcel and its displayed error to identify its specific blocker.
