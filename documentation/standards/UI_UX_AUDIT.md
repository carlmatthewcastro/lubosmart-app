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

Paths below are relative to `resources/js/pages`. ‚ÄúShared‚Äù means the page benefits
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

## Dashboard code organization ‚Äî 2026-10-13

Buyer, Seller, and Courier dashboard content now lives in separate role page files.
The common UI was extracted to `components/workspace/dashboard.tsx`; the existing
`pages/workspace/dashboard.tsx` remains the Inertia dispatcher. Admin and Sorting
Center retain their existing dedicated pages. See the [frontend code map](../front-end/code-map.md).

No routes, controller props, permissions, or dashboard styling were changed.
Targeted ESLint, TypeScript, Prettier, production build, and 44 dashboard,
role-access, and logistics tests passed (335 assertions). The code map's local
links were checked. Browser visual and assistive-technology verification was not
performed for this extraction; the remaining manual checks above still apply.

## Shared registration controls ‚Äî 2026-10-13

Password signup now collects first/last name, mobile, Buyer/Courier birthday and
terms acceptance, with server-authoritative shared validation. The existing email
verification page supports a six-digit OTP and its error/loading state, alongside
the established link option. Existing approval and role workflows remain intact.

Final checks passed: 452 tests (3,432 assertions), Pint, targeted ESLint,
TypeScript, Prettier, browser production build and SSR build. Backend tests include
OTP authorization/expiry/resend, identity migration safeguards, real upload byte
boundaries and simultaneous registrations in two SQLite processes. Browser reflow,
keyboard/screen-reader behavior, password masking, field retention and actual
email delivery were not verified; these results do not establish WCAG compliance.

## Buyer/Seller registration ‚Äî 2026-10-13

Seller signup and correction now reuse `seller-registration-fields.tsx` for shop,
category, seller type, TIN, dependent region/province/city/barangay selections and
conditional ID/DTI/SEC/BIR uploads. Controls use labels, associated server errors,
processing guards, retry feedback and image/PDF preview links. Admin review displays
seller type/TIN and the newest file per kind. Buyer verification feedback reflects
activation; Seller verification feedback reflects pending review.

Final checks: 610 tests passed, two browser cases skipped (4,338 assertions), Pint,
targeted ESLint, TypeScript, Prettier, browser production build and SSR build passed.
Password masking/toggle, preview interactions, descendant reset/value retention,
focus, keyboard/screen-reader/reflow and actual email delivery remain NOT RUN.
The live PSGC endpoint could not be reached from this environment. Automated
backend and build results do not establish visual acceptance or WCAG compliance.

## Company registration and Rider invitations - 2026-10-13

Approved account-creation phase added company name/SEC/TIN/position/service-region fields to the shared registration component, private document input slots, dependent PH address selections, company application correction, a scoped company Rider list/create page, expiring invitation password setup and company name on the Rider dashboard. Public Rider registration choices were removed from password, role-choice and public entry points. Existing shared form controls, Inertia, branding and layouts were reused. A creating company may preview its own new invitation while logged in with password setup disabled and logout guidance; another company cannot view that valid preview. Backend validation/ownership remain authoritative.

Executed checks: targeted ESLint, TypeScript, Prettier, production browser and SSR builds, PHP Pint and full feature/unit suite **803 passed / 3 skipped / 5,464 assertions**. Browser password masking/toggle cases TC-BUY-020, TC-SEL-018, TC-LOG-018 are explicitly skipped; no manual browser PASS or WCAG compliance is claimed. Actual file previews, descendant-address reset, focus/error recovery, input retention, 320px reflow, light/dark contrast, zoom, keyboard/screen reader and actual inbox links still require browser verification. Address tests use isolated synthetic responses; live PSGC data was not verified. No deployment occurred.


## Final account-creation QA correction - 2026-10-13

RegistrationForm now submits all validation to the backend so blank Buyer/Seller/Logistics forms can show every required-field error, while preserving duplicate-submit guards, focus recovery and password cleanup. Seller pending-review applicant names now identify the shop. Existing components, branding and role workflows remain unchanged. Fourteen executed component contract checks exercise submission guards, password state toggling, dependent-address reset handlers and required Seller document slots using TypeScript/Node and isolated hook/Inertia doubles. These do not mount a DOM or execute effects; visible browser behavior, document previews and live option loading remain unverified.

Final PHP suite: **835 passed / 3 skipped / 5,662 assertions**. Targeted ESLint, TypeScript, Prettier, Pint and production browser/SSR builds passed. No WCAG compliance or full workbook acceptance PASS is claimed. See docs/requirements/ACCOUNT_CREATION_FINAL_REPORT.md for all 150 individual case statuses, actual execution evidence and manual procedures. No deployment or customer email was performed.

## Registration role visibility follow-up - 2026-10-13

Restored four visible choices in the shared registration form: Buyer, Seller, Rider and Logistics. The Rider choice explains company invitations and links to login; it does not create a public Rider account. Logistics retains the existing sorting_center backend role. Existing signup forms and company approval/activation authorization remain in place. Sixteen frontend component checks passed, including role order, Rider information, blocked public submission and switching back to Buyer; relevant backend public-Rider restrictions, TypeScript, targeted ESLint, formatting and production build passed. Actual browser visuals/keyboard behavior remain unverified. No deployment occurred.

## Full-page authentication redesign - 2026-10-13

Sign In and Create Account now share resources/views/layouts/auth/account-access-layout.tsx: an official-logo header, a branded desktop panel, token-based form card and single-column mobile layout. Storefront entry points use the existing login/register routes, preserving requested Buyer/Seller/Logistics role via query parameters. All four public-facing choices remain visible; Rider opens invitation guidance rather than a public account-creation form. The React/Blade authentication modals, their legacy JavaScript and standalone auth.css were removed after reference inspection; Vite and app.blade.php now load the active app assets. Unrelated dialogs were preserved.

Registration is grouped into personal/contact, business, address, required documents and account security sections, with all fields accessible on one page. Blur/touched-field checks, correction feedback, actual password complexity checklist, confirmation matching, clickable error summary, nested server-error mapping and focus/scroll recovery improve validation while Laravel remains authoritative. Format-success messages do not assert identifier availability or account approval. Uploads show selected filename/size, type/size hints, local errors and removal/replacement; server MIME/private-storage restrictions remain. Sign In retains Remember me, recovery, Google and existing role/status redirects. OTP supports six-digit paste, focus, server expiration feedback, enforced resend cooldown and processing states. Active authentication requests show inline connectivity/session/rate-limit errors rather than an Inertia error popup.

A real browser run exposed a confirmed backend defect: numeric address-option and registration middleware shared a guest throttle signature. Eleven option requests caused a legitimate signup to return HTTP 429. routes/web.php and routes/auth.php now use separate prefix counters while retaining 60 options/minute and 10 signup submissions/minute. tests/Feature/Auth/RegistrationThrottleTest.php reproduces the failure and verifies both successful signup after option loads and the existing signup limit. No schema migration was needed.

Executed verification: full PHP suite **837 passed, 3 skipped, 5,700 assertions**, 45.16 seconds; frontend component/format validation suite **32 passed**; native headless Chrome **22 browser checks passed**, using a disposable SQLite database, fake notifications, synthetic documents and mocked Philippine location data. Browser checks include full-page login, Laravel errors and first-error focus, 320px reflow, four roles/Rider restriction, Seller document slots, dependent-address reset, password reveal/rehide, successful Buyer signup/OTP/dashboard, successful Seller and Logistics signup/OTP/pending review, upload removal/replacement, forgotten-password navigation, tablet/desktop rendering, dark mobile theme, native Tab/Enter behavior, accessible control names, and zero JavaScript runtime exceptions/console.error events in exercised flows. Screenshots and results are in storage/app/auth-ui-check/. Native browser runner: node tests/Frontend/auth-browser-check.cjs; fixture server: tests/Fixtures/auth-browser-router.php, guarded to the temporary database. TypeScript, targeted ESLint, Prettier, Pint and production/SSR builds passed.

Limits: this smoke suite is not a complete 150-case workbook rerun or WCAG certification. Rider creation/activation and role restrictions remain covered by the executed backend suite; the new browser run tested invitation guidance rather than live Rider enrollment. Real SMTP/inbox delivery, external Google authorization, live PSGC service/data, physical touch devices, actual screen-reader announcements, all zoom/contrast states and the configured MySQL dataset remain unverified. No customer email, production migration, commit, push or deployment occurred. Earlier QA reports and evidence retain their historical run scope.


## Multi-role dashboard reference adaptation - 2026-10-13

Applied the supplied Multi-Role Dashboard Showcase as a layout reference using the existing LubosMart purple/lavender semantic tokens, orange-accent official logo, existing marketplace hero, and installed components. Buyer now has a shopping banner, metrics, quick actions and order activity. Seller and Rider use branded welcome panels, actual account totals, activity queues and next steps. Logistics and Admin reuse shared welcome/metric panels while retaining their existing scoped operational and approval queues. Navigation has a purple selected state, accurate role-dashboard highlighting, role portal labels, and topbar account menus for Buyer/Seller/Rider. The mobile sidebar now exposes its previously hidden Close button and has an accessible description. Long names/company descriptions wrap.

All counts come from existing backend props; no sample earnings, growth, reviews, route maps or unsupported actions were introduced. Independent queue bars are labeled as overlapping counts rather than pie-chart percentages. Backend controllers, permissions, routes, OTP, Rider invitation rules, checkout, commission and database schemas were unchanged. Test fixtures were extended only in the guarded temporary SQLite browser server; fake notifications and synthetic accounts/documents were used.

