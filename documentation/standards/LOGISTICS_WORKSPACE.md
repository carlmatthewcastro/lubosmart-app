# Logistics workspace

The approved Logistics role uses the admin-style navigation shell with its own operations. The logo toggles navigation; the topbar provides scoped search, messaging, operational queues and the account menu. The sidebar ends with the theme control.

| Requirement | Working entry point |
| --- | --- |
| Login | /login, then /dashboard/sorting_center after verification and approval |
| Dashboard | /dashboard/sorting_center; current company metrics, priority queues and parcel workflow |
| Rider approval/rejection | /reviews; only submitted Rider applications for the operator's operational centers |
| Rider activation/deactivation | /logistics/riders, then Manage rider; approved registration and verified email are required for reactivation |
| Confirm seller pickup | /deliveries?stage=pickups |
| Incoming parcels | /deliveries?stage=incoming; confirm receipt at the center |
| Parcel sorting | /deliveries?stage=sorting; sorting follows receipt |
| Area/rider assignment | /deliveries?stage=dispatch; use Rider Coverage and eligible Rider service areas |
| Delivery monitoring | /deliveries?stage=monitoring |
| Reports/export | /reports, with delivered-date filters and Logistics CSV export |
| Chat/messaging | /support?kind=message or topbar message button |
| Own account management | /settings/profile and /settings/password |
| Logout | Account menu, Log out (POST /logout) |

Rider account management is restricted to Logistics. Buyer, Seller, Logistics and Admin accounts cannot be managed by Logistics. Other companies' Riders, private application documents, center operations, reports and conversations remain scoped by the existing server queries and policies. The bell opens operational queue shortcuts; it is not a claim of a live notification feed.

Validation (2026-10-15): full backend suite passed 905 tests with 3 existing skips, including approval boundaries, pickup/receiving/sorting/dispatch prerequisites, coverage assignment, reports and messaging isolation. An additional 38 account/security/password tests passed after correcting the Settings page heading. Formatting, changed-component ESLint, TypeScript and production build passed. Isolated Logistics browser checks exercise actual login, all workflow destinations, Rider-only search, queue/account menus, mobile sidebar, tablet/landscape and dark mode. Full screen-reader/zoom compliance, real email inbox delivery and production data were not validated.
