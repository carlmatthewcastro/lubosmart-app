# Where to edit the frontend

LubosMart uses Laravel + Inertia + React (TypeScript). The visible screens are `.tsx` files in `resources/js/pages`, rather than separate Blade templates for each role. `resources/views/app.blade.php` is the HTML shell: it loads assets, fonts, and the Inertia mount point.

## Dashboard files by role

| Role | Dashboard UI | Dashboard URL |
| --- | --- | --- |
| Buyer | [buyer/dashboard.tsx](../../resources/js/pages/buyer/dashboard.tsx) | `/dashboard/buyer` |
| Seller | [seller/dashboard.tsx](../../resources/js/pages/seller/dashboard.tsx) | `/dashboard/seller` |
| Rider / Courier | [courier/dashboard.tsx](../../resources/js/pages/courier/dashboard.tsx) | `/dashboard/courier` |
| Sorting Center | [logistics/dashboard.tsx](../../resources/js/pages/logistics/dashboard.tsx) | `/dashboard/sorting_center` |
| Admin | [admin/dashboard.tsx](../../resources/js/pages/admin/dashboard.tsx) | `/dashboard/admin` |

Buyer, Seller, and Courier each own their dashboard title, description, primary action, workflow steps, and shortcut cards. Their common greeting, metric cards, recent activity, and layout live in [components/workspace/dashboard.tsx](../../resources/js/components/workspace/dashboard.tsx). Edit that shared component when a change should apply to all three; add role-specific sections in the corresponding role page when it should apply to one role.

[pages/workspace/dashboard.tsx](../../resources/js/pages/workspace/dashboard.tsx) dispatches the existing Inertia page to those role components. Laravel still returns `workspace/dashboard`, preserving existing responses and tests. Its Sorting Center fallback is legacy; actual Sorting Center requests render `logistics/dashboard`.

The authenticated role and approval status are checked on the server. Choosing a different frontend component does not grant another role's access.

## Other screens by role

Paths below are relative to `resources/js/pages/`. Some screens are intentionally shared across roles; inspect their role branches before changing them.

| Role | Screen files |
| --- | --- |
| Buyer | `marketplace/catalog.tsx`, `marketplace/cart.tsx`, `marketplace/orders.tsx`, `settings/addresses.tsx` |
| Seller | `marketplace/inventory.tsx`, `marketplace/orders.tsx`, `marketplace/waybill.tsx`, `marketplace/reports.tsx` |
| Rider / Courier | `marketplace/deliveries.tsx`, `marketplace/reports.tsx` |
| Sorting Center | `logistics/parcels.tsx`, `logistics/shipping-rates.tsx`, `logistics/reports.tsx`, `management/accounts.tsx`, `management/registrations/` |
| Admin | `admin/`, `management/accounts.tsx`, `management/registrations/`, `marketplace/orders.tsx`, `marketplace/deliveries.tsx`, `marketplace/reports.tsx` |
| Shared account screens | `auth/`, `onboarding/application.tsx`, `settings/`, `support/` |
| Public website | `public/home.tsx`, `public/platform-information.tsx` |

Do not copy shared order, report, delivery, or account screens into each role folder. Shared files keep validation feedback and workflows consistent. Extract role-specific sections into components when those sections become substantially different.

## Sidebar, layout, and styles

| What you want to change | File or folder |
| --- | --- |
| Role menu labels, links, and groups | [components/app-sidebar.tsx](../../resources/js/components/app-sidebar.tsx) |
| Navigation item rendering | [components/nav-main.tsx](../../resources/js/components/nav-main.tsx) |
| Sidebar and main content arrangement | [layouts/app/app-sidebar-layout.tsx](../../resources/js/layouts/app/app-sidebar-layout.tsx) |
| Shared page headings, cards, fields, notices | [components/marketplace-ui.tsx](../../resources/js/components/marketplace-ui.tsx) |
| Reusable buttons, dialogs, inputs | [components/ui/](../../resources/js/components/ui/) |
| Admin toolbar and floating messages | [components/admin/](../../resources/js/components/admin/) |
| Sorting Center toolbar | [components/logistics-toolbar.tsx](../../resources/js/components/logistics-toolbar.tsx) |
| Global colors, typography, and theme | [resources/css/app.css](../../resources/css/app.css) |
| Fonts, document metadata, asset loading | [resources/views/app.blade.php](../../resources/views/app.blade.php) |

## Trace a screen from its URL

For example, `/dashboard/seller` follows this path:

1. [routes/web.php](../../routes/web.php) matches `dashboard/{role}`.
2. [DashboardController.php](../../app/Http/Controllers/DashboardController.php) verifies the role, queries the metrics, and returns `Inertia::render('workspace/dashboard', ...)`.
3. [resources/js/app.tsx](../../resources/js/app.tsx) resolves that name to `pages/workspace/dashboard.tsx`.
4. The dispatcher selects `pages/seller/dashboard.tsx`, which uses the shared dashboard component.
5. The shared `Page` component supplies the application layout and sidebar.

Edit React files for presentation. Edit the controller or its service for data and business behavior. Keep authorization in Laravel middleware, policies, and controllers; hiding a frontend button is not authorization.

In VS Code, press **Ctrl+P** and enter a path such as `seller/dashboard.tsx`. To find the backend for another screen, search **Ctrl+Shift+F** for its Inertia name, for example `marketplace/inventory`.

## Organization for future work

Keep role dashboard entry files in `pages/buyer`, `pages/seller`, `pages/courier`, `pages/logistics` (Sorting Center), and `pages/admin`. Keep shared workflows under their existing domain folders (`marketplace`, `management`, `support`, `settings`). Put reusable UI in `components`, layouts in `layouts`, and backend behavior in Laravel's `app` folders.

This keeps the existing React/Inertia architecture and gives each role a clear starting point. Converting dashboards to Blade would be a separate architectural migration, rather than a folder cleanup.

[Front End](README.md) · [Role functions](../README.md#functions)