Executed validation: 78 Laravel regression tests passed (867 assertions): DashboardTest, LogisticsWorkspaceTest, LogisticsApprovalChainTest and AdminManagementTest. Registration component tests: 32 passed. Native Chrome dashboard checks: 24 passed across five roles, including actual authenticated/scoped payload values, desktop, 768px tablet, 844px landscape, 320px mobile reflow, dark theme, current navigation, Escape and visible Close dismissal, account menus and zero runtime/console errors. Authentication smoke checks: 22 passed. The auth runner now waits for asynchronous select options before entering values; its initial province-selection timeout was a harness race, resolved before the successful rerun. Dashboard runner uses native mouse events for Radix menus and explicit browser/dialog focus for keyboard commands. Screenshots/results are stored in storage/app/dashboard-ui-check/ and storage/app/auth-ui-check/. TypeScript, targeted ESLint, Prettier, PHP fixture Pint, production browser and SSR builds passed.

Remaining verification: physical touch devices, screen readers, 200%/400% zoom, exhaustive contrast/keyboard coverage, live email/OAuth and configured production data. Browser smoke checks are not WCAG certification or a full workbook acceptance rerun. No production data/migrations, customer mail, commit, push or deployment occurred.


## Workflow verification after local schema repair - 2026-10-13

Confirmed all 22 migrations are applied on the configured local MariaDB database, including normalized account identifiers, registration contracts and company/rider activation tables. The supplied password-reset exception preceded the schema repair and referenced the formerly missing email_normalized column. Read-only checks confirmed all four existing role accounts are approved, verified and operational; Admin, Seller, Rider and Logistics dashboard queries succeeded against local MariaDB. Live local GET /login, /forgot-password and /shop returned HTTP 200 with Inertia pages and no SQL error page. The previous private backup and preservation check remain available under storage/app/private/local-db-backups/.

Executed full isolated backend suite: 838 passed, 3 skipped, 5,720 assertions, zero failures/errors (storage/logs/workflow-verification-tests.xml). Coverage includes login/admin access, password reset, email codes, registration/approval, uploads, inventory, checkout/COD, orders, logistics isolation, deliveries, commission and settings. Three workbook-specific password-visibility cases remain skipped in PHP; shared browser visibility checks do not constitute their complete manual acceptance procedures. Registration component suite: 32 passed. Native Chrome dashboard suite: 24 passed. Authentication browser rerun: 22 passed. The initial auth smoke failure read focus before its requestAnimationFrame callback completed; the runner now waits for the actual focus target with a bounded timeout and retains its assertions. No application behavior was changed in this verification turn. TypeScript, targeted ESLint, Prettier for the changed runner, migration/test Pint and production/SSR builds passed.

Limits: actual existing-account password login, live email/inbox/OAuth delivery, physical devices and full manual black-box/accessibility acceptance remain unverified. Backend and browser mutation tests used isolated SQLite databases, synthetic fixtures and fake notifications. Local site/database checks were read-only in this turn. No passwords reset, customer mail, unrelated refactoring, commit, push or deployment occurred.

## Public Rider signup and role capability reconciliation - 2026-10-13

Reviewed the supplied five-page ERP components PDF against current routes, dashboards, policies and workflows. The latest user instruction supersedes the previous invitation-only Rider signup brief. The [ERP role/capability audit](ERP_ROLE_CAPABILITY_AUDIT.md) records implemented behavior, reviewer responsibilities and remaining gaps, including the existing Buyer activation difference, product variants/vouchers/ratings, cost/profit accounting and Rider earnings. COD collected and shipping totals are not Rider income.

Rider is now a public signup role, including email/password signup, Google signup and existing-account role selection. Email verification opens the existing Rider application, which collects personal/address details, vehicle/plate, operational Logistics center and private ID/license/OR-CR. Submission binds affiliation from the selected center on the server and stays pending until its Logistics company/center approves. Rejection requires a reason and permits corrected resubmission. Admin can inspect Rider applications and manage allowed account statuses but cannot approve any Rider application, including legacy pending applications. Admin approval queue, dashboard list and badge exclude Riders. Historical decisions and existing invitation activation URLs remain intact.

Logistics navigation prioritizes Rider Applications and Rider Management. The Company Riders page shows company/center-scoped applicants and account management actions, with `canReview` and `canManage` computed using the existing policies. It supplies a shareable signup URL and retains resend only for existing invitations. Removed its nested application layout and duplicate feedback so it renders one main-content region/header. Rider/Logistics display labels remain distinct from the stored `courier`/`sorting_center` role identifiers.

A real browser enrollment exposed an existing address form defect: changing city reloaded and cleared the city-option list, losing its selected DOM value and blocking the Documents step. Province/city and barangay loading now have separate dependencies. The browser test traverses every Rider application step and validates controls before advancing.

Executed verification: full isolated Laravel suite **853 passed, 3 skipped, 5,984 assertions**; registration component suite **34 passed**; native Chrome authentication/onboarding suite **25 passed**; five-role dashboard suite **24 passed**. Rider browser coverage includes account creation, fake email OTP, all application steps, private synthetic document uploads, pending-access redirect, Logistics review confirmation and Rider password login into its own dashboard at 320px. Backend coverage includes foreign-role dashboards/routes/mutations, ownership injection, cross-company queues/review, missing documents/unavailable centers, Admin approval denial, rejection/resubmission and Google onboarding. Dashboard checks cover desktop, tablet, landscape, 320px, dark themes, mobile navigation, account menus and actual scoped fixture metrics. Exercised browser flows recorded zero runtime exceptions/console errors.

TypeScript, targeted ESLint, Prettier, Pint, browser production build and SSR production build passed. Final screenshots/results are in `storage/app/auth-ui-check/` and `storage/app/dashboard-ui-check/`. Visual inspection included the Rider signup and Company Riders mobile screenshots. Initial browser harness runs encountered startup/focus timeouts; the final runner explicitly waits for its fixture server and brings the page to the foreground before navigation, and all assertions remain enabled in the successful final run.

Limitations: the three existing PHP password-visibility workbook cases remain skipped; shared browser password checks are not their complete manual acceptance procedures. Live SMTP/inboxes, external Google OAuth, live PSGC, physical devices, actual screen readers, exhaustive zoom/contrast checks and every capability listed in the PDF remain unverified or incomplete as recorded in the capability audit. Automated/browser smoke checks do not establish WCAG compliance. Mutation tests used disposable SQLite, synthetic accounts/files and fake notifications. No production database mutation, new migration, customer mail, commit, push or deployment occurred.

## Authentication reference layout and shorter registration - 2026-10-13

Applied the supplied registration/login/recovery screenshots as layout references while retaining LubosMart's official logo, purple identity, typography and semantic theme tokens. Desktop signup uses a branded sidebar and wider form with responsive columns. Seller and Logistics signup now have Personal information, Business information and Review & submit steps, with backward navigation, retained values, current-step validation and server errors returning to the appropriate step. Buyer and Rider keep their simpler account forms and existing post-verification onboarding. Login, forgot password, recovery code and new-password screens share the same branded layout; recovery changes the form within that template.

Removed the large linked error summaries from login/registration, the long Rider explanation and the approval footer shown in the user's screenshots. Field errors, invalid states, backend validation and first-error focus remain. Removed the always-visible password requirements/hint. Unmet requirements and strength appear only after entering a password, and the requirement list disappears when all rules pass. Password strength rules themselves were not weakened.

Signup displays a Philippine mobile number beginning with `639`, uses a numeric mobile keyboard, and converts pasted local/international aliases into that display format. Server normalization now accepts bare `639`, `+639` and legacy `09` and preserves the existing `09` stored/unique identifier. The field's country-format error matches the new presentation. Regression tests cover valid aliases and duplicate detection across formats; existing records require no migration.

Added an accessible, scrollable Radix Terms and Privacy Policy dialog next to the acceptance checkbox. Opening/closing it does not accept terms or change consent. Content is an initial platform-terms draft based on the existing account/order/review/support behavior; no claim of formal legal review or legal compliance is made. The checkbox retains its existing server acceptance contract and has a complete accessible name.

Executed checks: **472 relevant Laravel tests passed, 3 existing tests skipped**, covering registration/phone normalization, login, approval and password recovery; after the phone-error copy update, the **80-test phone/shared-registration subset passed** again. **33 frontend component checks passed**. **27 native Chrome browser checks passed**, including all four signup roles, Seller/Logistics steps and required uploads, first-error focus without a summary, 320px reflow, conditional password guidance, policy open/close without consent changes, full fake-code password recovery, Rider Logistics approval, dark mobile rendering, keyboard controls and zero exercised runtime/console errors. TypeScript, targeted ESLint, Prettier, Pint and production/browser SSR builds passed. Screenshots and the final browser result are in `storage/app/auth-ui-check/`; desktop login/signup and mobile Rider screenshots were visually inspected.

Browser harness updates use native mouse events for actual controls, wait for the isolated fixture server and capture screenshots from the top of the page. Earlier harness focus timeouts and a selector-quoting error were corrected before the successful final run; assertions remain enabled. Fixture-only recovery codes are captured exclusively in the guarded disposable stage, with fake notifications and synthetic accounts. Live inbox/OAuth/PSGC, physical devices, actual screen-reader operation and exhaustive zoom/contrast acceptance remain unverified. No new dependency, migration, customer email, production mutation, commit, push or deployment occurred.

## One-submission Rider registration - 2026-10-13

The latest user instruction supersedes the earlier two-stage Rider account/application flow. Public Rider signup now collects personal/contact details, birthday, sex, optional middle initial, Logistics center, vehicle/plate, address, ID, driver's license and OR/CR in the same registration form as the password and consent. There is no Rider stepper or subsequent details page for a new complete signup. The removed "Join as a Rider" explanation is absent from both current frontend source and the built SSR output.

`RiderRegistrationRules` validates the complete guest request, including operational center membership eligibility, unique normalized plate, geographic hierarchy and private file constraints. `RiderRegistrationDetails` persists the user profile, address, Rider profile and all three private documents within the existing registration transaction. Files are removed on rollback. Company affiliation comes from the selected center, never a supplied company/status/reviewer identifier. The application is submitted while the account remains unverified. Verification transitions directly to pending and redirects to the waiting page; Logistics approval still gates deliveries. Existing incomplete/rejected accounts retain their correction flow and historical invitations remain compatible.

