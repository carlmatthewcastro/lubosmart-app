> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Buyer voucher selection audit - 2026-11-16

The voucher visibility flag defaulted to private, existing vouchers had no seller
visibility control, and the buyer bag retained its manual code-entry form.

Changes:

- Custom vouchers receive generated codes and are public by default. Sellers can
  still choose private visibility before creation.
- Existing private vouchers remain private until their seller selects Show to
  buyers. Ownership and approved-store checks protect visibility changes.
- Buyers see the voucher picker expanded in their bag, select a voucher directly,
  and see its selected state, application feedback, or an explicit empty state.
  The code-entry field and manual apply form are removed.
- Workspace refreshes include public vouchers for the bag, shop, and product pages.
- Existing expiry, store minimum, capacity, buyer reuse, and checkout validation
  continue to govern discounts.
- Follow-up: unsuccessful voucher selection no longer leaves a pending code that
  blocks checkout without a discount. A disabled Place order button now has an
  associated status explaining the blocking account, stock, update, voucher,
  address, or shipping condition. Shipping and account requirements remain intact.

Validation:

- MarketplaceExtensionsTest: 20 tests passed, 290 assertions, including generated
  custom vouchers, buyer visibility, publication of existing private vouchers,
  cross-store denial, and existing discount/checkout protections.
- Targeted ESLint, TypeScript, PHP formatting, and production build passed.
- Follow-up checkout and voucher suites: 46 tests passed, 404 assertions.
- Build reports existing image URL resolution warnings for storefront artwork.

Manual browser, keyboard, screen reader, light/dark contrast, mobile reflow, and
zoom checks were not performed. Automated checks do not establish WCAG compliance.
