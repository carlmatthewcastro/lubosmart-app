> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Animated theme toggle — 2026-11-15

Applied the supplied light/dark toggle reference to the existing navbar and shared
sidebar controls. Shared decorative visuals crossfade and rotate between a sun
with a cloud and a filled moon with a star; the switch thumb slides over 300ms.
The active track uses LubosMart's purple token. Sidebar state text is now
`On · Dark` / `Off · Light` to avoid wrapping in the expanded sidebar.

Existing appearance storage, cross-tab synchronization, routes and role behavior
are preserved. Controls retain native button behavior, accessible action names,
focus styles and the sidebar's switch semantics. Decorative artwork is hidden
from assistive technology. Reduced-motion settings disable the transitions.

## Validation

- Targeted ESLint and TypeScript passed after the final source change.
- Production build passed after the final source change. Existing runtime image
  resolution warnings remain for returns, catalog and orders banners and the
  category atlas.
- DashboardTest passed: 4 tests, 34 assertions, before the final text-only change.
- A focused headless Chrome check passed navbar light/dark interaction at 320,
  768 and 1440px, a minimum 44px target height, no document horizontal overflow,
  persistence across registration/home navigation and native Enter activation.
- The same focused check verified the expanded buyer sidebar switch updates
  `aria-checked` and reduced-motion removes the thumb transition. Light/dark
  screenshots were captured. The original acceptance script uses stale homepage
  selectors and could not serve as the complete check.
- The focused run stopped when its collapse selector did not match the current
  logo button. After correcting that selector, the final rerun was blocked before
  browser launch by an unrelated, newly present migration:
  `2026_11_15_145724_add_cash_receipt_history_and_weekly_compensation.php`, whose
  line 2 imports `IlluminateDatabaseMigrationsMigration`. That migration was not
  changed as part of this UI task.

Screenshots and the focused disposable acceptance script are under
`storage/app/theme-toggle-ui-check/` and
`storage/app/theme-toggle-browser-check.cjs`. Later failed attempts may overwrite
the results summary; the partial successful checks above describe the observed
run, not a fully passing final browser run.

Collapsed sidebar operation, mobile sidebar behavior, zoom, screen-reader output
and measured contrast remain unverified. The final shortened sidebar text was
checked statically; its browser rerun was blocked as described above. Automated
checks and screenshots do not establish WCAG compliance.
