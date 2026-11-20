# Front End

React and TypeScript provide the interface. Inertia connects pages and forms to Laravel; Blade supplies the initial HTML document.

Start with the [frontend code map](code-map.md) to find each role's dashboard, related screens, sidebar, shared components, and backend data source.

| Location                        | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `resources/js/app.tsx`          | Starts React/Inertia and resolves pages                   |
| `resources/views/pages/`        | Public, account, marketplace, admin and logistics screens |
| `resources/views/components/`   | Shared layouts, forms, dialogs and UI components          |
| `resources/js/hooks/`           | Reusable UI behavior                                      |
| `resources/css/app.css`         | Tailwind styles and theme                                 |
| `resources/views/app.blade.php` | Inertia shell and asset loading                           |
| `vite.config.js`                | React, Laravel and Tailwind build integration             |

## Communication and state

Laravel supplies page props through Inertia. React hooks manage local UI state; `useForm` manages form data/errors; Inertia links and router calls handle navigation/mutations. Selected panels use native `fetch` for JSON reads and polling.

No separate Redux, Zustand or TanStack Query layer is declared. The versioned API serves JSON to the existing frontend while Inertia navigation continues. Server-side validation and authorization remain authoritative.

## Interface guidance

Reuse existing components and the purple theme. Keep layouts responsive, fields labelled, errors visible, and buttons disabled while submitting. Support keyboard navigation, dark mode and reduced motion where the existing components do.

Role screens are documented under [Functions](../workflows/README.md). Buyer password signup activates after email verification; Seller and Logistics applications require Admin review, and affiliated Rider applications require Logistics review.

## Development commands

Run from `web/`:

```powershell
npm run dev
npm run build
npx tsc --noEmit
npx eslint resources/js
npm run format:check
```

SSR source/build configuration exists, but the Docker deployment runs the client asset build and has no SSR service.

[Documentation](../README.md)