The single-page Rider fields use the existing upload component and shared registration feedback. Both client and server errors appear alongside their fields; other entered values and selected documents survive a failed submission, with the existing password-clearing behavior retained. Guest address options use the existing throttled registration-options endpoint with abortable dependent requests. Only operational center IDs/names are supplied publicly. New public Rider signup uses the complete email/password form; the Google signup path cannot create an incomplete Rider account. Existing Rider Google sign-in/linking remains available.

Executed verification: full isolated Laravel suite **862 passed, 3 existing tests skipped, 6,046 assertions**. The targeted Rider suite passed **15 tests**, including same-form missing-field errors, unsupported uploads, inactive centers, ownership injection, OTP-to-pending transition, cross-company/Admin approval denial, rejection/resubmission and successful Logistics approval. Existing registration/invitation/authentication tests were reconciled with the new complete-signup contract. Frontend component checks: **33 passed**. Native Chrome authentication suite: **28 passed**, including missing Rider details/files staying on `/register`, all Rider fields/documents submitted once, OTP going directly to waiting, Logistics approval and subsequent Rider login, all other role signups, shared recovery flow, mobile reflow, conditional password guidance, policy dialog, keyboard interaction and zero exercised runtime/console errors. The final mobile Rider screenshot was visually inspected.

TypeScript, targeted ESLint, Prettier, Pint and production/browser SSR builds passed. Browser evidence remains in `storage/app/auth-ui-check/`. Tests used disposable SQLite, synthetic documents/accounts, fake email notifications and mocked locations. Real mail/OAuth/PSGC, physical devices, screen readers and exhaustive contrast/zoom checks remain unverified; these checks do not certify WCAG compliance. No schema migration, new dependency, customer mail, production data mutation, commit, push or deployment occurred.

### Registration requirements and form behavior ‚Äî 2026-10-13

- Added the explicitly requested Buyer government ID requirement to the same registration form and server validation. JPG/PNG/PDF, maximum 5 MB; files use private local storage and transaction rollback cleanup. Buyer activation after email verification remains the existing contract. Google/legacy onboarding already requires an identity document through its application flow.
- Preserved Seller type-dependent documents, all Logistics documents, and Rider ID/license/OR/CR. Rider still submits all requirements in one signup before verification and Logistics approval.
- Partner step navigation focuses and scrolls to the next section while retaining entered fields and files. Sections use a short 160 ms reveal only when reduced motion is not requested. Submissions show upload percentage or a saving status and prevent duplicate submission.
- Validation: 866 Laravel tests passed, 3 existing skips, 6,065 assertions; 33 frontend component checks and 28 isolated native-browser checks passed. ESLint, TypeScript, Pint, formatting, browser production build and SSR build passed. PHP GD was enabled for the full test command, without changing server configuration. New tests cover missing/unsupported/oversized Buyer ID and private storage. Feature tests fake local storage to avoid real document writes.
- Visually inspected the updated Buyer tablet screenshot, including the required ID upload. Browser checks cover mobile reflow, dark mode, keyboard behavior, all four signups and Rider approval. Full assistive-technology, contrast and zoom audits remain outstanding; automated checks do not certify WCAG compliance.

### Registration alignment, PH phone and Rider progress ‚Äî 2026-10-13

- Fixed stretched inputs when neighboring fields display errors or success hints: field wrappers align at the start and retain their native control height. Applied the same alignment to Seller/Logistics/Rider detail and upload fields.
- Required native inputs, passwords, selects, uploads and consent now show a destructive-color asterisk; optional middle initial and previously saved replacement uploads remain optional. Native required semantics and existing validation stay in place.
- Mobile number input separates the fixed PH +63 prefix from the editable 10-digit national number. National, 09 and +639 pasted numbers normalize to the existing international registration payload and existing backend local storage format; clearing the input leaves no editable country prefix.
- Rider has three live section-completion indicators with keyboard-accessible links to the relevant fields. All details and documents remain in one form and one submission. Completion describes local field checks, not approval or identifier availability.
- Validation: 36 frontend component checks, 23 relevant backend tests (252 assertions), and 28 isolated browser checks passed; ESLint, TypeScript, formatting and production/browser+SSR builds passed. Browser checks additionally assert an empty national number, fixed PH prefix, required name marker and Rider progress presence. Visually inspected Buyer tablet and Rider mobile captures. Full screen-reader/contrast/zoom certification remains outstanding.

### Registration header and recovery feedback ‚Äî 2026-10-13

Removed the requested Already registered / Sign in header link from registration. Forgot-password now uses shared themed input/validation feedback, a warning panel for Google-only accounts, success feedback for sent status, processing text and first-error focus. Code verification and password reset reuse the same error panel; code fields associate invalid states with their messages. Existing routes and recovery rules remain intact.

Checks: 14 recovery backend tests (84 assertions), 36 component checks, ESLint, TypeScript, formatting and browser+SSR builds passed. All 28 isolated browser checks passed on the final run, including explicit header-link absence and themed forgot-password warning/error/focus assertions. One preceding run timed out on the existing login focus check; rerun passed without a login change. Inspected the 320px forgot-password validation capture. Full assistive-technology/contrast/zoom audits remain outstanding.

### Shared auth branding, typography and PH flag ‚Äî 2026-10-13

Updated the shared sign-in/signup/recovery left panel with the requested Local finds / Everyday favorites copy, LubosMart logo, lavender theme and decorative marketplace icons. Kept the existing responsive form widths and theme preference. Replaced three Georgia overrides in storefront headings with inherited Instrument Sans so website typography follows the shared family. Email template fonts are outside this website change.

Added a local inline SVG Philippine flag beside the fixed +63 country prefix; editable national digits, paste normalization and registration requirements remain intact. The flag is decorative and the existing Philippines hint describes the country code.

Validation: ESLint, TypeScript, formatting, browser/SSR builds, 36 component checks and 26 relevant backend tests (216 assertions) passed. All 28 isolated native-browser checks passed, including shared branding copy, computed heading font consistency and phone flag assertions. Inspected desktop sign-in/signup captures and mobile reflow. Full page-by-page visual, screen-reader, contrast and zoom audits remain outstanding.

### Minimal password feedback and consent copy ‚Äî 2026-10-13

Removed the registration strength meter, password checklist and password-success message. Incomplete entered passwords show one message beneath the field; untouched fields stay quiet and valid passwords clear that message. Existing password complexity and backend validation remain intact.

Consent now reads By signing up you agree to our Terms and conditions and Privacy policy, with a plain purple-accent checkbox and no asterisk. Both policy labels open the existing readable dialog without automatically accepting consent. Missing acceptance shows a contextual message underneath.

Validation: 98 relevant backend tests (536 assertions), 36 frontend component checks and 28 isolated browser checks passed, alongside ESLint, TypeScript, formatting and browser/SSR builds. Updated browser assertions confirm absent strength/checklist UI and remaining field feedback. Inspected the updated Buyer tablet capture. Full assistive-technology/contrast/zoom review remains outstanding.

### Contact hint and postal-code suggestions ‚Äî 2026-10-13

Removed the requested Philippines / 10-digit mobile hint. Seller, Logistics and Rider address forms now auto-fill the postal field from an exact province/city match, reset it when the address parent changes, and retain manual editing. Missing or ambiguous matches leave the field empty rather than guessing. This is a suggestion, not a claim that all addresses in a city share a ZIP code.

Imported 959 nonempty records from the official PHLPost locator into a local, attributed snapshot. The source contains blank entries and lacks a complete city/barangay mapping, including many NCR localities. Exact-name normalization supports City of and Sta./Santa variants; a missing city cannot be inferred from an unrelated barangay or another province. No extra runtime postal-service request or package is introduced. Refresh instructions and coverage limitations are in resources/data/README.md.

Validation: 39 relevant backend tests (424 assertions), 36 component checks and 29 isolated browser checks passed. Browser coverage verifies automatic Santa Rosa 4026, editable correction, and reset to blank for an unmapped city; full signup/approval/recovery flows still pass. ESLint, TypeScript, Pint, formatting and browser/SSR builds passed. After indexing the lookup for efficiency, both dedicated postal tests passed again. Full postal coverage and address-specific ZIP validation are not established by these checks; manual correction remains available.

### Role choice before signup ‚Äî 2026-10-13

The /register entry now shows four large keyboard-accessible role links before any personal fields. Choosing a role opens its existing registration form with a role-specific title and a Choose a different role link. Valid role-specific URLs open that role directly. The role picker inside the form is hidden on this page; required documents, verification, approvals, postal suggestions and the one-submission Rider workflow remain intact. Existing Instrument Sans typography is retained without introducing another font.

Buyer uses a cart icon. Rider uses a local motorcycle SVG with tank/engine details; Seller and Logistics retain their shared store/warehouse icons. Cards use semantic theme tokens, mobile single-column and desktop two-column layout with reduced-motion-safe hover transitions.

Validation: 37 relevant backend tests (417 assertions), 36 frontend component checks, ESLint, TypeScript, formatting and browser/SSR builds passed. All 30 isolated browser checks passed, including four choices and no email field on the initial screen followed by successful Buyer selection. Inspected desktop/mobile chooser captures. The final motorcycle silhouette was refined after that browser run and rebuilt; no workflow behavior changed. Full screen-reader/contrast/zoom audit remains outstanding.

### Forgot-password warning removal ‚Äî 2026-10-13

Removed the requested Google-only warning panel from forgot-password. Kept email validation, processing and recovery behavior. Updated the existing browser assertion to expect its absence; the browser suite was not rerun for this text-only removal. ESLint, TypeScript, formatting, four password-reset tests and browser/SSR production builds passed.

### Recovery back link ‚Äî 2026-10-13

Recovery pages use a small left chevron and Back to Login above the form, following the supplied reference. Removed the duplicate bottom login link on forgot-password. Kept the existing login route and 44px keyboard/touch target. ESLint, TypeScript, formatting, four password-reset tests and browser/SSR builds passed; a fresh visual browser capture was not taken for this small link change.

