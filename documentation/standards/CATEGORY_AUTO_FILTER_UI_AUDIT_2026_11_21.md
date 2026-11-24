# Automatic category filtering — 2026-11-21

Category navigation preserves scroll and client state while applying the selected category immediately. More categories closes on selection, including reselecting the current category, and Escape returns focus to its summary. Category radio controls now apply immediately and close the mobile filter drawer after success. All products resets the listing. Applied server filters synchronize the form so a subsequent search or filter submission does not restore a previous category.

The existing active-category highlight remains. The implementation interprets the request as automatic filtering and closing the chooser; whether the highlight should also be removed was asked separately and remains unconfirmed.

Validation: targeted Catalog ESLint, TypeScript, production build, and MarketplaceCatalogTest passed (11 tests, 221 assertions). The build retains four existing artwork URL notices. An isolated Chrome run at 1440px and 375px passed dropdown selection and closure, sorting preservation, All products reset, Escape closure, immediate radio filtering, mobile drawer closure, and zero browser runtime errors. The click check waits for the mobile drawer's entrance animation before interacting.

Evidence: `.tools/development-artifacts/category-ui-check/`. The mobile screenshot was visually reviewed. Synthetic SQLite fixtures were used; no customer records were changed. Dark mode, screen readers, touch hardware, and zoom were not reviewed in this batch.
