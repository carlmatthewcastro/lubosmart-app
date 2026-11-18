> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Checkout shipping availability — 2026-11-12

Checkout now explains why each operational provider cannot quote the bag instead
of swallowing shipping validation errors and guessing that product weights are
missing. The response preserves the existing `options` field and adds
`unavailable` and `message`. Seller-specific messages name the public store but
do not add private pickup address or contact fields to failure responses.

The provider selector is disabled when there are no selectable options, its
status text is associated with the control, and the empty state links to the
existing support workflow. Removed the selector's unused feedback gap and
disabled Remove voucher when nothing has been entered or applied. Shipping
eligibility, account approval, COD, fees, and checkout validation remain intact.

Read-only local diagnosis found three operational centers and only one published
rate: Flash Express for Barangay II (Pob.), Pagsanjan, Laguna. The buyer's delivery
address matches it. Valora's selected pickup address is in Calios, Santa Cruz,
Laguna and has no matching active shipping rate. The product has a packed weight
of 25 grams. The other two centers have no matching destination rate. This is a
shipping setup gap; showing a company name alone would not make the shipment
serviceable. A logistics operator must configure the actual pickup coverage and
rate through the existing shipping rates workflow. No real shipping data was
changed and no rates were invented.

Validation:

- Logistics workspace and checkout feature tests: 77 passed, 958 assertions.
- Targeted ESLint, TypeScript, Prettier, PHP Pint: passed.
- Production build: passed; existing unresolved category-atlas-v1.png asset warning.
- Browser checks use a disposable SQLite database and synthetic accounts, with
  no changes to the configured application database.
- Headless Chrome: accurate seller pickup blocker, disabled empty provider/COD
  and voucher removal controls, and support link passed. No page overflow at
  320, 440, 768, and 1280px in light and dark themes; keyboard focus reachable.
  No JavaScript runtime or console errors. Screenshots and results are under
  `storage/app/checkout-shipping-ui-check/`.

Screen-reader behavior, measured contrast, and 200%/400% browser zoom require
manual verification. These checks do not establish WCAG conformance.

## Order summary reference update � 2026-11-16

Adapted the buyer cart summary to the supplied visual reference: store count,
expandable voucher selector with existing manual-code entry, delivery card with
real provider quotes and existing error/retry states, Lubos Coins switch, explicit
COD card, itemized payment details, and Place order action. Monetary values retain
the money helper and existing calculations. Checkout confirmation, eligibility,
request fields, and backend behavior are preserved. The taller desktop summary
uses normal page scrolling so its controls remain reachable. Semantic theme tokens
support light/dark surfaces; the voucher summary is keyboard operable and the coin
switch keeps its native input with a visible focus outline.

Validation: targeted ESLint, TypeScript, and Prettier passed. Checkout feature
suite passed: 26 tests, 114 assertions. Production build passed with unresolved
image warnings for returns-banner.svg, catalog-shopping-banner.svg,
orders-banner.svg, and category-atlas-v1.png in existing stylesheet references.

The supplied Companion Page snapshot has no connected page or document. Browser
visual checks, mobile reflow, actual contrast, screen-reader behavior, and
200%/400% zoom remain unverified for this batch. Automated checks do not establish
WCAG conformance.
