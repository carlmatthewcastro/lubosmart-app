# Marketplace redesign and responsive layout review

Date: 2026-11-14 (Asia/Manila)

Follow-up correction: the user requires the original homepage design and navbar
to remain the visual reference. Homepage presentation has been restored and its
navbar is reused on Marketplace and other public pages. The implementation
inventory below describes the initial batch; see
[the restoration report](../archive/ui-audits/HOME_DESIGN_RESTORATION_2026_11_14.md) for the superseding changes.

## Product provenance and visibility

A read-only review of the configured local database found seven products. IDs 12–14
are Sample Everyday Tote, Organizer, and Pouch, owned by the reserved local test
seller and carrying the exact description written by `CreateTestAccounts::createDemo`:
`Synthetic sample listing for local workflow testing.` They previously passed the
public eligibility scope. That exact provenance marker is now excluded by
`Product::availableToShoppers`; names containing “sample” are not broadly blocked.

The two DEMO Test Parcel records (15–16) were already hidden. Valora's The Day She
Said Goodnight (17) remains hidden. Sentient Magazine (18) belongs to the separate
approved Valora store, has ordinary seller content, passes the existing seller,
verification, category and publication checks, and remains eligible. This is a
classification from local records and creation code, not an external identity audit.

No records, orders, relationships, images or stock were deleted or changed. The
shared scope protects homepage discovery, catalog/search/category results, product
details, wishlists, public API reads and cart eligibility. Existing publication,
approval, category and email-verification gates remain in force. Homepage photo and
positive-stock requirements remain unchanged. No replacement products or reviews
were generated for the application.

## Implementation and modified files

Paths below are relative to the repository root. Many already contained unrelated
pending work; that work was retained. No branch switch, commit, push or deployment
was performed.

| File | Change for this task |
| --- | --- |
| `app/Models/Product.php` | Exclude the confirmed synthetic provenance marker in the shared shopper scope. |
| `app/Http/Controllers/MarketplaceController.php` | Validate and apply price bounds, availability including active variants, visible-review rating and allowlisted sorts; stable ID tie-breaks; 24 results per page; omit children of inactive category parents. |
| `routes/web.php` | Supply real active root categories to the homepage; existing routes and homepage product requirements retained. |
| `resources/views/components/navigation/public-header.tsx` | Compact shared public navigation and integrated search; preserve applied shop filters on search; mobile menu and account access. |
| `resources/css/public-header.css` | Responsive 64px desktop navbar, compact controls, two-row search below 1200px, mobile menu below 768px. |
| `resources/views/pages/marketplace/catalog.tsx` | Compact heading/category links, result count, working filters/sorts, desktop collapsible sidebar and Radix mobile drawer, reset and truthful empty states; public navbar supplies the search field, authenticated workspace supplies one local search. |
| `resources/css/storefront-catalog.css` | Neutral catalog background and heading; remove restrictive catalog width caps and decorative banner. |
| `resources/views/components/shared/marketplace-ui.tsx` | Compact storefront spacing and heading while retaining shared fluid workspace gutters and focused form widths. |
| `resources/views/components/marketplace/product-card.tsx` | Shared flat bordered cards, smaller rounded wishlist/cart controls, proportional contained photos and honest zero-review display; existing mutations, variant selection and authentication retained. |
| `resources/views/components/marketplace/home-discovery.tsx` | Reuse the catalog card treatment and responsive grid; show an actionable empty state. |
| `resources/views/pages/public/home.tsx` | Replace hardcoded category-name searches with links to actual active category IDs. |
| `resources/views/pages/marketplace/product.tsx` | Use shared storefront navigation and limit the individual product panel within the fluid page. |
| `resources/css/app.css` | Shared available-width product grid: one/two mobile columns, auto-fill desktop columns, bounded individual card width. |
| `resources/css/reference-marketplace.css` | Remove competing homepage-only product card/grid styling. |
| `resources/css/storefront-home-reference.css` | Remove competing homepage product styling and obsolete unused category sprite references. |
| `tests/Feature/MarketplaceCatalogTest.php` | Exercise visibility/non-deletion, genuine listings, wishlist/cart/API protection, price boundaries/sorts, variant availability, moderated ratings and invalid filter input. |
| `tests/Frontend/marketplace-redesign-check.cjs` | Exercise search/sort persistence, sparse results, collapse/drawer/reset/empty behavior, keyboard menu close, dark mode, missing images and requested viewport widths. |
| `tests/Frontend/responsive-layout-matrix.cjs` | Extend geometry checks to 320/375/768/1024/1440/1920px, public catalog/details, wishlists/cart, messaging and notifications. |
| `tests/Frontend/dashboard-browser-check.cjs` | Optional marketplace module and scoped login form selector, so navbar search is not mistaken for login submission. |

## Shared layout findings

The existing working tree already gives `Page`, `AppContent`, `SidebarInset`,
header-layout content and settings wrappers fluid outer widths. These were
preserved, including 16px mobile and 24–32px desktop gutters and sidebar state.
Intentional reading, authentication, modal, form and waybill maximum widths remain.
Tables retain their own scroll regions. No global overflow-hiding patch was added.

Catalog-specific 1376px/1440px limits and the gradient banner have been removed.
Product columns derive from the actual result area, including after collapsing
the filter sidebar or workspace navigation. Discovery cards have a 320px maximum; empty grid
tracks retain normal dimensions when there are only a few listings. Typical
desktop catalog results fit 3–6 columns, depending on available sidebar space;
mobile uses one column below 380px and two above it. Tablets fit 2–3 columns.
The homepage and catalog share the same card component and grid behavior.

## Validation

- Targeted ESLint, TypeScript and Prettier checks pass.
- Relevant PHP formatting checks pass.
- Homepage, marketplace flow, marketplace extensions and catalog tests: 54 passed,
  788 assertions, using the isolated test database.
- Production build passes. Obsolete category sprite references were removed after
  switching to actual category links.
- Full browser matrix: 408 viewport/sidebar geometry cases pass across 39 role/page
  combinations and three public pages. Totals: public 18, buyer 100, seller 80,
  rider 70, logistics 80 and admin 60. No document-level horizontal overflow, runtime
  exceptions or console errors were reported. Both expanded and collapsed workspace
  navigation are exercised at 768/1024/1440/1920px; mobile checks use 320/375px.
- Public interaction checks pass: search preserves sorting, sparse cards stay
  bounded, desktop filter collapse expands results, mobile filtering/reset/empty
  state works, Escape restores mobile-menu focus, dark mode works, and missing
  images use a neutral fallback. Desktop catalog, mobile dark catalog and logistics
  report screenshots were visually inspected.
- Browser fixtures run only in a guarded disposable SQLite stage with synthetic
  accounts; they do not populate or change the configured application database.
- Final production rebuild completed without warnings. The focused public rerun
  passed all 18 geometry cases, discovery interactions and runtime checks after
  the final stylesheet cleanup and direct product-page stylesheet imports.

Evidence: `storage/app/marketplace-redesign-check/` (screenshots and `results.json`),
`storage/app/marketplace-redesign-final-public/` (final public asset check), and
`storage/app/marketplace-redesign-build.log`.

## Limits and remaining verification

Representative route geometry does not establish every record/action combination.
The cart page contains checkout in this application; no new checkout or tracking
route was invented. Feature regressions cover cart and checkout behavior, while
browser checks cover representative layout and navigation. Manual screen reader,
200%/400% zoom, real-device touch, full contrast auditing and production Core Web
Vitals remain unverified; this is not a WCAG certification. Other unmarked test
data introduced outside the inspected local creation paths cannot be inferred from
names alone and would require provenance review.