### Recovery back button ‚Äî 2026-10-13

Styled the recovery navigation above the form as an outlined Back to Login button with a chevron, theme-aware hover and visible keyboard focus. It remains an Inertia link to the existing login route with a 44px target. ESLint, TypeScript, formatting, password-reset tests and production/SSR builds were run; no new visual capture was taken for this styling adjustment.

### Rider steps, grouped names and service-area cards ‚Äî 2026-10-13

Rider registration now shows only the current step: personal details with first name/middle initial/last name grouped together, Rider details/address/documents, then review and account security. This remains one account creation submission before verification and Logistics approval. Current-step validation blocks Continue, server errors reopen their section, and mounted hidden sections preserve entered data and files during Back/Continue. Middle initial remains optional; required documents are unchanged.

Logistics service regions use responsive bordered selectable cards, purple selected states and a live selected-count status. The labels, native checkboxes and at-least-one-region validation remain; the group error spans the full width. Instrument Sans and existing theme tokens are retained.

Validation: 37 relevant backend tests (417 assertions), 36 component checks and all 31 isolated browser checks passed, plus ESLint, TypeScript, formatting and browser/SSR production builds. Browser checks cover personal gating, missing document validation, preserved names/files across Back/Continue and the full Rider approval flow. A preceding browser attempt timed out before fixture-server readiness; the rerun passed. Inspected mobile Rider details and Logistics service-card captures. Full screen-reader, contrast and zoom audits remain outstanding.
Visual review found the browser default outline around the entire programmatically focused step container. Removed that container outline while retaining keyboard focus indicators on controls; ESLint and browser/SSR builds passed again. No new screenshot was captured after this final container-only styling fix.

### Forgot-password action placement ‚Äî 2026-10-13

Moved the Back to Login action into the forgot-password form directly below Send email code. Uses shared outline button styling, matching width, rounded corners, chevron and 12px action gap. The layout hides its external back link for this page so there is one back action. Other recovery pages retain their navigation. ESLint, TypeScript, formatting, four recovery tests and browser/SSR builds passed; no fresh visual browser capture was taken for this small placement change.

### Selected-role navigation ‚Äî 2026-10-13

Registration hides Back to marketplace after a valid role is selected. The initial role chooser retains it; selected-role forms retain Choose a different role. ESLint, TypeScript, formatting, registration tests and browser/SSR builds were run. No fresh visual capture was taken for this conditional-link change.

### Recovery text-link styling ‚Äî 2026-10-13

Changed Back to Login below Send email code to a centered purple underlined text link, matching the latest reference. Removed its border, button background and chevron; retained its login destination and visible keyboard focus. ESLint, TypeScript, formatting, four recovery tests and production/SSR builds passed. No fresh browser screenshot was taken for this styling-only change.

### Fixed content editor height ÔøΩ 2026-10-14

The platform Content textarea now uses a fixed 12rem height with resizing disabled and internal vertical scrolling. Its width follows the dialog. Targeted ESLint, TypeScript and 30 admin tests (421 assertions) passed. Production build passed. Browser visual, keyboard, theme and zoom verification remain outstanding for this styling change.

### Account initials avatars ó 2026-10-14

Admin and logistics toolbar account buttons now display a neutral circular avatar with initials from the authenticated registered name, using the existing initials hook and Avatar components. Account dropdowns retain their accessible names and 44px targets with visible keyboard focus. Targeted ESLint, TypeScript, production build and 30 admin tests (421 assertions) passed. Browser visual, theme, keyboard and zoom verification remain outstanding.

### Sidebar account link removal ó 2026-10-14

Removed redundant My Account links from admin and logistics sidebars; account settings remain accessible from navbar dropdowns. Renamed the affected sidebar groups to Communication. Targeted ESLint, TypeScript, production build and 30 admin tests (421 assertions) passed. Browser visual and keyboard verification remain outstanding.

### Workspace search bar ó 2026-10-14

Replaced the admin toolbar search button with a labeled search input using shared input styling and responsive widths. Enter opens the existing search results dialog with the entered query; existing debouncing, cancellation and record actions remain. Toolbar can shrink its search field on narrow screens while keeping action targets. ESLint, TypeScript, production build and 30 admin tests (421 assertions) passed. Browser visual, mobile, keyboard and zoom verification remain outstanding.

### Admin sidebar branding ó 2026-10-14

Moved the admin navbar logo and LubosMart name into the sidebar header without the tagline. The brand link is hidden in the collapsed icon sidebar; the hamburger remains available to expand it. Mobile branding appears inside the navigation drawer. Existing dashboard destination is retained. ESLint, TypeScript, production build and 30 admin tests (421 assertions) passed. Browser visual, mobile, keyboard and zoom verification remain outstanding.

### Workspace search icon ó 2026-10-14

Replaced the toolbar search field with an icon-only 44px button opening the existing search dialog. Kept an accessible label, tooltip and visible keyboard focus. ESLint, TypeScript, production build and 30 admin tests (421 assertions) passed. Browser visual and keyboard verification remain outstanding.

### Admin business performance dashboard ó 2026-10-14

Added a navbar workspace label and current-page breadcrumb. Prioritized seven-day product sales, stored platform commission and completed parcel totals on the admin dashboard. Added a switchable daily sales/commission bar chart with an exact-values table, plus a delivered-share ring and status bars for parcels created in the period. The two date cohorts are labeled separately; timestamps use the displayed application timezone. Review queues and existing actions remain. Analytics are restricted to admins with report permission and use grouped aggregate queries rather than loading all parcels. No chart dependencies were added.

Validation: ESLint, TypeScript, Prettier, Pint and production build passed; 32 admin tests (473 assertions) passed, including completed-order/date boundaries, stored commission, zero-filled series and buyer access rejection. Browser visual, theme, mobile reflow, zoom, keyboard and screen-reader verification remain outstanding. Delivery share measures current completion of the creation cohort, not on-time delivery or attempted-delivery success.

### Logo sidebar toggle ó 2026-10-14

Replaced admin hamburger controls with a shared LubosMart logo button using the existing sidebar state and toggle handler. The logo remains available when collapsed; the LubosMart name remains a dashboard link shown when expanded. Mobile uses the logo to open the drawer and the drawer logo to close it. Buttons have 44px targets, visible keyboard focus, expanded-state semantics and action tooltips. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser visual, mobile and keyboard verification remain outstanding.

### Dashboard header report button removal ó 2026-10-14

Removed the requested View Reports action from the admin dashboard page header. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. No fresh browser visual check was performed for this button removal.

### Admin welcome priorities and account role labels ó 2026-10-14

Redesigned the admin welcome section with existing LubosMart branding, a responsive two-column layout, queue total, up to three actionable priority links, a first-queue action and permitted account management shortcut. Clear queues show an explicit All caught up state. Kept sales charts and full review queues below. Accounts role filters now use the shared roleLabel mapping so Buyer, Seller, Rider and Logistics labels match account rows and registration terminology; underlying filter values remain unchanged. Logistics account descriptions use Rider and Logistics wording.

Validation: formatting, targeted ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser visual, mobile, light/dark theme, keyboard, zoom and screen-reader checks remain outstanding.

### Dashboard title in navbar ó 2026-10-14

Moved the admin dashboard title and description into the navbar, replacing its Admin workspace label and breadcrumb. Removed the duplicate content heading; retained one visible h1 and the browser title. Added an optional page header slot through the existing sidebar layout; other pages retain their headings. The navbar grows and wraps on narrow screens so the description remains readable. Formatting, ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser visual, mobile, zoom and keyboard verification remain outstanding.

### Welcome brand label removal ó 2026-10-14

Removed the requested logo and LubosMart admin label from the dashboard welcome section and its unused heading spacing. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. No fresh browser visual check was performed for this removal.

### Account access help removal ó 2026-10-14

Removed the requested Account access rules disclosure from the Accounts filter card and its unused icon import. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. No fresh browser visual check was performed for this removal.

### Aligned admin header and sidebar theme toggle ó 2026-10-14

Aligned the admin sidebar brand header and desktop navbar to 72px. Reduced the navbar page heading to 20/24px with tighter description spacing; desktop descriptions truncate with full text retained and a tooltip, while narrow layouts wrap. Added a light/dark mode toggle at the bottom of all application sidebars using the existing persisted appearance preference. Synchronizes appearance controls in the same window and across storage updates in other tabs. Fixed a stray exclamation mark before the first import in nav-user.tsx that blocked compilation.

Validation: targeted ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser alignment, light/dark visuals, mobile reflow, zoom and keyboard verification remain outstanding; automated checks do not verify these interactions.

### Account details and external access controls ó 2026-10-14

Removed the shield icon from the Accounts filter heading. Account cards now use two-letter initials, tighter spacing, View details and an expandable Manage access panel outside the profile modal. The panel fetches current per-account allowedStatuses from the existing protected account JSON endpoint, supports loading/error/retry/no-action states, and reuses the extracted access form. Required reasons, confirmation, server validation and existing authorization remain; reasons reset when the selected action changes. Confirmations name the selected action and account. Embedded account modals now show profile and access history without mutation controls or navigation into a registration review form; the registration ID remains visible. Standalone profiles retain the shared access form.

Validation: formatting, targeted ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser visual, inline access interactions, confirmation focus, keyboard, light/dark themes, mobile and screen-reader verification remain outstanding.

### Consistent bold navbar labels ó 2026-10-14

Standardized uppercase navbar labels at 12px bold with shared tracking. The dashboard navbar heading now follows the same uppercase bold typography while retaining its description below and semantic h1. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser visual verification remains outstanding.

### Hidden sidebar scrollbar ó 2026-10-14

Hidden the visible sidebar menu scrollbar using scrollbar-width and the WebKit scrollbar selector, retaining existing overflow scrolling. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser visual and keyboard/short-viewport verification remain outstanding.

