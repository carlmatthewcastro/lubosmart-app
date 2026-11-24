# Dashboard chart icon removal — 2026-11-21

Removed the screenshot's ChartNoAxesCombined icon from dashboard overview headings, admin welcome and order metrics, admin sales analytics, the platform illustration, and the legacy center reports action. Shared welcome, metric, and quick-action components now allow an omitted icon without leaving an empty icon wrapper.

Validation: targeted ESLint, TypeScript, production build, and DashboardTest / DashboardSummaryTest passed (9 tests, 138 assertions). A source search confirms no remaining uses of this icon in dashboard pages or their content components. The build reported four unresolved artwork URLs.

Limits: browser visual comparison, light/dark appearance, mobile reflow, zoom, keyboard, and screen-reader review were not performed for this batch.
