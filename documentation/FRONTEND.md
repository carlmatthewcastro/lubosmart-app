<div align="center">

# Frontend

**The React interface, shared components and source code map.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This guide covers the implemented React and Inertia.js website and where to edit it. It combines interface conventions, development commands, role screen locations and the path from a URL to its Laravel data source.

**In this guide:** [Interface and development](#interface) · [Frontend code map](#code-map)

<a id="interface"></a>

## Interface and development

<a id="interface-context"></a>

### Context

React and TypeScript provide the interface. Inertia.js connects pages and forms to Laravel; Blade supplies the initial HTML document.

Start with the [frontend code map](FRONTEND.md#code-map) to find each role's dashboard, related screens, sidebar, shared components, and backend data source.

<a id="interface-source-locations"></a>

### Source locations

| Location                        | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `resources/js/app.tsx`          | Starts React/Inertia.js and resolves pages                |
| `resources/views/pages/`        | Public, account, marketplace, Admin and Logistics screens |
| `resources/views/components/`   | Shared layouts, forms, dialogs and UI components          |
| `resources/js/hooks/`           | Reusable UI behavior                                      |
| `resources/css/app.css`         | Tailwind styles and theme                                 |
| `resources/views/app.blade.php` | Inertia.js shell and asset loading                        |
| `vite.config.js`                | React, Laravel and Tailwind build integration             |

<a id="interface-communication-and-state"></a>

<a id="interface-how-it-works"></a>

### How it works

Laravel supplies page props through Inertia.js. React hooks manage local UI state; `useForm` manages form data/errors; Inertia.js links and router calls handle navigation/mutations. Selected panels use native `fetch` for JSON reads and polling.

No separate Redux, Zustand or TanStack Query layer is declared. The versioned API serves JSON to the existing frontend while Inertia.js navigation continues. Server-side validation and authorization remain authoritative.

<a id="interface-interface-guidance"></a>

### Interface guidance

Reuse existing components and the purple theme. Keep layouts responsive, fields labelled, errors visible, and buttons disabled while submitting. Support keyboard navigation, dark mode and reduced motion where the existing components do.

Role screens are documented under [Functions](WORKFLOWS.md#guide). Buyer password signup activates after email verification; Seller and Logistics applications require Admin review, and affiliated Rider applications require Logistics review.

<a id="interface-development-commands"></a>

<a id="interface-commands"></a>

### Commands

Run from `web/`:

```powershell
npm run dev
npm run build
npx tsc --noEmit
npx eslint resources/js
npm run format:check
```

SSR source/build configuration exists, but the Docker deployment runs the client asset build and has no SSR service.

---

<a id="code-map"></a>

## Frontend code map

<a id="code-map-how-it-works"></a>

### How it works

LubosMart uses Laravel + Inertia.js + React (TypeScript). The visible screens are `.tsx` files in `resources/views/pages`, rather than separate Blade templates for each role. `resources/views/app.blade.php` is the HTML shell: it loads assets, fonts, and the Inertia.js mount point.

<a id="code-map-dashboard-files-by-role"></a>

### Dashboard files by role

| Role                                     | Dashboard UI                                                                    | Dashboard URL          |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| Buyer                                    | [buyer/dashboard.tsx](../web/resources/views/pages/buyer/dashboard.tsx)         | `/dashboard/buyer`     |
| Seller                                   | [seller/dashboard.tsx](../web/resources/views/pages/seller/dashboard.tsx)       | `/dashboard/seller`    |
| Rider (legacy label: Courier)            | [rider/dashboard.tsx](../web/resources/views/pages/rider/dashboard.tsx)         | `/dashboard/rider`     |
| Logistics (legacy label: Sorting Center) | [logistics/dashboard.tsx](../web/resources/views/pages/logistics/dashboard.tsx) | `/dashboard/logistics` |
| Admin                                    | [admin/dashboard.tsx](../web/resources/views/pages/admin/dashboard.tsx)         | `/dashboard/admin`     |

Buyer, Seller, and Courier each own their dashboard title, description, primary action, workflow steps, and shortcut cards. Their common greeting, metric cards, recent activity, and layout live in [components/workspace/dashboard.tsx](../web/resources/views/components/workspace/dashboard.tsx). Edit that shared component when a change should apply to all three; add role-specific sections in the corresponding role page when it should apply to one role.

[pages/workspace/dashboard.tsx](../web/resources/views/pages/workspace/dashboard.tsx) dispatches the existing Inertia.js page to those role components. Current Buyer, Seller, Rider, Logistics and Admin requests render their dedicated role dashboards. The workspace dispatcher retains a legacy Logistics fallback.

The authenticated role and approval status are checked on the server. Choosing a different frontend component does not grant another role's access.

<a id="code-map-other-screens-by-role"></a>

### Other screens by role

Paths below are relative to `resources/views/pages/`. Some screens are intentionally shared across roles; inspect their role branches before changing them.

| Role                                     | Screen files                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer                                    | `marketplace/catalog.tsx`, `marketplace/cart.tsx`, `marketplace/orders.tsx`, `settings/addresses.tsx`                                               |
| Seller                                   | `marketplace/inventory.tsx`, `marketplace/orders.tsx`, `marketplace/waybill.tsx`, `marketplace/reports.tsx`                                         |
| Rider (legacy label: Courier)            | `marketplace/deliveries.tsx`, `marketplace/reports.tsx`                                                                                             |
| Logistics (legacy label: Sorting Center) | `logistics/parcels.tsx`, `logistics/shipping-rates.tsx`, `logistics/reports.tsx`, `management/accounts.tsx`, `management/registrations/`            |
| Admin                                    | `admin/`, `management/accounts.tsx`, `management/registrations/`, `marketplace/orders.tsx`, `marketplace/deliveries.tsx`, `marketplace/reports.tsx` |
| Shared account screens                   | `auth/`, `onboarding/application.tsx`, `settings/`, `support/`                                                                                      |
| Public website                           | `public/home.tsx`, `public/platform-information.tsx`                                                                                                |

Do not copy shared order, report, delivery, or account screens into each role folder. Shared files keep validation feedback and workflows consistent. Extract role-specific sections into components when those sections become substantially different.

<a id="code-map-sidebar-layout-and-styles"></a>

### Sidebar, layout, and styles

| What you want to change                      | File or folder                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Role menu labels, links, and groups          | [components/navigation/app-sidebar.tsx](../web/resources/views/components/navigation/app-sidebar.tsx)           |
| Navigation item rendering                    | [components/navigation/nav-main.tsx](../web/resources/views/components/navigation/nav-main.tsx)                 |
| Sidebar and main content arrangement         | [layouts/app/app-sidebar-layout.tsx](../web/resources/views/layouts/app/app-sidebar-layout.tsx)                 |
| Shared page headings, cards, fields, notices | [components/shared/marketplace-ui.tsx](../web/resources/views/components/shared/marketplace-ui.tsx)             |
| Reusable buttons, dialogs, inputs            | [components/ui/](../web/resources/views/components/ui)                                                          |
| Admin toolbar and floating messages          | [components/admin/](../web/resources/views/components/admin)                                                    |
| Sorting Center toolbar                       | [components/logistics/logistics-toolbar.tsx](../web/resources/views/components/logistics/logistics-toolbar.tsx) |
| Global colors, typography, and theme         | [resources/css/app.css](../web/resources/css/app.css)                                                           |
| Fonts, document metadata, asset loading      | [resources/views/app.blade.php](../web/resources/views/app.blade.php)                                           |

<a id="code-map-trace-a-screen-from-its-url"></a>

### Trace a screen from its URL

For example, `/dashboard/seller` follows this path:

1. [routes/web.php](../web/routes/web.php) matches `dashboard/{role}`.
2. [DashboardController.php](../web/app/Http/Controllers/DashboardController.php) verifies the role, queries Seller workspace data, and returns `seller/dashboard`.
3. [resources/js/app.tsx](../web/resources/js/app.tsx) resolves that name to `resources/views/pages/seller/dashboard.tsx`.
4. The resolved Seller page uses the shared dashboard components.
5. The shared `Page` component supplies the application layout and sidebar.

Edit React files for presentation. Edit the controller or its service for data and business behavior. Keep authorization in Laravel middleware, policies, and controllers; hiding a frontend button is not authorization.

In VS Code, press **Ctrl+P** and enter a path such as `seller/dashboard.tsx`. To find the backend for another screen, search **Ctrl+Shift+F** for its Inertia.js name, for example `marketplace/inventory`.

<a id="code-map-organization-for-future-work"></a>

### Organization for future work

Keep role dashboard entry files in `pages/buyer`, `pages/seller`, `pages/rider`, `pages/logistics` (Sorting Center), and `pages/admin`. Keep shared workflows under their existing domain folders (`marketplace`, `management`, `support`, `settings`). Put reusable UI in `components`, layouts in `layouts`, and backend behavior in Laravel's `app` folders.

This keeps the existing React/Inertia.js architecture and gives each role a clear starting point. Converting dashboards to Blade would be a separate architectural migration, rather than a folder cleanup.

---

<div align="center">

**LubosMart** · Frontend · [Documentation](README.md)

</div>
