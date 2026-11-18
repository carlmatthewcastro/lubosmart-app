> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Homepage design restoration

Date: 2026-11-14 (Asia/Manila)

The user clarified that the homepage before the marketplace redesign is the
approved reference. Its existing navbar must also appear on Marketplace and
other public pages reached from the homepage.

## Changes

- Restored `public-header.tsx` to its previous markup, 44px logo, mixed-case
  LubosMart wordmark, navigation, account controls and integrated rounded search.
  Existing search-state synchronization, filter preservation and keyboard Escape
  behavior remain without changing the restored appearance.
- Removed the replacement `public-header.css`. The header uses the original
  `reference-marketplace.css` and `storefront-home-reference.css` styles.
- Shared `Page` guest navigation now renders that same header with the same
  homepage style context, including on Marketplace and product details. The
  wrapper has no page-height minimum, so it does not introduce empty space.
- Restored the homepage's seven category labels, artwork, original destinations
  and compact featured-product presentation. Product/category styles removed in
  the prior batch were recovered from a saved pre-redesign local build and
  restored to `storefront-home-reference.css`, preserving media-query ordering.
- `home-discovery.tsx` again uses the previous compact ProductCard variant and
  homepage grid. Compact cards retain their original borders, wishlist treatment
  and hover behavior. Marketplace grids and filtering remain separate.
- Removed the unused categories prop added to the homepage route in the prior
  batch. Product records and shopper eligibility rules are unchanged by this
  restoration: confirmed samples stay excluded and eligible seller products remain.
- Recorded the approved homepage requirement in `UI_UX_RULES.md` and marked the
  earlier marketplace audit's presentation changes as superseded.

## Validation

ESLint, TypeScript, Prettier, relevant Pint checks and production build pass.
Homepage/catalog feature regressions: 19 passed, 310 assertions.

Browser checks confirm identical homepage/Marketplace navbar height, search
width, brand width/name and link destinations at 375, 768, 1440 and 1920px.
Search, sorting, mobile filters/reset, menu Escape, dark mode and neutral missing
images pass. Eighteen public layout cases pass across Home, Marketplace and
product details at 320/375/768/1024/1440/1920px, without document overflow or
browser runtime errors. Restored desktop homepage screenshot was visually reviewed.

Evidence: `storage/app/home-design-restoration-check/` and
`storage/app/home-restoration-build.log`. The existing Vite warning about the
runtime category-atlas URL remains; category artwork rendered in the browser.
Screen reader, full contrast, zoom and real-device touch audits remain unverified.
No branch change, commit, push, deployment or database mutation was performed.