### Dashboard priority icon removal ó 2026-10-14

Removed the circular decorative icon from the review priorities summary and the unused Check import. ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. No fresh browser visual check was performed for this removal.

### Registration-based account verification details ó 2026-10-14

Account View details now loads the account's linked registration through the existing protected review endpoint and renders the existing registration view with canReview disabled. This keeps submitted fields, role-specific requirements, review metadata and signed supporting-document links consistent with registration review. Access management and access history are excluded from this verification view. Accounts without an application show an explicit notice and saved profile details only. Failed or unauthorized registration fetches show a retryable error; existing server authorization is retained.

Validation: formatting, ESLint, TypeScript, production build and 32 admin tests (473 assertions) passed. Browser checks for chained loading, read-only review rendering, document viewing, keyboard and mobile behavior remain outstanding.

### Manual admin approval for Buyer registrations ó 2026-10-14

Buyer signups now submit their required private identity document for review. Email verification leaves the Buyer pending instead of auto-approving the account; operational access remains blocked until an administrator approves the application. Admin approval requires the identity document record and underlying private file to exist, while rejection with a reason remains available and dispatches the existing decision email notification. Updated signup policy text to include Buyer administrator review. Existing approved accounts were not modified.

Validation: 737 auth/admin/approval-chain tests passed (5109 assertions), with 3 existing browser-only cases skipped. New tests cover pending state after verification, cart restrictions, manual activation, decision notifications and missing-ID record/file rejection. Pint, ESLint, TypeScript and production build passed. Browser verification and actual email inbox delivery remain unverified.

### Registration-based account design and Logistics-owned Rider management ó 2026-10-14

Applied the supplied account/profile layout using live data: filtered account summary cards, registration dates and actual registration-stage labels, validated name/newest/oldest sorting, and compact cards with external access controls. Account details use a read-only registration profile organized into personal information, role details, supporting documents and actual verification/submission/review timestamps. Preserved signed private-document links. No invented section percentages, edit controls, reminders or notes were added.

Per explicit user clarification, all Rider management now belongs to the owning Logistics company. Admin account lists, summaries, dashboard account counts and workspace search exclude Riders; server policies deny Admin Rider account actions, registration details and private documents. Logistics can suspend, deactivate and reactivate its approved riders, subject to existing verified-email/application and company/center ownership checks. Admin still manages Buyer, Seller and Logistics accounts. Existing accounts and audit records were not changed. Updated old permission tests to reflect the authorized ownership change.

Validation: 314 relevant tests passed (2446 assertions), 1 existing browser-only test skipped. Added summary/filter/sort validation and Admin Rider exclusion checks; updated ownership, private-document and status-transition coverage. ESLint, TypeScript, formatting, Pint and production build passed. Browser visual, mobile, theme, keyboard, section navigation and document interactions remain unverified.

### Simplified account management and registration handoff ó 2026-10-14

Removed the account summary metric cards and their unused frontend props/icons. Pending accounts link to Registrations for application review; external access controls appear only for approved, suspended or deactivated accounts. Profile details remain read-only. Recorded the user's preference against summary metric strips on Accounts and Registrations pages in the UI standards.

Validation: 472 registration/account/Logistics tests passed (3370 assertions); 3 existing browser-only cases skipped. ESLint, TypeScript, formatting and production build passed. Coverage includes Buyer manual approval and ID requirements, Seller/Logistics review, decision notifications and Logistics-only Rider ownership. Actual inbox delivery and browser visual/keyboard interaction checks remain unverified.

### Admin readiness validation before Logistics work ó 2026-10-14

Confirmed Admin role options contain Buyer, Seller, Logistics and unassigned only. Hardened server filter validation so an Admin request with role=courier is rejected; Logistics filter values remain Rider-only. Extended the isolated headless browser checks to current logo navigation/account menus, all nine Admin management pages, Rider exclusion in role filters and workspace search, read-only account details, chart measure switching and sidebar theme controls.

Validation: full backend suite passed 874 tests (6190 assertions), with 3 existing browser-only test cases skipped. Fresh AdminManagement run passed 33 tests (506 assertions), including the new invalid Admin Rider filter check. All 36 isolated browser checks passed, with no browser console/runtime errors; checks cover 320px mobile, tablet, landscape, desktop, dark rendering, mobile menu Escape/Close and Admin page rendering. Inspected the final desktop admin screenshot. Pint, targeted ESLint, TypeScript and production build passed. Evidence: storage/app/dashboard-ui-check/results.json and admin-verified-desktop.png. Real email inbox delivery, full assistive-technology/contrast/zoom assessment and production deployment are not verified by these checks.

### Manage access dialog ó 2026-10-14

Converted the account Manage access disclosure into a Radix modal with an account-specific title, description, scrollable content and trigger focus restoration. Kept current server allowed actions, required reason, nested decision confirmation and saved-state refresh. Removed the disclosure chevron. Account profile details remain separate and read-only.

Validation: ESLint, TypeScript, formatting, production build and 33 admin tests (506 assertions) passed. All 37 isolated browser checks passed, including allowed-action loading, opening confirmation, cancellation, closing the modal and restoring trigger focus. No browser runtime/console errors. No real account status was changed during browser validation.

### Code-only registration email verification ó 2026-10-14

Removed the verification-link action and expiry copy from registration emails. The existing sender now issues only hashed six-digit registration codes, with five-minute expiry, a 60-second resend cooldown, hourly send limits and attempt limits. It no longer generates email verification tokens. Legacy verify-email/link endpoints return HTTP 410 and cannot verify an account, including previously issued tokens. Normal Buyer/Seller/Logistics/Rider signup uses this code flow. Existing legacy Rider invitation/password-setup links are a separate workflow and remain available. Updated verification-page copy and regression tests for authenticated code verification, expiry, resend, changed addresses, disabled links and concurrent registration.

Validation: 867 tests passed (6100 assertions), 3 existing browser-only cases skipped. Pint, frontend ESLint, TypeScript, formatting and production build passed. Mail template tests verify that registration emails contain the code and no verification-link URL. Actual SMTP inbox delivery remains unverified.

### Shared transactional email design ó 2026-10-14

Applied the supplied lavender/purple visual direction to all LubosMartMailMessage notifications through shared HTML and plain-text views. Uses an email-friendly table layout with inline colors/styles, rounded white card, decorative envelope/status symbol, clear heading/greeting, prominent six-digit code panel and security notice, purple action buttons with fallback links and branded footer. Registration code expiry remains 5 minutes; password/profile security codes remain 10 minutes. Registration emails retain code-only verification; approval notices show the approved state and recipient-specific dashboard action. Rejection reasons and dynamic fields are escaped. Delivery, compliance and account-status notices share the layout with appropriate event headings/symbols.

Validation: 85 mail/registration/admin tests passed; 26 mail-template tests passed after adding code-panel/expiry and escaped-reason checks. Pint, TypeScript and production build passed. Rendered dummy-data registration/password/approval HTML previews without sending messages; inspected registration and approval browser screenshots. Preview artifacts are in storage/app/mail-previews. Gmail/Outlook/mobile-email-client rendering and actual SMTP inbox delivery remain unverified.

### Password code back link ó 2026-10-14

Replaced the Google-only notice on the password-code page with a centered purple underlined Back to Login link matching forgot-password. Hid the external layout back link to avoid duplication. Formatting, ESLint, TypeScript, production build and 14 password/code tests (84 assertions) passed. No fresh browser visual check was performed for this text/link change.

### Name validation limits ó 2026-10-14

Aligned personal-name format validation across registration, application submission and profile editing using shared AccountRules. First and last names remain 2ñ50 characters; full display names remain capped at 160 and now require at least two letters. Rejects a single letter, a letter plus punctuation, digits, unsupported symbols and over-limit values. Preserves supported Unicode/Filipino letters, combining marks, spaces, hyphens, apostrophes and periods. Profile names are trimmed before validation. Added native browser minLength/pattern checks and matching registration step validation with clearer messages; escaped the hyphen for HTML Unicode-set patterns.

Validation: 425 related tests passed (2539 assertions), 3 existing browser-only cases skipped. Fresh focused Admin browser checks passed, including native rejection of A, A. and John123 and acceptance of a Filipino name without submitting. One broad browser rerun hit an unrelated page-render timeout; focused checks then passed all Admin pages and the changed input behavior. Pint, ESLint, TypeScript, formatting and production build passed.

### Google continuation removed from sign-up ó 2026-10-14

Removed the Google continuation button and or divider from the shared registration form, plus its unused Google form state. Sign-in retains its Google option. Registration requirements, validation and email-code submission remain unchanged. Formatting, ESLint, TypeScript, production build and 34 registration/Google-auth tests (301 assertions) passed. No fresh browser visual check was performed for this removal.

### Initial registration sex field - 2026-10-14

Restored the optional Sex selector to Buyer, Seller and Logistics personal information in the shared sign-up form, using the existing Female, Male and Prefer not to say values. Added matching server validation and initial user-profile persistence, plus the partner review summary. Rider keeps its existing required Sex selector in Rider details without duplication; its error focus remains on that step. No approval or email verification behavior changes.

Validation: 275 related registration tests passed (1685 assertions), 2 existing cases skipped. Selected-value persistence and rejection of unsupported values are covered. Pint, formatting, ESLint, TypeScript and production build passed. No fresh browser visual, keyboard or screen-reader check was performed for this form addition.

### Role-specific review, live notifications and simpler email - 2026-10-14

Registration review now reuses the same read-only RegistrationProfile as account details. Buyer has personal information and ID only; Seller shows seller business fields; Logistics shows SEC, TIN, position and service regions; Rider remains Logistics-owned. Removed payout fields that were not collected by these registration forms. Personal birthday/age appear for roles that collect them or saved profiles that contain a birthday. Buyer address appears only if supplied. Review document results are filtered by the actual registration role/type requirements, and rejection presets are role appropriate.

