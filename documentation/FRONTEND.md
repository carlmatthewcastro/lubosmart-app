<div align="center">

# Frontend

**React/Inertia.js conventions and a screen-to-source map.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

<a id="interface"></a>

## Interface and development

React and TypeScript render the website. Laravel supplies Inertia.js page props, redirects and validation errors; Blade provides the initial HTML shell. Follow the [UI/UX standards](standards/UI_UX_RULES.md) before changing presentation.

Paths below are relative to `web/`. React pages and most shared components intentionally live under `resources/views/`; they are not per-role Blade templates.

| Location                                                  | Purpose                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `resources/js/app.tsx`                                    | Starts React/Inertia.js and resolves page names                 |
| `resources/views/pages/`                                  | Public, authentication, account and role screens                |
| `resources/views/components/`, `resources/views/layouts/` | Shared UI, navigation and application layouts                   |
| `resources/js/hooks/`, `resources/js/types/`              | Reusable behavior and types                                     |
| `resources/css/app.css`                                   | Global styles and theme tokens                                  |
| `resources/views/app.blade.php`                           | Fonts, document metadata and Inertia.js mount point             |
| `vite.config.js`, `tsconfig.json`                         | Build integration, resolution aliases and included source paths |

### Data and interaction

React hooks manage local state; Inertia.js `useForm`, links and router calls handle forms and navigation. Some panels use `fetch` for JSON reads/polling. SWR is also used by account settings, change requests and the notification inbox. No Redux, Zustand or TanStack Query dependency is declared.

Reuse shared components and existing request patterns. Preserve form values, server errors, submission feedback, keyboard paths, responsive layouts, dark mode and reduced-motion behavior. Authorization and business rules stay on the server; changing the visible role component cannot grant access. Use [Workspaces](WORKSPACES.md) for role requirements and [Workflows](WORKFLOWS.md) for transitions.

<a id="interface-commands"></a>
<a id="interface-development-commands"></a>

### Verification commands

Run from `web/`:

```powershell
npx eslint resources/js resources/views
npx tsc --noEmit
npm run format:check
npm run build
```

Target ESLint to changed files when appropriate, including `.tsx` files under `resources/views/`. Review the complete [UI/UX verification requirements](standards/UI_UX_RULES.md#performance-and-validation) for relevant tests and browser acceptance. These commands do not establish accessibility compliance. SSR source/build configuration exists, but Compose runs the client build and defines no SSR service.

<a id="code-map"></a>

## Frontend code map

### Dashboards and related screens

The role dashboard entry points below are under `resources/views/pages/`. Shared workflows remain in domain folders.

| Role      | Dashboard                                                                                               | Other screens                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer     | [buyer/dashboard.tsx](../web/resources/views/pages/buyer/dashboard.tsx), `/dashboard/buyer`             | `marketplace/catalog.tsx`, `marketplace/cart.tsx`, `marketplace/orders.tsx`, `settings/addresses.tsx`                                    |
| Seller    | [seller/dashboard.tsx](../web/resources/views/pages/seller/dashboard.tsx), `/dashboard/seller`          | `marketplace/inventory.tsx`, `marketplace/orders.tsx`, `marketplace/waybill.tsx`, `marketplace/reports.tsx`                              |
| Rider     | [rider/dashboard.tsx](../web/resources/views/pages/rider/dashboard.tsx), `/dashboard/rider`             | `marketplace/deliveries.tsx`, `marketplace/reports.tsx`                                                                                  |
| Logistics | [logistics/dashboard.tsx](../web/resources/views/pages/logistics/dashboard.tsx), `/dashboard/logistics` | `logistics/parcels.tsx`, `logistics/shipping-rates.tsx`, `logistics/reports.tsx`, `management/accounts.tsx`, `management/registrations/` |
| Admin     | [admin/dashboard.tsx](../web/resources/views/pages/admin/dashboard.tsx), `/dashboard/admin`             | `admin/`, account/registration management and shared order/delivery/report screens                                                       |
| Shared    | —                                                                                                       | `auth/`, `onboarding/application.tsx`, `settings/`, `support/`                                                                           |
| Public    | —                                                                                                       | `public/home.tsx`, `public/platform-information.tsx` and public marketplace screens                                                      |

Buyer, Seller and Rider dashboards reuse [components/workspace/dashboard.tsx](../web/resources/views/components/workspace/dashboard.tsx). Role entry files own their titles, descriptions, primary actions and shortcuts. The [workspace dispatcher](../web/resources/views/pages/workspace/dashboard.tsx) retains a legacy Logistics fallback; current requests render dedicated role dashboards.

Inspect role branches before editing shared order, report, delivery or account screens. Keep shared validation feedback consistent and extract role-specific presentation only when needed.

### Navigation, layout and styles

| Area                                     | Source                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Role menus and groups                    | [app-sidebar.tsx](../web/resources/views/components/navigation/app-sidebar.tsx)            |
| Navigation items                         | [nav-main.tsx](../web/resources/views/components/navigation/nav-main.tsx)                  |
| Sidebar/content arrangement              | [app-sidebar-layout.tsx](../web/resources/views/layouts/app/app-sidebar-layout.tsx)        |
| Page headings, fields, cards and notices | [marketplace-ui.tsx](../web/resources/views/components/shared/marketplace-ui.tsx)          |
| Buttons, dialogs and inputs              | [components/ui/](../web/resources/views/components/ui/)                                    |
| Admin controls                           | [components/admin/](../web/resources/views/components/admin/)                              |
| Logistics toolbar                        | [logistics-toolbar.tsx](../web/resources/views/components/logistics/logistics-toolbar.tsx) |
| Global theme and typography              | [app.css](../web/resources/css/app.css)                                                    |
| Fonts, metadata and asset loading        | [app.blade.php](../web/resources/views/app.blade.php)                                      |

### Trace a screen from its URL

For `/dashboard/seller`:

1. [routes/web.php](../web/routes/web.php) matches `dashboard/{role}`.
2. [DashboardController](../web/app/Http/Controllers/DashboardController.php) checks the role, queries Seller workspace data and returns `seller/dashboard`.
3. [app.tsx](../web/resources/js/app.tsx) resolves the name to `resources/views/pages/seller/dashboard.tsx`.
4. The Seller page uses shared dashboard components; the shared `Page` supplies the layout and sidebar.

Use React files for presentation and the relevant controller/service for server data. Keep role entry points under `pages/buyer`, `seller`, `rider`, `logistics` and `admin`; shared workflows belong in their existing domain folders. Laravel permissions remain authoritative.

[Documentation](README.md)
