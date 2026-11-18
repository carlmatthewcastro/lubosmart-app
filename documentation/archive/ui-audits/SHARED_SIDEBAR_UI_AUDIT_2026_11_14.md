> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

## Shared sidebar logo and actions (2026-11-14)

- Unified the collapsed sidebar width at 64px for all roles, removing the role-specific width override. Collapsed header/footer padding now leaves room for the full logo toggle and theme action.
- Shared menu actions use 44px collapsed targets with centered icons and hidden visual labels; accessible names/tooltips remain. Expanded labels wrap when needed instead of truncating. Navigation groups expose their existing category names as navigation landmarks.
- Kept the menu region vertically scrollable when collapsed so long Seller/Rider/Logistics menus retain access to their final action. Existing role routes, available actions, selected state, stored open/closed preference, theme selection and mobile drawer behavior are preserved.
- Passed targeted ESLint, TypeScript, production build and the 114 Settings/AccountSettings regression tests (741 assertions). Existing category-atlas-v1.png build warning remains outside this change.
- Isolated browser checks passed for Buyer, Seller, Rider and Logistics: full logo/action icon containment in collapsed mode, at least 44px action targets, reachable final menu item, mobile drawer logo containment and Escape closing. Buyer/Seller/Rider settings checks also passed; zero runtime errors. Screenshots/results: storage/app/account-settings-ui-check/.
- Reviewed representative collapsed desktop and mobile drawer screenshots. Full screen reader, measured contrast and 200%/400% zoom checks remain outstanding; automated tests are not WCAG certification. No Git or deployment operations performed.

## Buyer sidebar Settings removal (2026-11-15)

- Removed the Settings navigation entry for buyers in the shared sidebar, including its mobile drawer. Other role navigation and settings routes remain unchanged.
- Browser visual, keyboard, zoom and screen-reader checks were not performed for this small navigation removal; no WCAG compliance claim is made.