Admin notification counts now load from an authenticated, active Admin endpoint when the menu opens and refresh every 30 seconds while visible. Destinations respect granted permissions and use keyboard-operable menu items; failed refresh offers Retry. The bell remains a grouped operational queue summary, not a historical notification inbox.

Approval and rejection email is submitted synchronously after the decision transaction succeeds, removing the queue-worker dependency for new decisions. SMTP failure preserves the saved decision, is reported and produces explicit failure feedback. Existing queued messages were not drained or resent. HTML and plain-text email now use concise copy, six-digit code and expiry for code messages, with no images, logos, icons or emoji. Decision links and escaped rejection reasons remain. Regenerated dummy registration/password/approval previews.

Validation: full backend suite passed 883 tests (6104 assertions), 3 existing browser-only cases skipped. Tests cover actual array-mail transport delivery from approval, delivery failure preserving approval, live count changes, authorization and Buyer document filtering. Focused Admin browser checks passed 21 checks, including Buyer/Seller review separation, Buyer ID-only documents, notification menu keyboard dismissal, access confirmation and mobile/dark dashboards; zero runtime errors. Inspected fresh email and review screenshots. Pint, ESLint, TypeScript, formatting and production build passed. Actual SMTP inbox delivery and Gmail/Outlook rendering remain unverified; no real-recipient messages were sent. Screen-reader and full zoom compliance were not established.

### Complete registration requirements and Google handoff - 2026-10-14

Read the user-supplied ERP-Components.pdf with pdftotext and mapped every registration field in REGISTRATION_REQUIREMENTS.md. Sex and birthday are required across all four role forms and application submission; optional middle initial remains visible and is saved for every role. Show automatically calculated age, dependent province/city/barangay selections, house/unit number and street, and private role-specific uploads. Buyer address is now saved and explicitly linked using the application's guarded address_id field. Seller business permit is required for every seller type, alongside existing additional DTI/SEC/BIR requirements. Logistics resubmission now saves its personal profile fields. Updated review details to show structured names and optional middle initial. Approval remains with Admin for Buyer/Seller/Logistics and owning Logistics for Rider.

Unknown verified Google identities no longer create an incomplete account in the callback. They are redirected to registration role selection; selecting any role fills the Google first/last name and email. Email is read-only in the form and validated against server session identity; provider ID is never trusted from form data or exposed in Inertia props. Pending identity expires after 30 minutes and is cleared after successful signup. Registration still requires password, consent, uploads and six-digit email verification before pending review. Existing-account Google sign-in and access restrictions remain covered. Duplicate email submissions display the existing explicit already-registered error, including normalized duplicates.

Reserved field label/feedback space and a fixed scrollable document-preview region to prevent input rows shifting when errors or selected files appear. Applied reserved feedback to onboarding inputs too. Error messages remain accessible and long content can scroll or expand rather than being clipped.

Validation: full backend suite passed 893 tests (6203 assertions), with 3 existing browser-only cases skipped. Frontend component/validation tests passed 36 tests. Isolated authentication browser checks passed 33 checks, including Google callback/role-choice/prefill with a fake provider, stable input spacing under validation at 320px, complete Buyer/Seller/Logistics/Rider signup and code verification, required documents, pending approval, Logistics rider approval, dark theme and keyboard/accessibility names; no runtime console exceptions. Pint, ESLint, TypeScript and production build passed. Live Google consent/provider configuration, actual SMTP inbox delivery, screen-reader testing and full zoom compliance remain unverified. No real-recipient emails were sent and no deployment or Git operations were performed.

### Buyer steps and compact authentication spacing - 2026-10-14

Buyer now follows Personal information, Address & ID, and Review & submit using the shared registration step flow. Continue validates the current step and focuses its first invalid control; Back retains details and the selected private ID. Server errors return to the appropriate step. The review includes name, email, sex, phone, birthday/calculated age, address and selected ID filename before password/consent submission. Google prefill and every PDF registration field remain available.

Removed the excessive 80px blank feedback reservation and 40px field label reservation from shared sign-in and registration fields. Reserve a short helper line and use compact inline feedback, allowing longer messages to wrap accessibly. This also tightens Seller, Rider, Logistics and onboarding fields. Fixed recovery error-focus timing to focus after processing completes and the email input is enabled.

Validation: 36 frontend component/validation tests and 198 relevant Laravel tests passed, with 2 existing browser-only cases skipped. Final isolated authentication browser run passed 34 checks, including Buyer Back/Continue with retained name/address/ID, valid registration and email-code waiting flow, Google prefill, all other role registrations, common required-field spacing at 320px, dark theme, keyboard/accessibility names and zero runtime exceptions. Inspected fresh desktop sign-in, mobile Buyer personal-step and tablet review-step screenshots. ESLint, TypeScript, formatting and production build passed. Long error text can increase helper height rather than being clipped. Full screen-reader/zoom compliance was not established; provider and mail delivery were faked in browser checks.

### Common personal fields for Rider - 2026-10-14

Moved Rider Sex to the shared Personal information step and removed the duplicate selector from Rider details. Sex errors now return to the first step for every role. All roles keep the same personal controls, including optional middle initial and required Sex. Age is now labeled Age, while retaining its calculated/read-only value.

Validation: 20 relevant Laravel tests, 36 frontend tests and all 34 isolated authentication browser checks passed, including Rider signup with Sex selected in Personal information, retained uploads and Logistics approval. ESLint, TypeScript, formatting and production build passed. No fresh full screen-reader or zoom audit was performed for this field relocation.

### Tighter sign-in spacing - 2026-10-14

Sign-in opts out of empty field-feedback placeholders while retaining compact, accessible validation messages when present. Reduced form section gaps and the Google divider margins to 16px. Registration keeps its existing helper-space reservation through the shared controls' default behavior. Inspected the fresh desktop sign-in screenshot showing tighter email/password/action spacing.

Validation: 22 authentication/Google tests, 36 frontend tests and all 34 isolated authentication browser checks passed. ESLint, TypeScript, formatting and production build passed. Browser checks include required-field focus, mobile/dark reflow and keyboard names. Full screen-reader and zoom compliance was not established.

### Stable registration branding panel - 2026-10-14

Refined the shared registration sidebar with a viewport-height desktop panel, consistent one-third width, modest logo/brand sizing, smaller headline and description, quieter border and a separate flexible illustration area. The illustration fits the available height without overlapping the text. All registration roles use the same shell and branding placement; mobile retains the existing compact header and full-width form. LubosMart assets, purple/lavender tokens and form workflows are preserved.

Validation: 44 relevant Laravel tests and all 35 isolated authentication browser checks passed. New browser verification compares panel/headline/illustration geometry across Buyer, Seller, Rider and Logistics at 1440x900 and checks visible branding fits 1024x480. Existing checks cover mobile/dark registration, Google prefill, Buyer step navigation and all role signup flows. Inspected fresh normal-height and short-screen registration screenshots. Formatting, ESLint, TypeScript and production build passed. Full zoom and screen-reader compliance were not established.

### Password-code notice and actions - 2026-10-14

Removed the generic success banner from the password-code page. Verify code uses a full-width primary button with clearer sizing and directional icon; Send another code is a lighter secondary action. Both actions show processing labels/spinners and disable concurrent verification/resend; fields are disabled during requests. Server code expiry, attempt limits, resend rules and generic account-privacy response remain intact.

Validation: 14 password/code tests and all 36 isolated authentication browser checks passed, including absence of the banner, mobile action layout and actual code verification through password recovery. Inspected the fresh mobile password-code screenshot. Formatting, ESLint, TypeScript and production build passed. Full screen-reader/zoom compliance and actual mail inbox delivery were not established.

### Role-selection branding baseline retained - 2026-10-14

Confirmed the registration left panel must retain the role-selection screen's proportions when a role card is clicked and the form scrolls. Kept the shared viewport-height/one-third desktop shell and prevented the registration logo/text blocks from flex shrinking. Branding still adapts to viewport dimensions, rather than the selected role or form length.

Validation: 27 related Laravel tests passed. Browser comparison now takes its baseline from /register, clicks each of the four role cards and compares panel/logo/headline/illustration geometry before and after form scrolling. That comparison passed, alongside short-screen containment and the complete authentication browser checks. ESLint, TypeScript, formatting and production build passed. Full screen-reader/zoom compliance was not established.

### Marketing and authentication typography - 2026-10-14

Refined homepage, sign-in and sign-up typography while retaining Instrument Sans and LubosMart assets/colors. Marketing headlines use semibold weight, controlled negative tracking and a tighter readable line-height; uppercase taglines use smaller type and quieter letter spacing. Reduced oversized auth wordmark/headline limits, improved copy wrapping and kept the illustration clear of the narrower sign-in copy. Authentication page headings/descriptions use balanced wrapping. Homepage hero type now scales down appropriately on small phones; category names/captions are more readable, and section/CTA headings share the stronger hierarchy. Registration panel geometry remains consistent across roles.

Validation: 44 relevant Laravel tests passed. The full authentication/home browser run passed 37 checks, including homepage checks at desktop/tablet/320px, fixed branding across role-card navigation/scroll, all role registration flows, mobile/dark auth and zero runtime exceptions. After the final homepage mobile/CTA font refinement, reran the focused homepage checks at all three widths and inspected the new mobile homepage and desktop sign-in screenshots. Formatting, ESLint, TypeScript and production build passed. Full screen-reader/zoom compliance and field performance metrics were not established.

### Decorative marketing serif restored - 2026-10-14

Per the user's explicit reference, restored Georgia serif lettering for the Local finds / Everyday / favorites slogan on the homepage and shared sign-in/sign-up branding. The purple favorites accent remains italic. Body text, form headings and controls retain Instrument Sans. A shared serif theme token keeps both implementations consistent without a new font dependency.

Validation: ESLint, TypeScript, formatting and production build passed; 44 related authentication tests passed. All 37 isolated browser checks passed, including desktop/tablet/320px homepage layout, shared authentication branding, stable registration geometry across all roles, short-screen containment, registration and recovery flows. Inspected fresh desktop sign-in and mobile homepage screenshots. Full screen-reader/zoom compliance was not established.

