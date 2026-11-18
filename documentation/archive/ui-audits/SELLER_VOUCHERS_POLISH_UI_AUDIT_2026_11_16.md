> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Seller vouchers polish — 2026-11-16

Restored the seller dashboard's existing illustrated welcome banner. Updated store
vouchers with a lavender introduction, larger summary values, template offers,
ticket-style discount cards, visibility icons, grouped actions, and selected filters.
Existing voucher requests, funding calculations, confirmation dialogs, and routes
remain in use. Templates are disabled while store approval is pending, consistent
with the create action.

Validation: targeted ESLint and TypeScript passed; production build passed with
asset-resolution warnings for existing marketplace/category image paths. Voucher
feature tests passed (15 tests, 233 assertions). Existing browser check passed:
voucher creation dialog at 320/768/1440px, dark capture, Escape, template activation,
visibility updates, pause and status filtering. Updated its filter text selectors
to sentence case. Reviewed the 320px dialog screenshot.

Remaining verification: full-page visual review of populated voucher cards and the
restored seller banner across light/dark themes, zoom levels, and screen readers.
Automated checks do not establish WCAG compliance.

## Shared banner follow-up

Replaced the voucher page's separate ticket-icon introduction with DashboardWelcome
and its store illustration, matching the seller/admin banner structure. Restored
the admin illustration by removing its compact welcome mode. Seller already uses
the full shared banner. Targeted ESLint, TypeScript, and production build passed.
DashboardTest and DashboardSummaryTest passed (9 tests, 138 assertions). A broader
Dashboard name filter returned 48 passing tests and 3 failures in buyer stats
assertions (RoleAccessTest and BuyerWorkspaceTest); those assertions concern backend
props untouched by this banner change. Full visual acceptance remains pending.
The existing dashboard browser script timed out on a buyer orders search field
before reaching the role dashboard checks; no browser visual pass is claimed.

## Compact cards and history follow-up

Reduced voucher card padding, discount typography, icon size, and section spacing.
The responsive grid uses two columns at medium widths and three on wide screens.
Added a Usage history anchor beside the page actions and arranged redemption history
into labelled parcel/code, discount, redemption status, and date fields. Mobile
history remains a stacked list; existing pagination and mutations are preserved.

Validation: targeted ESLint and TypeScript passed. Voucher feature tests passed
(9 tests, 141 assertions). Production build passed with existing unresolved image
path warnings. Existing browser check passed voucher dialog sizes, template creation,
visibility updates, pause/resume filters, and waybill checks.

Remaining verification: populated card and history visual review at 320px,
light/dark themes, zoom, and assistive technology. The browser screenshots cover
the creation dialog rather than the revised populated history. No WCAG compliance
claim is made.

## History side panel follow-up

Moved usage history from the page footer into the shared right-side Sheet, opened
by the Usage history button. The panel fills mobile width and is capped at 32rem
on larger screens, with a title, description, built-in close action, scrolling,
and reduced-motion overrides. History pagination preserves component state and
scroll so the drawer stays open while changing history pages.

Validation: targeted ESLint, TypeScript, production build, and 9 voucher feature
tests (141 assertions) passed. Existing image-resolution build warnings remain.
Extended browser checks passed right alignment, responsive widths and no panel
overflow at 320/768/1440px, Escape dismissal and trigger focus restoration. Existing
voucher creation, template, mutations and filter checks also passed. Reviewed the
320px drawer screenshot. Populated history pagination, light/dark visual comparison,
zoom and screen-reader review remain unverified; no WCAG certification is claimed.

## Voucher action placement follow-up

Moved Create voucher, Usage history and Inventory into the Your vouchers heading
row, replacing the status filter buttons as requested. Removed the unused local
status filter state; all vouchers on the current page render with their existing
status badges. The history drawer and voucher actions retain their existing behavior.

Validation: targeted ESLint, TypeScript, production build and voucher feature tests
(9 tests, 141 assertions) passed. Existing build image-path warnings remain.
Updated the browser regression to remove obsolete filter interactions and verify
filter removal. Manual visual review at zoom and with assistive technology remains
pending.
