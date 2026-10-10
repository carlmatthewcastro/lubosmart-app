# LubosMart UI/UX standards

This is the permanent source of truth for frontend work. Read it before changing
pages, components, layouts, or styles. Updated 2026-10-11.

## Identity and tokens

Preserve the existing LubosMart logo, purple identity, orange logo accent, Instrument
Sans typography, lavender surfaces, and rounded cards. Do not redesign the brand.
`resources/css/app.css` owns semantic light and dark tokens through Tailwind v4
`@theme`. Use `primary`, `background`, `foreground`, `card`, `muted`, `accent`,
`destructive`, `success`, `warning`, `input`, and `ring` rather than arbitrary colors.
Primary remains `hsl(262, 43%, 49%)` in light mode. Orange is a brand accent, not
an error indicator. Status must have text or an icon as well as color.
Respect the user's theme preference; a role must never overwrite it.

## Typography, spacing, and layout

- Use one descriptive page heading; operational page titles use 24–30px semibold.
  Section titles use 18–20px; body copy uses 14–16px with comfortable line height.
- Inputs use at least 16px on mobile to avoid focus zoom. Use tabular numbers for
  money and operational metrics; format pesos with the existing `money` helper.
- Use the Tailwind 4px spacing scale: 8px between labels and controls, 16px between
  related items, 24px between sections. Avoid arbitrary spacing without a reason.
- Standard operational pages use `Page`: maximum width 72rem, 16px mobile gutters,
  24–32px desktop gutters, a clear title, purpose, and primary action.
- Cards use quiet borders, modest shadows, rounded corners, and responsive padding.
  Keep long identifiers and user text from overflowing with wrapping and `min-w-0`.
- Start with a single mobile column; add columns when content fits. Verify 320px
  width, common tablet/desktop widths, landscape, and 200%/400% zoom. Confine
  necessary horizontal scrolling to named table regions, never the whole page.

## Components and navigation

Reuse `marketplace-ui`, `components/ui`, and existing Radix primitives. Use the
shared Button, Field, Select, Textarea, feedback, and card patterns. Extend existing
components before adding a competing abstraction. Use `cn` for class overrides.
Use Inertia `Link` for application navigation and existing `useForm` patterns for
mutations; preserve URLs, request shapes, scroll behavior, and server validation.
Navigation needs accessible names and `aria-current` for the selected destination.
Provide a visible-on-focus skip link to a focusable main-content target. Keep
mobile navigation and account actions reachable without hover. Breadcrumbs reflect
location; do not introduce links to workflows that do not exist.

## Accessibility: WCAG 2.2 AA target

- Normal text needs 4.5:1 contrast; large text and essential UI boundaries need 3:1.
  Check actual foreground/background pairs, including hover, error, and dark states.
- Every action is keyboard operable with visible, unobscured focus. Aim for 44px
  touch controls; meet the 24px AA minimum or its documented spacing exceptions.
- Use native semantics, associated labels, meaningful image alternatives, logical
  headings, and names for icon-only buttons. Decorative icons use `aria-hidden`.
- Preserve password paste, password managers, autocomplete, and accessible login.
  Do not introduce cognitive puzzles or block assistive technology.
- Honor reduced motion. Focus must not disappear behind sticky headers or dialogs.
- Dialogs require a title, suitable description, focus containment, Escape handling,
  focus restoration, reachable close action, and scrolling within the viewport.
- Check keyboard, screen reader, zoom, and touch behavior manually. Passing builds
  is not a WCAG certification. See the [WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/).

## Forms and feedback

Label every control; show optional/required expectations and useful hints. Use
appropriate input types, input modes, autocomplete, and server-aligned limits.
Associate hints/errors with `aria-describedby` and mark invalid controls.
Explain what to fix in plain language; never use color alone. Keep entered values
after failure, except passwords where existing security behavior clears them.
Prevent duplicate submissions while processing and give a visible progress label.
Do not silently change validation or business rules for visual convenience.
Confirm consequential destructive actions and name the action and affected item.
Do not disable navigation unnecessarily while unrelated requests run.

Loading states explain what is loading and retain layout space. Use polite status
announcements for completion; alerts for actionable failures. Empty states explain
why there are no results and provide a valid next step. Error states offer retry
when safe. Distinguish zero records from filters returning no matches.

## Operational surfaces

Tables need captions or accessible names, scoped headers, readable alignment,
keyboard-accessible overflow, and understandable pagination. Keep critical mobile
actions visible. Cards group related information rather than every single label.
Dashboards prioritize actionable queues and trustworthy metrics; show units,
periods, and zero-data states. Never invent analytics. Dialog footers wrap or stack
on small screens; long content must not hide close or submit controls.
Write short sentence-case labels and specific action verbs. Explain consequences,
avoid jargon, and use consistent order/parcel/payment terminology.

## Role-specific experience

| Role | Priorities and protected workflow |
| --- | --- |
| Buyer | Product discovery, stock visibility, editable cart, address choice, shipping quote feedback, clear COD total, order tracking |
| Seller | Inventory validation, product images, stock/weight clarity, order preparation, waybills, sales reports |
| Rider / Courier | Large mobile actions, parcel identity, delivery proof upload progress, COD collection, failed-delivery feedback |
| Sorting Center | Center-scoped queues, receiving/sorting/dispatch, courier affiliation, shipping rates, cash handovers and reconciliation |
| Admin | Search and review queues, clear approval/rejection reasons, compliance, commission, audit history, platform settings |

Use server-provided permissions and allowed actions. Do not bypass approval or
verification, expose private proof, broaden center access, or create unsupported
payments, payouts, ratings, returns, or product variants. Keep COD and existing
commission calculation intact. Authentication, onboarding, settings, and support
must follow the same shared accessibility and feedback patterns.

## Performance and validation

Reuse existing dependencies; avoid adding libraries for basic UI behavior. Preserve
code splitting. Give images dimensions or an aspect ratio; lazy-load below-fold
images, not the main hero. Abort obsolete searches/quotes and avoid duplicate
requests. Preserve responsive layout during loading and font/image rendering.
Target LCP ≤2.5s, INP ≤200ms, and CLS ≤0.1 at the 75th percentile; these need real
measurement, not a build result. See [Core Web Vitals](https://web.dev/articles/vitals).

For each batch, run targeted ESLint and TypeScript checks. Before completion run
relevant Laravel tests and the production build. Review light/dark themes, mobile
reflow, keyboard paths, forms, dialogs, and loading/error/empty states where browser
access is available. Document limitations and remaining issues in the UI audit.

## Requirements evidence

The repository source and concise role guides describe implemented behavior. The
previously supplied five-page ERP components document is a role reference, not an
identified official SRS. No official SRS was found during this audit. Reconcile any
later supplied SRS with these rules without silently changing business logic.
