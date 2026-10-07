# Coding guidelines

These are targeted guidelines based on the repository's Laravel 12 / Inertia v2 / React 19 / TypeScript / Tailwind v4 stack. Apply them incrementally within touched features; do not rewrite the application just to introduce abstractions.

## Layer ownership

| Layer | Responsibility | Location |
| --- | --- | --- |
| Laravel routes/middleware | Entry points, sessions, coarse access checks | `routes/`, `bootstrap/app.php` |
| Form Requests | Input validation and request authorization | `app/Http/Requests/` |
| Policies/gates | Ownership, role and center/assignment permissions | Proposed `app/Policies/`, registration in provider |
| Actions | Transactional registration, approval, checkout, dispatch, collection | `app/Actions/`; checkout action already exists |
| Models | Relationships, casts and query scopes | `app/Models/` |
| Inertia controllers | Invoke use case and return bounded props/redirects | `app/Http/Controllers/` |
| React pages/components | Render props, form state and interactions | `resources/js/pages/`, `components/` |
| Blade | Inertia host, email/server-rendered views where needed | `resources/views/` |
| Styling | Shared tokens, utilities, limited component-specific CSS | `resources/css/` |

Avoid speculative repositories/service layers. Extract an action when it defines a business transaction or removes meaningful duplication. Existing inline validation is not a mandate to refactor unrelated controllers; standardize registration rules when changing both local and Google flows.

## Laravel and Blade

- Use validated, explicitly selected input; `$fillable` is not validation/authorization. Privileged attributes require dedicated authorized actions.
- Authorize the specific record, then perform a state-checked transaction. Use DB unique/FK constraints and consistent locking; send mail/notifications after commit.
- Use enums/constants for finite role/status contracts. Persist editable business values such as categories, fees, service areas and commissions. Keep `env()` in configuration and use `config()` elsewhere.
- Prefer Eloquent relationships/scopes, eager loading and pagination. Never query inside Blade or map loops in React. Avoid returning entire user/application models; choose safe props explicitly.
- Use named routes through Ziggy. Keep public, onboarding and operational route groups clear; Laravel 12 middleware configuration belongs in `bootstrap/app.php`.
- Escape user content with Blade `{{ }}` or React interpolation; do not render untrusted raw HTML. Include `@csrf` in state-changing Blade forms and use `@method` where required. Use `@can` for UI visibility in addition to server policies.
- Keep SQL, fee calculations and role grants out of templates. Blade host `app.blade.php` remains the Inertia entry point, not a duplicate React page implementation.
- Never hardcode secrets, customer data, admin passwords or production-only paths. Keep migrations additive once deployed.

## React, Inertia and JS/TypeScript

Use TypeScript for new frontend code, typed page props, typed `useForm` data and typed server options. Use existing `@/` aliases and UI primitives. Pages orchestrate components; components receive props and emit events rather than fetching or inventing business policy.

Use Inertia `Link` for internal navigation and `useForm` for mutations, including POST logout. Version-check newer Inertia APIs against `package-lock.json`; dependency ranges alone do not prove an API is installed. OAuth uses a full external redirect from the server, described in [Google OAuth](../accounts/google-oauth.md).

Keep state local unless it genuinely needs sharing; derive filtered labels/counts rather than synchronizing duplicate state with effects. Use stable database IDs as list keys. Clean up effects/listeners and avoid global DOM mutation for React-owned components. Prefer a shared accessible dialog component to repeated manual focus logic.

Always show field/server errors, loading/disabled state, empty states and recovery actions. Local validation improves feedback; server validation remains authoritative. Wire controlled checkbox values to form state, including Remember me on the dedicated login page. Password mismatch must produce a visible error, not silently return.

The homepage's `AuthModal`, separate login/register pages, legacy `auth-modal.blade.php`, `public/js/auth-modal.js` and public CSS are overlapping assets. Choose shared React auth components for Inertia pages. Verify legacy usage before removing assets; do not attach a second imperative listener to a React form.

## CSS and Tailwind CSS v4

Follow the existing `resources/css/app.css` CSS-first setup, `@import 'tailwindcss'`, `@theme` tokens and dark variant. Reuse semantic colors, spacing and UI variants; avoid arbitrary copied colors/sizes and escalating `!important` rules. Use plain CSS for complex reusable selectors/animations and utilities for ordinary layout. Scope custom selectors to the component and remove unused rules only after confirming usage.

Use mobile-first layouts, grid/flex and `gap`; avoid absolute-positioned primary layouts or fixed dimensions that overflow. Support keyboard focus, visible errors, labels and reduced motion. Preserve existing dark-mode behavior.

Dynamic business data is desirable; interpolated Tailwind class fragments are unreliable. Map states to complete, finite class names:

```tsx
const applicationStyles = {
    submitted: 'bg-amber-100 text-amber-900',
    approved: 'bg-green-100 text-green-900',
    rejected: 'bg-red-100 text-red-900',
};

<span className={applicationStyles[application.status]}>
    {application.label}
</span>
```

Avoid `bg-${color}-100`; Tailwind needs detectable class names. Use validated CSS variables for genuinely runtime values such as a progress percentage, with an accessible text equivalent. [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).

## What should be dynamic?

| Value | Source |
| --- | --- |
| Five roles/public allowlist | Server enum/contract, expose permitted options to UI |
| Role permissions | Server policies; safe capabilities shared as page props |
| Product/business categories | Database-managed taxonomy; enforce seller category rule |
| Provinces/cities/barangays | Versioned imported/cached geographic data with stable codes |
| Shipping fee/commission | Authorized persisted setting, snapshot on order |
| Stock, prices, totals | Server queries/calculation; snapshots for history |
| UI colors/spacing/status style | Design tokens and finite class maps |
| URLs and external secrets | Named routes/configuration/environment |

Constants for stable contracts are appropriate. Dynamic implementation does not mean allowing users to configure permissions or passing arbitrary CSS/SQL from a database.

## Validation for code changes

Choose checks appropriate to the changed code:

```powershell
php artisan test tests/Feature/Auth
php artisan test tests/Feature/Checkout
vendor/bin/pint --test
npx tsc --noEmit
npx eslint resources/js
npm run format:check
npm run build
```

Use installed tools; no new testing dependencies are required by this plan. `npm run lint` currently applies fixes, so use direct ESLint without `--fix` when reviewing. Type-check/build do not replace browser acceptance. Documentation-only changes need link/content/diff validation, not application test rewrites.
