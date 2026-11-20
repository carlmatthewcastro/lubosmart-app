<div align="center">

# LubosMart UI/UX standards

**Brand, component, accessibility and frontend validation rules.**

[Home](../../README.md) · [Documentation](../README.md) · [Website](https://lubosmart.app)

</div>

---

## Overview

This standard covers LubosMart interface identity, shared patterns and accessibility targets. It is for contributors maintaining the completed website while preserving its branding, permissions and workflows.

<a id="how-it-works"></a>

## How it works

This is the permanent source of truth for frontend work. Read it before changing
pages, components, layouts, or styles. Updated 2026-11-20.

<a id="tailwind-design-freedom"></a>

## Tailwind design freedom

Use the full Tailwind CSS feature set supported by the installed version when it
improves the screen. Choose the visual treatment for the task; the shared patterns
below are starting points, not a closed list of permitted utilities or effects.
No blanket restriction limits the UI to basic utilities, flat surfaces, a fixed
spacing scale, or the current component variants.

| Design area   | Available tools                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Layout        | Flexbox, grid, responsive breakpoints, container queries, positioning, aspect ratios and fluid sizing                  |
| Interaction   | Hover, focus-visible, active, disabled, group, peer, data, ARIA and arbitrary variants                                 |
| Appearance    | Typography, gradients, borders, rings, shadows, opacity, filters, backdrop effects and transforms                      |
| Motion        | Transitions, animations, custom keyframes and reduced-motion variants                                                  |
| Customization | Arbitrary values and properties, CSS variables, extended `@theme` tokens, `@utility`, `@variant` and `@custom-variant` |

Use the [official Tailwind customization guide](https://tailwindcss.com/docs/adding-custom-styles)
for syntax and check feature availability against the installed version. Extend
the shared theme and components for reusable designs; use local arbitrary values
or custom CSS when a screen needs them. Apply effects where they improve hierarchy,
feedback or readability. A feature does not need to appear on every screen.

Keep LubosMart identity, responsive behavior, accessible contrast, visible focus,
reduced-motion support and performance intact. UI freedom covers presentation;
server authorization, validation and business workflows remain authoritative.

<a id="identity-and-tokens"></a>

## Identity and tokens

Preserve the existing LubosMart logo, purple identity, orange logo accent, Poppins
typography (user request dated 2026-11-14), lavender surfaces, and rounded cards. Do not redesign the brand.
The existing homepage is the user's approved visual reference (2026-11-14).
Preserve its design, category artwork, product presentation and navbar. Public
pages linked from the homepage, including Marketplace, reuse that same navbar.
`resources/css/app.css` owns semantic light and dark tokens through Tailwind v4
`@theme`. Use `primary`, `background`, `foreground`, `card`, `muted`, `accent`,
`destructive`, `success`, `warning`, `input`, and `ring` for shared semantic roles.
Extend the palette or use arbitrary colors for a deliberate screen-specific
treatment, while preserving brand recognition, contrast and light/dark behavior.
Primary remains `hsl(262, 43%, 49%)` in light mode. Orange is a brand accent, not
an error indicator. Status must have text or an icon as well as color.
Respect the user's theme preference; a role must never overwrite it.

<a id="typography-spacing-and-layout"></a>

## Typography, spacing, and layout

- Use one descriptive page heading. Default operational page titles use 24–30px
  semibold, section titles 18–20px and body copy 14–16px with comfortable line
  height. Adapt the type scale to the screen; these defaults are not hard limits.
- Inputs use at least 16px on mobile to avoid focus zoom. Use tabular numbers for
  money and operational metrics; format pesos with the existing `money` helper.
- Start with the Tailwind 4px spacing scale: 8px between labels and controls, 16px
  between related items and 24px between sections. Use fluid spacing, extended
  theme values or arbitrary values when they better fit the composition.
- Standard operational pages use `Page`: full available width, 16px mobile gutters,
  24–32px desktop gutters, a clear title, purpose, and primary action.
  Keep readable widths for individual forms, authentication, and focused onboarding.
  Full-width pages follow the user requirement dated 2026-11-10.
- Choose card borders, shadows, gradients, corners and responsive padding to suit
  the screen's hierarchy. Keep long identifiers and user text from overflowing
  with wrapping and `min-w-0`.
- Start with a single mobile column; add columns when content fits. Verify 320px
  width, common tablet/desktop widths, landscape, and 200%/400% zoom. Confine
  necessary horizontal scrolling to named table regions, never the whole page.

<a id="components-and-navigation"></a>

## Components and navigation

Reuse `marketplace-ui`, `components/ui`, and existing Radix primitives. Use the
shared Button, Field, Select, Textarea, feedback, and card patterns. Extend existing
components before adding a competing abstraction. Use `cn` for class overrides.
Use Inertia.js `Link` for application navigation and existing `useForm` patterns for
mutations; preserve URLs, request shapes, scroll behavior, and server validation.
Navigation needs accessible names and `aria-current` for the selected destination.
Provide a visible-on-focus skip link to a focusable main-content target. Keep
mobile navigation and account actions reachable without hover. Breadcrumbs reflect
location; do not introduce links to workflows that do not exist.

<a id="accessibility-wcag-22-aa-target"></a>

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

<a id="forms-and-feedback"></a>

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

<a id="operational-surfaces"></a>

## Operational surfaces

Accounts and registration management pages use concise result counts instead of
summary metric card strips, per the user's preference. Do not reintroduce those
summary cards unless explicitly requested. Registration review handles application
decisions; account details stay read-only and account access controls handle only
eligible account status changes.

Tables need captions or accessible names, scoped headers, readable alignment,
keyboard-accessible overflow, and understandable pagination. Keep critical mobile
actions visible. Cards group related information rather than every single label.
Dashboards prioritize actionable queues and trustworthy metrics; show units,
periods, and zero-data states. Never invent analytics. Dialog footers wrap or stack
on small screens; long content must not hide close or submit controls.
Write short sentence-case labels and specific action verbs. Explain consequences,
avoid jargon, and use consistent order/parcel/payment terminology.

<a id="role-specific-experience"></a>

## Role-specific experience

| Role            | Priorities and protected workflow                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Buyer           | Product discovery, stock visibility, editable cart, address choice, shipping quote feedback, clear COD total, order tracking |
| Seller          | Inventory validation, product images, stock/weight clarity, order preparation, waybills, sales reports                       |
| Rider / Courier | Large mobile actions, parcel identity, delivery proof upload progress, COD collection, failed-delivery feedback              |
| Sorting Center  | Center-scoped queues, receiving/sorting/dispatch, courier affiliation, shipping rates, cash handovers and reconciliation     |
| Admin           | Search and review queues, clear approval/rejection reasons, compliance, commission, audit history, platform settings         |

Use server-provided permissions and allowed actions. Do not bypass approval or
verification, expose private proof, broaden center access, or create unsupported
payments, payouts, ratings, returns, or product variants. Keep COD and existing
commission calculation intact. Authentication, onboarding, settings, and support
must follow the same shared accessibility and feedback patterns.

<a id="shared-account-settings-reference-2026-11-14"></a>

## Shared account settings reference (2026-11-14)

Buyer, Seller, Rider and Logistics use the same settings presentation, with categories
based on available role settings. Follow the user-supplied reference: personal details
are read-only with full name, birthday, sex and age; submitted documents have private,
expiring view links and a refresh action. Contact and security initially shows current
email/contact and a Send verification code action; reveal editable contact fields after
server-confirmed email verification. Keep Change password and My addresses in the shared
navigation. Do not show photo-ID replacement or account-deletion panels in these role
settings. Preserve backend authorization, approval and account-retention protections.

<a id="performance-and-validation"></a>

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

<a id="requirements-evidence"></a>

## Requirements evidence

For registration, follow the user's 2026-10-14 requirement to retain all fields
from ERP-Components.pdf. See [registration field coverage](REGISTRATION_REQUIREMENTS.md).
Sex and birthday are required for every role; middle initial is optional and
must remain visible. Show calculated age and collect the address and role-specific
private uploads. Keep field feedback space stable. Unknown Google identities
choose a role and complete the same requirements using trusted name/email prefill.

The repository source and concise role guides describe implemented behavior. The
previously supplied five-page ERP components document is a role reference, not an
identified official SRS. No official SRS was found during this audit. Reconcile any
later supplied SRS with these rules without silently changing business logic.

---

<div align="center">

**LubosMart** · LubosMart UI/UX standards · [Documentation](../README.md)

</div>