### Registration Continue placement - 2026-10-15

Moved the personal-information Continue action into the email field row in the shared registration form for all roles. Desktop/tablet align the button with the email input; narrow mobile places it immediately below the email field. The later-step Continue action retains its footer placement. Existing advance validation and busy state remain intact.

Validation: formatting, targeted ESLint, TypeScript and production build passed. 22 registration tests passed (206 assertions). After the build, all 37 isolated authentication browser checks passed, covering all role flows, validation focus, stable inputs, mobile reflow and keyboard access. Inspected fresh desktop and mobile registration screenshots. Full screen-reader/zoom compliance was not established.

### Homepage section serif reference - 2026-10-15

Applied the user's supplied typography reference to Shop by category, Browse. Order. Enjoy. and the seller banner headline. Section headings use the shared Georgia serif at normal weight; the seller headline uses bold serif. The existing serif/italic hero and sans-serif labels, navigation and body copy remain consistent with the reference.

Validation: formatting, homepage ESLint, TypeScript and production build passed. Homepage HTTP test passed. Focused isolated browser checks passed at 1440px, 768px and 320px with no horizontal overflow. Inspected the fresh desktop homepage screenshot. Exact reference font identification and full screen-reader/zoom compliance were not established.

### Document-step actions and review cleanup - 2026-10-15

Moved the Back/Continue action group directly after the role-specific address/identity/requirements step, before the hidden review section, so review content cannot separate the document fields and navigation. Removed the Back action from Review & submit; the existing progress buttons still allow returning to previous steps with entered values/uploads intact. Preserved upload feedback space and requirements.

Validation: targeted ESLint, formatting, TypeScript and production build passed. 22 registration tests passed (206 assertions). Isolated authentication browser checks cover all role flows and returning from review through the step indicator, with no Back button in review. Full screen-reader/zoom compliance was not established.

### Text-only registration branding - 2026-10-15

Removed the marketplace illustration from registration branding only. Kept the logo and LubosMart name at the top; centered the marketing copy in the remaining panel space and enlarged the serif slogan responsively. Short-height screens use compact type/spacing. Desktop panel width and geometry remain consistent through role selection, all role forms and scrolling.

Validation: formatting, ESLint, TypeScript and production build passed. 27 authentication/registration tests passed (236 assertions). All 37 isolated browser checks passed, including absence of the registration illustration, consistent geometry across four roles, short-screen containment, mobile/dark reflow and all registration flows. Inspected desktop and short-screen registration screenshots. Full screen-reader/zoom compliance was not established.

### Sign-in brand placement and larger marketing text - 2026-10-15

Anchored the shared sign-in/recovery panel logo and app name at its upper-left padding instead of vertically centering the whole brand group. Marketing copy fills a vertically centered half-width column below the brand, with the serif headline scaling from 48px to 96px. The illustration occupies the other half of the panel, leaving a clear boundary between copy and art. Registration retains its text-only branding layout.

Validation: formatting, ESLint, TypeScript and production build passed. Nine sign-in/password-reset tests passed. All 37 isolated authentication browser checks passed, including login, recovery, all registration roles, mobile/dark reflow and keyboard controls. Inspected the fresh desktop sign-in screenshot for spacing and separation of text and artwork. Full screen-reader/zoom compliance was not established.

### Optional middle initial validation - 2026-10-15

Optional middle initial now applies the same allowed name characters as first/last name, with at least one letter and the existing ten-character limit. Blank remains valid and one-letter initials with a period are accepted. Shared server rules cover signup, application submission and logistics-managed Rider registration; client step validation and native input pattern match. Numbers, emoji, punctuation-only entries and overlong values are rejected.

Validation: 34 registration feature tests and 37 frontend tests passed, including valid/blank and invalid optional-name cases. Formatting, targeted ESLint, TypeScript and production build passed. Existing application and Rider registration workflow tests were also run. No new visual layout was introduced; full screen-reader/zoom compliance was not established.

### Compact shared document feedback - 2026-10-15

Reduced the shared upload feedback area from 176px to 128px so Back/Continue sit closer to the document controls across Buyer, Seller, Logistics and Rider registration. Kept a fixed feedback region to preserve input geometry. File details occupy a scrollable flex area and View file does not shrink, keeping the preview action fully visible on narrow screens even with wrapped file information.

Validation: formatting, ESLint, TypeScript and production build passed; 34 registration tests and 37 frontend tests passed. After the final flex adjustment, all 37 isolated authentication browser checks passed, including uploads, replacement/removal and all role registration flows. Inspected the fresh 320px Rider screenshot and confirmed complete View file buttons. Full screen-reader/zoom compliance was not established.

### Shared small-caps two-color app wordmark - 2026-10-15

Per the user's explicit brand typography request, introduced a shared AppWordmark using serif small caps. Lubos uses the primary purple and Mart uses a semantic orange brand token; dark surfaces use lighter colors. Applied to homepage header/footer, shared authentication and onboarding layouts, the app logo/sidebar, public page header and waybill. Descriptive prose and email templates remain ordinary text. Existing logo assets and workflows are preserved.

Validation: formatting, ESLint for all changed components, TypeScript and production build passed. Forty homepage/authentication/registration feature tests passed. The isolated authentication browser checks cover homepage at desktop/tablet/320px, all role registrations, login/recovery and dark mobile reflow. Inspected the fresh desktop sign-in wordmark. Individual operational pages and printed waybill appearance were not manually inspected; full screen-reader/zoom compliance was not established.

### Middle initial label cleanup - 2026-10-15

Removed (optional) from the middle initial label in shared signup and onboarding/application forms. It remains without an asterisk and is still optional, with the existing entered-name validation intact.

Validation: formatting, targeted ESLint, TypeScript and production build passed; 34 registration tests passed. This text-only change did not receive a new browser screenshot review.

### Birthday helper text removed - 2026-10-15

Removed the persistent minimum-age helper under the signup birthday input. Client/server minimum-age validation and its actionable invalid-input error remain intact.

Validation: formatting, ESLint, TypeScript and production build passed; 34 registration tests passed. No new browser screenshot review for this helper-text-only change.

### Bold capital app-name reference - 2026-10-15

Adjusted the shared wordmark to match the user's bold serif capital-letter sample: uppercase with weight 700, retaining purple Lubos/orange Mart. Uses ordinary text and CSS rather than mathematical Unicode characters. Applies wherever the shared app wordmark is rendered.

Validation: formatting, wordmark ESLint, TypeScript, six homepage/authentication feature tests and production build passed. Focused homepage browser checks passed at desktop/tablet/320px without horizontal overflow. Other operational pages were not individually visually reviewed in this batch.

### Equal-capital wordmark text - 2026-10-15

Changed the shared app-name text to literal LUBOS and MART capitals. Every letter now uses the same inherited font size, weight and normal capital variant; L and M do not receive separate sizing. Retains the two-color design.

Validation: formatting, ESLint, TypeScript, homepage HTTP test and production build passed. Focused homepage browser reflow checks cover desktop/tablet/320px. No separate operational-page screenshot review in this text-only batch.

### Logistics operations shell and dashboard - 2026-10-15

Applied the admin sidebar/navbar visual style to Logistics with its own grouped entries: pickup, receiving, sorting, assignment, monitoring, Rider applications/management, rates, reports, messages and account settings. The logo toggles navigation; duplicate footer account controls are replaced by the topbar account menu. Search opens a scoped parcel/Rider dialog and the queue menu links to existing operations. Logistics page headers occupy the navbar consistently. Added an ordered five-stage parcel workflow to the dashboard using existing routes and real center metrics. Removed the redundant dashboard-wide Parcel Operations button. Corrected the shared Settings layout to expose its main heading.

Existing server account/application policies enforce Rider-only and company/center boundaries. All requested operational flows already existed and were verified rather than replaced. See LOGISTICS_WORKSPACE.md for the requirement-to-route mapping.

Validation: full backend suite passed 905 tests (3 existing skips); 38 additional profile/security/password tests passed after the heading fix. Formatting, targeted ESLint, TypeScript and production build passed. The isolated Logistics browser run checks actual login, every stage/workspace destination, scoped Rider search, operational/account menus including logout, desktop/tablet/landscape/320px navigation and dark theme. Inspected the desktop dashboard; final run follows removal of its duplicate action. Full screen-reader/zoom compliance and real external email delivery were not established.

### Solid sans-serif app wordmark - 2026-10-15

Replaced the shared two-color serif app wordmark with a single primary-purple Instrument Sans wordmark at the existing loaded 600 weight. Kept equal uppercase letter sizing and a lighter purple treatment on dark footer surfaces. This applies to all shared app-name placements. The user supplied vendo-ph.app as a reference, but both web access and direct retrieval failed, so its exact font was not identified and this is a clean local-font fallback, not a claimed exact match.

Validation: formatting, ESLint, TypeScript, six homepage/authentication feature tests and production build passed. Focused homepage browser checks cover desktop/tablet/320px. Exact reference matching and all operational-page visual checks remain unverified.

### Bold serif single-color wordmark - 2026-10-15

Matched the app name to the existing seller-banner serif reference: shared Georgia serif at 700 weight with equal uppercase letters. Uses primary purple on light branding surfaces; the inverse variant used on the dark footer is white. Retains one color per wordmark rather than splitting Lubos/Mart.

Validation: formatting, wordmark ESLint, TypeScript, six homepage/authentication tests and production build passed. Focused homepage browser reflow checks cover desktop/tablet/320px. Individual operational pages were not manually re-inspected for this shared typography change.

### Shared role navigation and photographic homepage products - 2026-10-15

Extended the admin/Logistics sidebar styling, logo navigation toggle, footer theme control and navbar page headings to Buyer, Seller and Rider. Their topbar uses the same compact avatar/icon layout with role-specific cart/search, queues, messages and account actions. Removed the floating messenger mount from the shared app layout for every role. Admin/Logistics message icons now link to the existing Messages page, preserving access after widget removal.

