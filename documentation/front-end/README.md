<div align="center">

# 🏗️ Frontend

**React, TypeScript and Inertia.js interface organization.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Code map](code-map.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the implemented website interface, page state and development commands. It is for frontend developers maintaining the existing Laravel and Inertia.js experience.

<a id="context"></a>

## 🔄 Context

React and TypeScript provide the interface. Inertia.js connects pages and forms to Laravel; Blade supplies the initial HTML document.

Start with the [frontend code map](code-map.md) to find each role's dashboard, related screens, sidebar, shared components, and backend data source.

<a id="source-locations"></a>

## 🏗️ Source locations

| Location                        | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `resources/js/app.tsx`          | Starts React/Inertia.js and resolves pages                |
| `resources/views/pages/`        | Public, account, marketplace, Admin and Logistics screens |
| `resources/views/components/`   | Shared layouts, forms, dialogs and UI components          |
| `resources/js/hooks/`           | Reusable UI behavior                                      |
| `resources/css/app.css`         | Tailwind styles and theme                                 |
| `resources/views/app.blade.php` | Inertia.js shell and asset loading                        |
| `vite.config.js`                | React, Laravel and Tailwind build integration             |

<a id="communication-and-state"></a>

<a id="how-it-works"></a>

## 🔄 How it works

Laravel supplies page props through Inertia.js. React hooks manage local UI state; `useForm` manages form data/errors; Inertia.js links and router calls handle navigation/mutations. Selected panels use native `fetch` for JSON reads and polling.

No separate Redux, Zustand or TanStack Query layer is declared. The versioned API serves JSON to the existing frontend while Inertia.js navigation continues. Server-side validation and authorization remain authoritative.

<a id="interface-guidance"></a>

## 🔄 Interface guidance

Reuse existing components and the purple theme. Keep layouts responsive, fields labelled, errors visible, and buttons disabled while submitting. Support keyboard navigation, dark mode and reduced motion where the existing components do.

Role screens are documented under [Functions](../workflows/README.md). Buyer password signup activates after email verification; Seller and Logistics applications require Admin review, and affiliated Rider applications require Logistics review.

<a id="development-commands"></a>

<a id="commands"></a>

## ⚙️ Commands

Run from `web/`:

```powershell
npm run dev
npm run build
npx tsc --noEmit
npx eslint resources/js
npm run format:check
```

SSR source/build configuration exists, but the Docker deployment runs the client asset build and has no SSR service.

<a id="related-documentation"></a>

## 📚 Related documentation

[Documentation](../README.md)

---

<div align="center">

**LubosMart** · Frontend · [Back to Documentation](../README.md)

</div>
