> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Permanently expanded catalog filters — 2026-11-14

Replaced the desktop Filters disclosure with a named sidebar and static heading. Category and Availability are now named sections with static headings in both desktop and mobile filter forms. Removed their disclosure arrows and collapse behavior. Desktop sidebar width stays at 15rem. Mobile retains its existing filter drawer, closing controls, and submission behavior. Filter values, requests, sorting, and authorization remain unchanged.

Validation: targeted ESLint, TypeScript, production build, and the existing catalog filtering test passed (1 test, 60 assertions). Vite retained the runtime-resolved catalog banner/category atlas warnings.

An isolated temporary SQLite/headless Chrome check confirmed that clicking the desktop heading leaves controls visible, no disclosure elements remain in the sidebar, and mobile Category/Availability remain expanded in the drawer. No page overflow at 320/768/1440px in light and dark themes. Mobile light screenshot reviewed. Artifacts: storage/app/catalog-fixed-filters-check. Full keyboard/screen-reader, touch, zoom, and desktop visual review remain outstanding; these checks do not establish WCAG compliance.