Replaced homepage AI category/hero illustrations with product cards and a product spotlight. Four locally hosted photographic samples show product names, units and labeled sample prices; their source/license credits are public on the homepage and in public/images/products/samples/CREDITS.md. Published products with stock and photos from approved, verified sellers replace the fallback samples. Extracted the existing storefront publication boundary into Product::availableToShoppers and reused it on the homepage and catalog without broadening catalog visibility. No purchasable sample inventory or account data was created.

Validation: eight new homepage visibility tests cover published product details and rejection of hidden/out-of-stock/no-photo/unapproved-store/restricted-seller/unverified-seller/inactive-category rows. Full backend suite passed 913 tests (3 existing skips). All 41 dashboard browser checks passed across five roles, navigation/account menus, scoped search, operations pages, light/dark mobile reflow and zero runtime exceptions; checks confirm no floating Messages button and working Messages links. Homepage browser checks passed at desktop/tablet/320px. Inspected desktop homepage and mobile Buyer dashboard. Formatting, targeted ESLint, TypeScript and production build passed. Full screen-reader/zoom compliance and real external email delivery remain unverified.

### Bag product cards and illustration hero reference - 2026-10-15

Replaced the homepage fallback samples with three real bag photographs and a three-column desktop listing-card layout inspired by the user's screenshot: square images, compact label strip, product titles, sample/reference prices, metadata and full-width Sign in to shop/View in shop actions. Actual approved seller products retain their real prices and store names and omit fictional reference prices. The card ribbon labels previews instead of inventing free delivery; unsupported ratings, sold counts and saving features were not introduced. Restored the existing purple marketplace phone/cart illustration in place of the mango hero spotlight. Bag source/license attribution is public in Photo credits and the asset credits file.

Validation: nine homepage visibility/HTTP tests passed. Formatting, ESLint, TypeScript and production build passed. Focused homepage browser checks passed at desktop/tablet/320px without horizontal overflow. Inspected the desktop homepage showing the requested illustration and bag card format; tightened title-to-price spacing after inspection. Full screen-reader/zoom compliance was not established.

### Smaller homepage hero illustration - 2026-10-15

Reduced the marketplace illustration height cap from 600px to 440px on desktop and from 360px to 260px on narrow phones, keeping its aspect ratio and existing hero grid. This brings the graphic closer to the text scale and reduces the desktop hero's height.

Validation: formatting, homepage ESLint, TypeScript, nine homepage tests and production build passed. Focused homepage browser reflow checks cover desktop/tablet/320px. Full screen-reader/zoom compliance was not established.

### White registration app name - 2026-10-15

Applied the white inverse app wordmark to sign-up/registration branding for every role, including the compact mobile brand link. A primary-purple backplate keeps the requested white lettering readable on the light registration panel; dark mode uses the darker accent surface. The shared registration panel dimensions remain stable across roles.

Validation: formatting, ESLint, TypeScript and production build passed; 34 registration tests and all 37 isolated authentication/home browser checks passed. Inspected the fresh desktop registration screenshot. Full screen-reader/zoom compliance was not established.

### Shared compact product card refinement - 2026-10-15

Refined the existing shared homepage/catalog/wishlist card rather than replacing pending work. Product photos are absolutely contained inside square frames with consistent padding; failed-image state follows the failed URL so another product image can render. Prices precede seller information, reserve original-price space consistently, wrap large values, and keep shopping actions aligned in the bottom row. Seller icons appear only with supplied seller information or explicitly labeled samples. Discount badges require valid actual pricing; samples retain no promotional discounts. Existing purple tokens, responsive grid, authentication, wishlist/cart requests, loading indicators, empty states and error messages are preserved.

Validation: targeted ESLint, TypeScript, formatting and production build passed. Homepage and wishlist feature tests passed: 15 tests, 136 assertions. Isolated homepage browser checks passed at 1440px, 768px and 320px without horizontal document overflow; inspected the desktop screenshot. Browser coverage in this batch does not establish authenticated card interactions, dark-theme rendering, arbitrary image/name combinations, keyboard/screen-reader behavior or zoom compliance. No WCAG certification is claimed.
### Product interaction verification and violet registration name - 2026-10-15

Restored the plain primary-purple LUBOSMART wordmark on desktop and mobile registration branding, per the latest reference. Shared product cards preserve product descriptions in an accessible details dialog. Private Buyer wishlist save/remove actions and existing cart actions are connected; sample listings do not invent discounts or shopping inventory.

Validation: production build, targeted ESLint and TypeScript passed. Full backend suite passed 920 tests with 3 existing skips; focused homepage/wishlist tests passed 15 tests and 136 assertions. All 37 authentication/home browser checks passed. Seven focused Buyer browser checks passed, including equal square image containers and card heights with mixed photo orientations, persisted wishlist save/remove, cart mutation, product details, mobile grid, failed-photo fallback, dark rendering and zero runtime errors. Full screen-reader and zoom compliance remain unverified.

### Interactive homepage discovery - 2026-10-15

Added a separate discovery component with 100 deterministic demo products using seven existing photographs, generated example prices/ratings/stock and five demo store names. A visible notice and quick-view description identify generated data and unavailable checkout; no database inventory, seller accounts or reviews were created. Published products retain their existing authentication and server mutation flows. Discovery supports local category/search filters, native search suggestions, saved-only filtering, incremental 12-item display, empty-state reset, and browser-persisted demo hearts/cart with a clear-cart action. Shared product cards now open quick view from image/title, show a red filled saved heart, and announce successful wishlist/cart updates. Added hero floating and observed card entry animations with reduced-motion support.

Validation: targeted application ESLint, TypeScript, formatting, browser-script syntax check, production build and 15 homepage/wishlist feature tests (136 assertions) passed. Isolated browser checks passed for 320/768/1440px homepage reflow plus 380px square image frames; category filtering, suggestions, pagination, saved-heart state, demo cart, reload persistence, quick-view Escape, empty reset and reduced motion were exercised with no runtime exceptions. Inspected mobile dark screenshot. Existing storefront areas retain their light surfaces while cards use dark tokens. Full screen-reader/zoom review and authenticated mutation feedback were not manually exercised in this batch; existing server wishlist tests passed. Demo data uses repeated photographic variants, not 100 unique product photos.
### Four homepage cards and shop sample catalog - 2026-10-15

Homepage now renders only four shared cards with no discovery banner/search/category/saved/cart-count panel or load-more control. The 100-entry sample catalog is rendered on the existing /shop page, separate from real seller listings and excluded from wishlist and server-filtered views. Its short sample disclosure preserves the distinction from purchasable inventory. Removed product quick-view dialogs and image/title triggers from the shared card; wishlist/cart interactions remain.

Validation: targeted ESLint, TypeScript, formatting, 15 homepage/wishlist feature tests (136 assertions) and production build passed. Updated isolated browser checks passed for four homepage cards, absent controls/quick view, /shop destination, sample pagination/filter/search, saved hearts/cart persistence, empty reset, square frames, responsive homepage reflow and reduced motion, with no runtime exceptions. Full screen-reader/zoom review and authenticated cart interaction were not exercised in this batch.
### Removed shop demo catalog - 2026-10-15

Removed the 100-product sample catalog and all demo cart/wishlist persistence, counters, generated reviews/stock/store data, filters and sample-section UI. Homepage retains four static fallback cards when published products are unavailable; real seller cards retain existing authentication and cart/wishlist mutations. No stored real inventory or orders were altered. Validation: application ESLint, TypeScript, formatting, production build and 15 homepage/wishlist tests passed. Browser checks cover homepage responsive reflow, four fallback cards and absence of shop sample/demo controls. No new full accessibility or authenticated checkout review was performed.
### Premium homepage preview imagery - 2026-10-15

Replaced four fallback card images with newly generated matching square studio-style handbag, lavender headphones, cream sneakers and coffee product shots. Updated names/categories to match; preserved real seller photos, pricing/authentication/cart behavior and four-card layout. Originals remain in the generated-image library and copies are hosted under public/images/products/samples. Source notes identify these as generated illustrative assets. Application ESLint, TypeScript, production build and eight homepage feature tests passed. Images were visually inspected; homepage browser reflow checks cover desktop/tablet/320px. Full accessibility and performance measurements were not performed.
### Seller invitation banner refresh - 2026-10-15

Refined the homepage seller invitation with a two-line headline, concise seller journey list, decorative store emblem and subtle circular backdrop. Grouped the arrow action and supporting copy, retained the purple palette and existing seller registration handler, and added reduced-motion-aware icon/arrow effects. Mobile stacks the content and hides the decorative emblem. Validation: targeted ESLint, TypeScript, formatting, eight homepage tests, production build and isolated desktop/tablet/320px homepage reflow checks passed. Desktop screenshot inspected; full screen-reader/zoom and real performance measurements remain unverified.
### White outlined app name - 2026-10-15

Updated the shared app wordmark to white letter fill with a black outline and no drop shadow, including inverse contexts, as explicitly requested. Preserved font, sizing and existing consumers. Targeted ESLint, TypeScript, production build and 8 homepage feature tests (89 assertions) passed. Browser visual verification of outline thickness on mobile and light/dark surfaces remains pending; automated checks do not establish WCAG compliance.

### Refined app name outline - 2026-10-15

Reduced the black wordmark stroke from 0.08em to 0.04em to emphasize white letter fill as in the user's reference. No shadow; existing font and sizing retained. Targeted ESLint, TypeScript, production build and 8 homepage tests (89 assertions) passed. Visual matching in browser, including mobile and light/dark surfaces, remains unverified.

### Solid black app name - 2026-10-15

User revised the wordmark preference to solid black without shadows. Removed the outline and set the shared wordmark fill to black, preserving typography and size. ESLint, TypeScript, production build and 8 homepage tests (89 assertions) passed. Browser visual review remains pending, including visibility on dark surfaces.
