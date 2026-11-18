> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

﻿# Authentication modal refinement - 2026-11-14

## Scope and preserved behavior

Applied the supplied authentication refinement request and buyer-modal reference to the existing web flows. Retained the current branch and preserved the pre-existing mixed working tree. No commits, branch switches, pushes, deployments, backend changes, new packages, route changes, registration requirements, or validation changes were made for this task.

The modal uses the existing homepage as an inert background with a dim overlay. All authentication screens inherit the global theme. Branding, decorative artwork, split panels, gradients, and local theme controls were removed from the shared authentication container. The public website theme control remains intact.

## Modified files and shared components

- `resources/views/layouts/auth/account-access-layout.tsx`: shared Radix modal container, accessible title/description, focus containment, initial focus, a persistent navigation/close header above the scroll area, Escape/close navigation, return focus, scroll lock, and registration-close/navigation confirmation. Outside clicks do not dismiss a form. A full-page reload also requests confirmation after registration changes.
- `resources/css/auth-reference.css`: replaced the accumulated split-panel overrides with one compact token-based modal stylesheet. Login/recovery use 480px maximum width, role selection 520px, and registration 960px. Dialogs fit within 90dvh; their content scrolls internally. Inputs are 44px and actions are at least 44px. Primary actions use solid purple. Removed floating/glowing action effects in this scope.
- `resources/views/components/auth/account-role-options.tsx` (new): shared native radio cards with role icons, selected styling, and keyboard focus, used by registration and the existing account-role chooser.
- `resources/views/components/auth/registration-progress.tsx` (new): reusable three-step progress, connecting lines, active state, completed checkmarks, and backward step navigation.
- `resources/views/components/auth/registration-footer.tsx` (new): shared sticky Back / step count / Continue or Create account actions. No Continue button remains beside email. Back is available on the review step.
- `resources/views/components/auth/registration-form.tsx`: reused the existing AuthInput, Password, validation feedback, role fields, and form state. Added review editing links and readable summaries of address selections, role metadata, and document filenames; passwords are excluded from the summaries. Kept optional middle initial, required sex/birthday, calculated read-only age, +63 number normalization, and all uniqueness/validation behavior.
- `resources/views/components/auth/seller-registration-fields.tsx`: compact styled native upload picker with upload icon, actual JPG/PNG/PDF and 5MB restrictions, selected filename, validation, preview, replace/remove controls. Removed the empty fixed-height preview area. Retained cascading address loading/reset behavior and conditional seller/company documents.
- `resources/views/components/auth/rider-registration-fields.tsx`: aligned grid spacing and desktop breakpoint with other roles; retained affiliation, vehicle, address, and document requirements.
- `resources/views/pages/auth/register.tsx`: uses shared role cards, moves role navigation above the heading, and resets modal state for each role choice.
- `resources/views/pages/auth/choose-role.tsx`, `confirm-password.tsx`, and `activate-rider.tsx`: use the shared modal layout; chooser reuses role cards and password confirmation reuses Password.
- `resources/views/pages/auth/reset-password.tsx`: reuses AuthInput and Password, including show/hide controls and associated errors, while preserving the reset submission.
- `resources/views/pages/auth/forgot-password.tsx`, `verify-code.tsx`, and `verify-email.tsx`: consistent actions and shared modal theme; removed decorative email-verification heading content.
- `resources/views/layouts/onboarding-layout.tsx`: uses the shared modal for verification results, pending approval, and account-status confirmation screens. Preserves authenticated logout and existing onboarding progress/content.
- `tests/Frontend/registration-form.test.cjs`: updated the existing isolated component harness for effects and extracted components, preserving validation, upload and state assertions.
- `tests/Frontend/auth-modal-browser-check.cjs` (new): separate isolated Chrome/CDP regression script based on the repository's existing fixture. The older browser script retains historical full-page expectations and was left intact.

Existing edits to the login page, Google button, global CSS, routes, controllers, and other modules were preserved. Login and Google authentication receive modal styling through the shared container without changing their requests.

## Validation

- Registration component/validation tests: **37 passed**. Updated the existing lightweight test harness to provide its missing effect double and load the extracted progress/footer components; first-step assertions now reflect that account submission is shown only at the final step.
- Formatting checks: passed for changed source and browser/component tests.
- Targeted ESLint: passed for authentication components, pages, and modified layouts.
- TypeScript `tsc --noEmit`: passed.
- Authentication Laravel suite: **705 passed, 3 skipped, 4,480 assertions**. Uses the repository's testing database configuration.
- Production build: passed. Existing warning: `/images/categories/category-atlas-v1.png` does not resolve at build time; unrelated to authentication.
- Full browser matrix and flows: passed, including all four actual registration submissions, email codes to pending approval, upload removal/replacement, preserved step values/files, password reveal, recovery-code verification and reset, Google prefill, keyboard containment, Escape, cancelled/confirmed close, role-change confirmation, and zero runtime/console errors.
- Responsive Chrome checks: seven entry screens in both global themes at 1440x1000, 768x1000, 320x900, and 1024x480. Later personal, address/document, review, verification, pending and recovery screens are also checked in both themes at these sizes. Desktop/mobile screenshots were visually inspected.
- Browser checks: see the isolated reports and screenshots under `storage/app/auth-modal-ui-check/`. Uses disposable SQLite, synthetic documents/accounts, faked email delivery, faked Google provider, and faked PSGC responses. Customer data and live email services are not used.
- Dialog accessibility integration: let Radix own the title ID so its generated accessible label resolves; the browser console check passes. Removed inherited dialog transitions so viewport changes immediately obey the height limit.
- Final header/scroll regression: passed after the final build. Explicit geometry checks keep the close action and registration footer inside the dialog across all tested viewport sizes; the outer dialog cannot be programmatically scrolled. Browser reports: `results.json` (full entry matrix and flows) and `results-flows.json` (final expanded flows, including the header/scroll checks).
- Source whitespace check: passed for the changed tracked authentication source files.

## Verification limits

Browser accessibility-tree names and keyboard checks do not establish WCAG conformance. A manual screen-reader pass, physical touch devices, OS-native date/file picker variations, actual 200%/400% browser zoom, and Safari/Firefox testing remain unverified. 320px reflow and a short landscape viewport are covered in Chrome. Live Google consent, actual email delivery, and external PSGC availability remain outside the isolated fixture; their backend security contracts are covered by existing tests. Registration values/files remain in memory while editing steps; closing after confirmation discards them and does not imply a new draft-storage feature.
