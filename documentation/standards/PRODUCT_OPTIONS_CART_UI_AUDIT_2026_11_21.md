# Product option picker and cart labels — 2026-11-21

Updated the existing shared ProductCard used by homepage and marketplace listings.

- Guest/sample shopping actions now read “Add to cart” and retain the existing login destination. Restricted buyers and other roles retain their existing application/shop destinations. Authentication and approval requirements are unchanged.
- Replaced the native size/color dropdown with labeled native radio option cards showing names, stock, selected styling and disabled sold-out choices. The fieldset supports keyboard arrows and uses a unique group name per product card.
- The dialog shows product name and price, selected stock and inline server validation errors. Done retains the selection; the primary action adds the selected variant directly for an eligible buyer and closes only after success. Guest dialog actions continue to login.
- Reused the existing cart request, shared Button and Radix Dialog. Compact product/image geometry remains intact.

## Validation

Targeted ESLint, TypeScript, formatting and production build passed. Existing runtime artwork URL build notices remain. MarketplaceFlowTest and MarketplaceExtensionsTest passed: 44 tests, 762 assertions.

The existing disposable browser regression passed in Chrome and Edge. It checks eight homepage/shop viewport widths, layout alignment, guest cart labels/login URLs, selection disabled until a choice is made, sold-out options, saved selection, native arrow keys, Escape/focus restoration, mobile dialog fit and list modes. An approved synthetic buyer clicks the card cart action, chooses a variant, adds it from the dialog, sees the dialog close on success and verifies the selected variant in the cart.

Desktop, mobile and dark option-picker screenshots visually reviewed. Evidence: `.tools/development-artifacts/storage-app/product-card-ui-check/{chrome,edge}/product-options-{desktop,mobile,dark}.png`, with each browser's `results.json`.

## Limits

Browser checks use isolated synthetic SQLite records and do not contact customer accounts. Physical touch, screen-reader and 200%/400% zoom audits were not performed. Server-error display was implemented but not forced during the browser run. These checks do not certify WCAG conformance. No deployment was performed.
