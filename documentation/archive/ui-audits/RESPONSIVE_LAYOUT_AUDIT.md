> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Global responsive layout audit

Date: 2026-11-10

## Root causes and scope

The shared Page wrapper capped operational pages at 72rem, settings had an independent 72rem cap, and header-layout content/navigation capped at 80rem. These constraints persisted after the existing sidebar collapsed. Public homepage sections were capped at 1180px (benefits at 1030px), with a separate 600px tablet cap. Product columns depended on viewport width rather than the remaining content width.

Audited shared sidebar/header shells, Page, settings wrappers, all page-level max-width matches, storefront sections, product grids, and navigation. Shared Page changes reach dashboards, account settings, orders, inventory, logistics, reports, support, notifications, and listings across roles. Registration review also had an inappropriate outer 48rem constraint, now removed. This is a layout change only; routes, data, authentication, authorization, APIs and workflows are unchanged.

## Changed files and behavior

- components/shared/marketplace-ui.tsx: Page and guest header use available width with existing 16/24/32px gutters. Existing unrelated component changes retained.
- components/shell/app-content.tsx and components/ui/sidebar.tsx: flexible minimum widths and merged class overrides prevent content from imposing a minimum width on the sidebar layout. Existing SidebarProvider state and icon collapse behavior retained.
- components/navigation/app-header.tsx: header and breadcrumbs share responsive full-width gutters.
- layouts/settings/layout.tsx: removes the separate outer settings cap; navigation retains its width while the detail panel grows.
- pages/settings/profile.tsx, password.tsx, account.tsx and components/settings/operational-profile.tsx: focused editable form content retains readable widths within expanding cards.
- pages/management/registrations/show.tsx: registration review fills available width while its existing information hierarchy remains.
- css/storefront.css and pages/public/home.tsx: full-width homepage sections and announcements retain balanced gutters, readable text, and proportionate hero grid tracks. Public homepage remains independent of dashboard sidebar state.
- css/app.css: product grids above 768px use available-width auto-fill columns with a 240px minimum; mobile one/two-column behavior retained. Existing homepage product limits and pagination unchanged.
- UI_UX_RULES.md: records the user's full-width requirement in place of the earlier 72rem default.
- tests/Frontend/responsive-layout-matrix.cjs and dashboard-browser-check.cjs: optional viewport/sidebar matrix reuses isolated fixtures and existing browser helpers.

Intentional authentication, onboarding, waybill, modal, short-text, and focused-form max widths remain. Tables retain their local scrolling regions. No overflow-hiding rule was added to mask dashboard overflow.

## Validation

ESLint, TypeScript, formatting checks and production build passed. Relevant Laravel regression tests passed: 110 tests, 613 assertions. Browser matrix results and screenshots are stored under storage/app/responsive-layout-check and storage/app/responsive-layout-remaining. Combined browser results: 303 viewport/sidebar geometry cases passed across the public homepage and 27 role/page combinations. The remaining-role rerun also reported zero runtime exceptions or console errors. Combined evidence is in storage/app/responsive-layout-summary/results.json.

The first browser attempt exposed a test-harness timing issue after changing from mobile to desktop; the harness now waits for the existing responsive sidebar state before toggling. A later run stopped when the Vite manifest was temporarily unavailable; a completed production rebuild restored it before rerunning. No application logic was modified to bypass either issue.

## Limits

Representative browser checks cover geometry and runtime behavior, not every record, action or route. Screenshots use synthetic fixtures, including accounts without registration details. Screen reader, zoom, contrast and real-device touch verification are not established by these checks. No WCAG certification or real-user performance measurement is claimed. No commit, push, deployment or branch change performed.

## Browser coverage

| Role | Pages checked at 1920, 1440, 1366, 1024, 768 and 390px |
| --- | --- |
| Public | Homepage |
| Buyer | Dashboard, profile, password, addresses, shop, orders |
| Seller | Dashboard, profile, password, addresses, inventory, orders |
| Rider | Dashboard, profile, password, addresses, deliveries |
| Logistics | Dashboard, profile/account settings, password, addresses, incoming deliveries, reports |
| Admin | Dashboard, profile, password, accounts |

At desktop/tablet widths, both expanded and icon-only sidebar states were exercised through the existing toggle without reloading. Checks assert the active sidebar state, full available outer content width, and absence of document-level horizontal overflow. Desktop and mobile screenshots were captured; representative public homepage, Seller Settings and Logistics Reports screenshots were visually inspected. Dark mode, keyboard and zoom were not separately exercised in this run. Shared layout inspection covers messaging and notifications; those routes were not individually included in the browser matrix.
