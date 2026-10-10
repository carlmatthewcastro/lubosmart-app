# UI/UX audit and implementation

Reviewed 2026-10-11 on `feat/ui-ux-standards`. Scope: all 41 React page files,
their shared components/layouts, Tailwind tokens, and public/authentication CSS.
This is a source audit, not a completed visual or WCAG acceptance assessment.

## Shared findings addressed

| Finding | Implementation |
| --- | --- |
| Competing button and input styles; small controls | Marketplace buttons reuse UI button variants; shared 44px controls, mobile 16px input text, consistent rounded styling |
| Weak error, placeholder, and focus contrast | Stronger semantic error/input tokens; distinct success/warning colors; full-strength focus rings and readable placeholders |
| Missing keyboard bypass | Skip links and focusable main targets in workspace, public, authentication, onboarding, and registration layouts |
| Long dialogs overflow small viewports | Bounded dialog/sheet height, contained scrolling, larger close controls, stacked footer spacing |
| Admin/center toolbars overwrite appearance | Removed forced light-mode writes; operational success surfaces use dark-aware tokens |
| Form errors are not associated with controls | Shared Field/Select/Textarea preserve descriptions and associate errors; onboarding/review/email-change fields explicitly link errors |
| Navigation matches unrelated URL prefixes | Sidebar selection matches a destination or its child path; clearer section labels |
| Settings layout assumes browser globals | Active settings navigation reads Inertia URL, allowing server rendering |

## Complete page inventory

Paths below are relative to `resources/js/pages`. “Shared” means the page benefits
from its revised shared components/layout; it was not individually redesigned.

| Page | Findings and treatment |
| --- | --- |
| `public/home.tsx` | Added keyboard bypass, mobile search readability, stronger search focus and larger navigation controls; retained brand assets and storefront composition |
| `public/platform-information.tsx` | Shared public shell, feedback, card hierarchy and keyboard bypass |
| `auth/login.tsx` | Shared authentication error feedback; excluded pointer-only backdrop from keyboard tab order |
| `auth/register.tsx` | Added main target/skip link; shared registration controls and error styling |
| `auth/choose-role.tsx` | Shared authentication card, typography, control sizes, keyboard bypass |
| `auth/confirm-password.tsx` | Shared authentication layout/input/button/feedback improvements |
| `auth/forgot-password.tsx` | Shared authentication layout/input/button/feedback improvements |
| `auth/reset-password.tsx` | Shared authentication layout/input/button/feedback improvements |
| `auth/verify-code.tsx` | Shared authentication layout/input/button/feedback improvements |
| `auth/verify-email.tsx` | Linked email/password correction errors to controls; shared onboarding navigation and feedback |
| `auth/verification-result.tsx` | Shared onboarding main landmark and control styling |
| `auth/waiting-approval.tsx` | Shared onboarding navigation and control styling; approval behavior retained |
| `auth/account-blocked.tsx` | Shared onboarding navigation and control styling; access restrictions retained |
| `onboarding/application.tsx` | Linked dynamic input/select errors; readable mobile selects; existing steps, document requirements and role review retained |
| `workspace/dashboard.tsx` | Shared workspace bypass, cards, controls and semantic feedback; existing role actions retained |
| `marketplace/catalog.tsx` | Product-specific pending label; accessible product action names, reserved image dimensions and larger details target |
| `marketplace/cart.tsx` | Shipping error alert/retry, loading announcements, unselected shipping copy, larger quantity/remove targets, address disclosure state |
| `marketplace/inventory.tsx` | Shared labeled description with inline validation; weight hint associated with control |
| `marketplace/orders.tsx` | Associated message errors, pending send label, dark-aware delivered status |
| `marketplace/deliveries.tsx` | Larger phone actions, parcel-processing status, associated center/rider/area errors, accessible proof-upload progress |
| `marketplace/reports.tsx` | Named keyboard-accessible horizontal table region and scoped column headers |
| `marketplace/waybill.tsx` | Toolbar/header wrap and mobile padding; printable white label retained |
| `logistics/dashboard.tsx` | Shared cards, feedback, workspace navigation and touch controls |
| `logistics/parcels.tsx` | Larger stage controls and shared mobile-readable search; bounded parcel/coverage dialogs |
| `logistics/reports.tsx` | Shared operational controls, card hierarchy and feedback |
| `logistics/shipping-rates.tsx` | Shared form errors/controls and bounded create/edit dialogs; rates and coverage logic retained |
| `management/accounts.tsx` | Shared filtering/feedback/controls and account detail dialogs |
| `management/registrations/index.tsx` | Shared navigation, review controls and empty-state layout |
| `management/registrations/show.tsx` | Consistent decision/reason selects and associated errors; existing reason confirmation retained |
| `admin/dashboard.tsx` | Dark-aware positive status surfaces; shared cards/navigation; metric definitions retained |
| `admin/account.tsx` | Shared controls, inline error feedback and workspace layout |
| `admin/audit-log.tsx` | Shared filter controls, cards, pagination and feedback |
| `admin/commission.tsx` | Dark-aware active indicator; shared edit dialog/controls; calculation unchanged |
| `admin/compliance.tsx` | Shared moderation controls, semantic statuses and empty-state layout |
| `admin/platform.tsx` | Resizable content field, wrap-safe character feedback, announced content errors; shared forms/dialogs |
| `settings/addresses.tsx` | Shared settings width/spacing, inputs/buttons and navigation |
| `settings/appearance.tsx` | Shared settings layout; role toolbars now respect the selected theme |
| `settings/password.tsx` | Shared settings layout, input/button sizes and error styling |
| `settings/profile.tsx` | Shared settings layout, controls and inline validation styling |
| `support/index.tsx` | Shared filters, conversation cards, empty state, controls and dialogs |
| `support/show.tsx` | Reusable labeled reply/resolution fields with associated errors and vertically resizable text |

Search UI limits in the storefront/catalog now match the existing 100-character
server search limit. No route, authorization, authentication, schema, payment,
commission calculation, approval rule, or parcel transition was changed. No
dependencies were added. Earlier documentation cleanup in the working tree was
preserved and is separate from this implementation.

## Verification

Baseline and final checks passed:

- `npx.cmd tsc --noEmit`
- `npx.cmd eslint resources/js`
- Prettier check for all 37 changed frontend files, including UI primitives
- `php artisan test --compact`: **350 tests / 2,933 assertions**
- `npm.cmd run build`: production assets and page chunks built successfully
- `git diff --check`

The initial production build succeeded with page chunks preserved. Public browser
verification was attempted through a temporary local Laravel server; the app
returned HTTP 500 because the configured database connection was refused. The
database configuration and records were not changed to bypass this failure.

## Remaining verification and issues

- Run the app with its configured database available, then verify each role's
  navigation, light/dark modes, 320px reflow, zoom, keyboard dialogs, validation,
  proof uploads, and shipping retries using authorized accounts and realistic data.
- Run screen-reader and contrast checks on actual rendered states. These changes
  target WCAG 2.2 AA; they do not establish full compliance.
- Measure Core Web Vitals with browser/field tooling. LCP, INP and CLS targets in
  the rules are goals, not measured results.
- Reconcile the official SRS when available. None was found in the repository;
  existing source and role documentation were used to preserve implemented behavior.
- Public storefront/authentication still use their established scoped purple/orange
  stylesheet alongside operational tokens. Preserve that deliberate brand treatment;
  check these screens separately when adjusting themes or contrast.
