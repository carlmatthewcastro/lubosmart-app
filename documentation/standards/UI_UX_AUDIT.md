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

Final PHP suite: **835 passed / 3 skipped / 5,662 assertions**. Targeted ESLint, TypeScript, Prettier, Pint and production browser/SSR builds passed. No WCAG compliance or full workbook acceptance PASS is claimed. See documentation/requirements/ACCOUNT_CREATION_FINAL_REPORT.md for all 150 individual case statuses, actual execution evidence and manual procedures. No deployment or customer email was performed.

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

### White footer wordmark - 2026-10-15

Restored white fill for the existing inverse wordmark used on the purple homepage footer after the user's screenshot correction. Default wordmarks remain black; both have no shadow or outline. ESLint, formatting, TypeScript, build and 8 homepage tests (89 assertions) passed. Browser visual verification remains pending.

### Theme-aware shared wordmark - 2026-10-15

Shared AppWordmark now uses black in light mode and white in dark mode through the existing .dark theme class. Applied centrally to app logo/header/sidebar, public header, authentication and onboarding consumers. Inverse footer remains white in both themes. The fixed light storefront surface and white printable waybill explicitly retain black lettering even in dark mode. Existing purple/orange logo image assets, typography, size and no-shadow styling are preserved. Targeted ESLint, formatting, TypeScript, production build and 12 homepage/dashboard tests (123 assertions) passed. Source consumers and surface colors reviewed; actual browser switching, mobile/zoom and full accessibility verification remain pending.

### Persisted public appearance and navbar controls - 2026-10-15

Added a shared accessible Sun/Moon button using the existing saved appearance hook to the homepage navbar, guest marketplace navbar and authentication/registration layout. Existing browser-local preference already survives real logout; no authentication storage changes were needed. Homepage now supports dark surfaces and theme-aware wordmarks; seller invitation retains its purple gradient and white text. Mobile homepage navigation wraps to fit 320px. Updated appearance settings copy to describe both modes and persistence. ESLint, formatting, TypeScript, production build and 17 homepage/dashboard/authentication tests (153 assertions) passed. Extended isolated browser checks passed guest full-navigation persistence and actual Rider dashboard logout followed by dark homepage/registration, white wordmark and 320px reflow, along with existing registration/auth checks and zero runtime exceptions. Final homepage browser rerun passed after preserving seller-banner colors. Inspected light/dark mobile screenshots. Full screen-reader, zoom and WCAG contrast audit remain pending. Changes remain local.

### Seller banner contrast isolation - 2026-10-15

Seller banner now owns dedicated fixed purple gradient variables, independent of dark homepage foreground/accent variables. Excluded its white action button from general dark filled-button and hover overrides; text stays deep purple on white/orange. ESLint, formatting, TypeScript, build, 8 homepage tests (89 assertions) and homepage browser theme/reflow checks passed, including computed dark gradient and button text color assertions. Full contrast certification remains pending.

### Remove registration review reminder - 2026-10-15

Removed the role-specific after-email-verification review reminder paragraph from the shared registration form at the user's request. ESLint, formatting, TypeScript, production build and 34 registration tests (223 assertions) passed. Browser visual review of this copy removal was not performed.

### Concise email verification copy - 2026-10-15

Removed the administrator approval sentence and Spam/Promotions/automatic-checking paragraph from the verification screen as requested. Retained the concise saved-account/inbox confirmation and existing code instructions and actions. ESLint, formatting, TypeScript, production build and 9 email verification tests (54 assertions) passed. Browser visual review of this copy-only change remains unperformed.

### Professional verification email presentation - 2026-10-15

Refined shared transactional email presentation with a serif LubosMart wordmark, purple top accent, left-aligned Arial heading and greeting, clear action instructions, centered lavender code panel and quieter security/footer copy. Explicit font families prevent email-client heading font substitutions; narrower mobile code spacing keeps all six digits together. Kept escaped dynamic content, code expiry, notification routes and plain-text alternative. 45 transactional-mail/registration-code tests passed (285 assertions). Generated storage/app/verification-email-preview.html with a sample recipient and code. TypeScript and production build passed. Gmail/Outlook and email-client dark-mode rendering remain unverified; web app theme does not control email-client theme.

### Professional application approval email - 2026-10-15

Added a compact Approved badge, clearer sign-in next step and left-aligned dashboard action. Shared action emails now explain the fallback URL instead of displaying an unexplained raw link. Role dashboard routes, plain-text content and delivery remain intact. PHP formatting and 28 transactional-mail/approval-delivery tests passed (183 assertions). Rendered storage/app/approval-email-preview.html using a sample recipient and a clearly illustrative .example URL. Email-client visual rendering remains unverified. Screenshot localhost link follows current app URL configuration; production URL configuration was not changed.

### Minimal branded email content - 2026-10-15

Removed visible fallback URL, fallback explanation, footer tagline and footer divider from shared HTML transactional emails as requested. LubosMart wordmark and purple accent remain at the top; action buttons retain destination URLs. Plain-text links remain usable. Updated existing route-link assertions for a single button link. PHP formatting and 28 mail/approval tests (183 assertions) passed. Email-client visual review remains pending.

### Concise code email security reminder - 2026-10-15

Removed the duplicate Keep this code private lead-in from shared code emails. Retained Never share this code and the unsolicited-request guidance, branding, code and expiry. Transactional mail tests passed. Email-client visual review remains pending.

### Blank registration mobile input - 2026-10-15

Removed the 9XXXXXXXXX placeholder from the shared registration mobile input as requested. Targeted ESLint, TypeScript, production build and four phone registration tests (22 assertions) passed. Browser visual verification remains pending.

### Logistics profile confirmation panel - 2026-10-15

Removed the email-code panel for password-based logistics accounts in Account Settings; current-password confirmation remains available. Google-only logistics accounts retain email confirmation so sensitive changes remain possible. Updated the password label accordingly. ESLint, TypeScript, production build and 18 profile tests (92 assertions) passed. Browser visual verification remains pending.

### Logistics password settings match admin - 2026-10-15

Logistics now shares the admin Current Password, New Password and Confirm New Password form and description. Server validation requires the current password before sending a code and before saving; email confirmation remains required. Expanded existing password feature coverage for logistics, including incorrect and missing current passwords. All 18 password tests (127 assertions) and Pint passed. Browser visual verification remains pending.

### API-based saved delivery addresses - 2026-10-15

My addresses now uses registration-options for cascading Region, Province/NCR, City/Municipality and Barangay choices. Parent changes clear child selections and postal suggestions; exact city postal suggestions remain editable. Requests are aborted on changes/unmount; loading, API failure and retry feedback are provided. Save requires all location selections. Existing addresses require selecting locations again on edit because saved addresses contain names rather than PSGC codes. AddressRequest reuses PhilippineLocations hierarchy validation and AccountRules phone normalization/name validation, requires four-digit postal codes, and stores resolved location names rather than submitted labels. Ownership, registration-address protection, default handling and existing order snapshots remain intact. ESLint, TypeScript, Pint, production build and 22 relevant tests (110 assertions) passed. Browser visual, keyboard and responsive checks remain pending.

### Edit registration addresses from settings - 2026-10-15

Per user request, every saved address now offers Edit address, including the address linked to registration. Removed the update restriction while retaining ownership validation, API hierarchy validation and deletion protection for linked registration addresses. The card explains that edits also update the application address. Existing order shipping snapshots remain unchanged. ESLint, TypeScript, Pint, production build and 16 address tests (82 assertions) passed. Browser visual verification remains pending.

### Simplified logistics profile options - 2026-10-15

Removed the Make it yours shortcut card, Email Verified badge and Delete account section from logistics profiles as requested. Avoided an empty badge container; a connected Google badge remains where applicable. Other roles retain their existing UI. ESLint, TypeScript, production build and 18 profile tests (92 assertions) passed. Browser visual verification remains pending.

### Remove logistics profile current-password input - 2026-10-15

Removed Current password from logistics Account Settings as requested. Email confirmation appears only when email, phone or bank account is edited, preserving sensitive-change validation. The separate Change Password page retains its existing current-password requirement. ESLint, TypeScript, production build and 18 profile tests (92 assertions) passed. Browser visual verification remains pending.

### Logistics registration details in Account Settings - 2026-10-15

Added an owner-scoped registration details section for logistics: first/last name, optional middle initial, sex, birthday/age, company name, SEC number, TIN, contact position, service region names, registered business address and required document submission statuses. Missing legacy values are marked Not provided. Registration details are read-only references; existing profile editing remains available and the address section links to address editing. Document storage paths and file contents are not exposed. Add/Edit address now has separate House / unit number and Street / subdivision fields using registration limits, required-together validation and composed line1 storage. Existing clients with line1 remain compatible. ESLint, TypeScript, Pint, production build and 38 profile/address tests (207 assertions) passed. Browser visual, keyboard and responsive verification remains pending.

### Logistics settings section navigation - 2026-10-15

Added logistics sidebar links for Contact details, Personal information, Business details and Submitted documents. Links target focusable sections on the profile page, reflect the selected hash with aria-current and preserve existing Password and Addresses navigation. Replaced the logistics My Profile heading with the signed-in user's name. ESLint, TypeScript, production build and 20 profile tests (120 assertions) passed. Browser visual, mobile and keyboard verification remains pending.

### Verified logistics account settings - 2026-10-15

Approved logistics profiles now render verified Account Settings at
`/settings/profile` and `/settings/account`, reusing Page, Card, Field, Select,
Button, Notice and Badge. Identity/company fields are read-only with lock icons.
Address/service proposals show current and proposed values, review status and
rejection reasons. TIN is masked until owner reveal. Private document URLs expire
in five minutes. Company changes require new documents and re-verification.
Street/subdivision and house/unit number each appear once.

SWR handles loading, errors/retry and refreshed data. The admin queue supports
comparisons, signed document links, approval, required rejection reasons and
pagination. Contact/security uses the existing email OTP and password workflows.
The imported PSGC/postal table validates addresses; no production dataset was
supplied, so import is required before address changes can be used.

Validation: 291 relevant Laravel tests passed, one existing skip; 37 focused
account tests passed after the final read-consistency change. ESLint, Prettier,
TypeScript, Pint and production build passed. Isolated Chrome checks passed for
320/768/1440 pixel reflow, cascading selects/postal fill, TIN reveal/hide,
CSRF-protected proposals, pending comparisons, keyboard focus, and admin approval.
Light/dark screenshots and results: storage/app/account-settings-ui-check/.
Screen-reader behavior, complete keyboard paths, 200%/400% zoom and comprehensive
contrast measurements remain unverified. This does not establish WCAG compliance.

See [setup and assumptions](../ACCOUNT_SETTINGS.md). OTP uses the registered email;
SMS ownership verification is not configured. Existing buyer/seller/rider settings
and unrelated local work remain intact.
### Remove notification preferences from logistics settings - 2026-10-15

Removed the Notification preferences form, Email/SMS checkboxes and Save
preferences button from Account Settings as requested. Contact/security fields
and the Change password link remain. Targeted ESLint, TypeScript, formatting,
37 account tests and production build were checked. No new controls or layout
patterns were introduced. Manual visual verification remains pending.
### Categorized logistics Account Settings - 2026-10-15

Replaced the long stacked settings page with a category menu and one visible
section at a time. Desktop uses a left menu, while small screens place categories
above the selected section. Six categories cover personal details, company
registration, registered address, service areas, submitted documents and contact
and security; Password and Delivery addresses links remain reachable. Hash links
support direct navigation and browser history, including the earlier profile
section anchors. Hidden sections retain drafts. The active link uses aria-current
and the existing lavender highlight. Only the latest review feedback for the
selected category appears. Notification preferences remain removed.

ESLint, TypeScript, Prettier, 37 account tests and production build passed.
Browser checks cover category switching, one active menu link, preserved address
drafts, 320/768/1440 reflow, address selects, owner TIN reveal and admin workflows.
Artifacts: storage/app/account-settings-ui-check/. Full screen-reader, zoom and
contrast verification remains pending; automated checks do not certify WCAG.
### Remove redundant logistics sidebar settings link - 2026-10-15

Removed Account Settings from the logistics workspace sidebar as requested.
Settings remains available through the existing user account menu. Targeted
ESLint, TypeScript, Prettier, 37 account tests and production build were checked.
Manual visual verification remains pending for this removal.
### Remove admin registration change-request link - 2026-10-16

Removed the Review account change requests link from the admin registration
review page and its unused Link import. Targeted ESLint, TypeScript and 35 admin
management tests passed. Manual browser verification remains pending.

Production build passed.

### Rider account layout - 2026-10-16

Removed the rider review header button and signup-link card as requested.
Company riders now follows the existing account page pattern with name/email
search, status filters, alphabetical sorting, a result count, initial avatars,
and responsive account cards. Existing permission-based rider actions remain.
Filtering applies locally to the complete server-provided company rider list.
Prettier, targeted ESLint, TypeScript and production build passed. Logistics
workspace and rider registration tests: 212 passed, 1 skipped.
Manual browser, dark theme, keyboard, zoom and screen-reader checks remain pending.


### Logistics dashboard and coverage refinement - 2026-10-16

Replaced the decorative truck welcome panel and five-step workflow guide with
a compact welcome, review queues, actual company metrics, workload bars and a
delivery progress ring. Charts label overlapping queues and the limited
active/delivered population; no time trends or financial figures are invented.
Removed the welcome action arrow and management shortcut arrows. Fixed rider
sort labels using plain ASCII text to avoid the broken dash encoding.
Shipping rates now has a compact add action, inline publication counts, local
coverage search/status filters, an actionable empty state and a concise pricing
guide. Existing rate editor, publication confirmation and request behavior remain.

Validation: Prettier, targeted ESLint, TypeScript, production build and 20
logistics tests (163 assertions) passed. Isolated browser fixtures verified
desktop/tablet/landscape/320px dashboard reflow, dark theme, workflow navigation,
shipping empty state and editor opening, Escape and focus restoration.
Reviewed dashboard and shipping desktop/mobile screenshots. Artifacts:
storage/app/logistics-layout-ui-check/. No browser runtime or console errors.
The broader workspace visit logged an existing HTTP 403 for /api/account/settings;
account settings was not changed. Populated shipping filter interactions, full
screen-reader, contrast and zoom verification remain pending.


### Rider account details and access cards - 2026-10-16

Company rider cards now match the account card reference: registration date,
actual application status, View details and Manage access for eligible riders.
The existing account detail and access dialogs use their authorized endpoints.
Pending application review and legacy activation actions remain available.
The rider payload adds only registration date, verified date and application
status to the existing company-scoped list. Access components accept only the
identity/status fields they use. InfoModal now uses DialogTrigger to restore
keyboard focus to the details button after closing.

Validation: PHP syntax, Prettier, targeted ESLint, TypeScript and production
build passed. Logistics workspace/rider registration tests: 212 passed, 1 skipped
(1322 assertions), including the rider card data contract.
Isolated browser fixtures verified approved rider details and access dialogs,
Escape, trigger focus restoration, 320px reflow and dark theme; desktop screenshot
reviewed. Artifacts: storage/app/rider-cards-ui-check/. No runtime or console
errors. The broader workspace visit still logs the unrelated account-settings
HTTP 403 previously recorded. Full screen-reader/contrast/zoom checks remain pending.


### Remove parcel coverage footer link - 2026-10-16

Removed Need more coverage? Manage Shipping Rates from the shared logistics
parcel page, covering all parcel operation stages. Removed the unused Link
import. Targeted ESLint, TypeScript, production build and 20 logistics tests
(184 assertions) passed. Manual browser verification is pending for this removal.


### Dedicated rider coverage workspace - 2026-10-16

Added /logistics/rider-coverage under Riders & Coverage in the sidebar between
Rider Management and Shipping Rates. Removed the repeated parcel header action
and coverage modal. The dashboard coverage shortcut opens the new page. Reused
the existing barangay assignment form/save endpoint; added a paginated assignment
list scoped to approved email-verified company riders and their own operational
centers. Existing delivery assignment rules and rate publishing remain unchanged.

Validation: PHP syntax, Prettier, targeted ESLint, TypeScript and production build
checked. Three new page access/isolation/empty-state tests and the existing
coverage-save authorization/validation test pass (48 assertions). Broader test
run: 44 passed, 3 failed. Failures are in untouched receipt-condition expectations
and profile re-verification flows: LogisticsWorkspaceTest line 196 submits no
required receipt_condition; LogisticsApprovalChainTest lines 92 and 108 expect
profile change redirects but receive 403. These were left for their workflow work.
Browser checks passed for sidebar active state, form rendering, parcel action
removal, desktop/320px/dark theme and broader workflow navigation. Desktop
screenshot reviewed; artifacts: storage/app/rider-coverage-ui-check/. The existing
account-settings fixture request still returns HTTP 403. Full screen-reader, zoom
and contrast checks and submitting the form on the new page in-browser remain
pending; endpoint save behavior is covered by the existing test.


### Logistics scanning, dispatch, exceptions and cash evidence - 2026-10-16

Implemented parcel tracking lookup, printable Code 39 labels, camera/scanner/manual
capture, receipt condition, destination sorting/bin, separate rider dispatch
acceptance, failed-attempt/retry/return-to-center actions and amount-checked COD
handover with discrepancy history. Existing role gates and shared components are
retained. Concurrent rider coverage page/sidebar changes were preserved.

Validation: 316 relevant PHP tests passed, 1 existing password-masking test
skipped (2320 assertions). Targeted ESLint, TypeScript, Prettier, Pint and production
build passed. Nine isolated browser checks passed: receipt and sorting submissions,
320px dark-theme reflow, unsupported and denied camera fallback, simulated camera
capture and ignored URL payloads, camera track cleanup, offline not-submitted
feedback, unknown tracking and audited waybill printing. Desktop, dark mobile and
waybill screenshots were inspected. Artifacts: storage/app/logistics-operations-ui-check/.
No runtime or console errors were observed. The earlier receipt-condition fixture
failure is resolved in this batch. This subset does not certify the unrelated
profile/account-settings tests reported by the previous entry.

Real printed barcode/phone/scanner acceptance, actual camera hardware, simultaneous
MySQL requests, interrupted in-flight submissions, screen-reader/contrast and
200%/400% zoom verification remain pending. Full scope and policy-dependent gaps:
[Logistics implementation and acceptance](LOGISTICS_IMPLEMENTATION_ACCEPTANCE.md).

### Minimal seller invitation - 2026-10-16

Simplified the public homepage seller section: solid semantic purple surface,
compact spacing and heading, shorter copy, and no decorative rings or store
emblem. The existing seller registration action is preserved.

Validation: targeted ESLint, TypeScript, Prettier and production build passed;
HomepageProductsTest passed (8 tests, 89 assertions). Browser visual inspection,
mobile/zoom, keyboard and screen-reader verification remain pending for this batch.

### Dedicated Logistics Scan Parcel workspace - 2026-10-16

Moved Logistics camera and tracking capture to /logistics/scan, linked as Scan
Parcel under Operations in the sidebar. The dedicated page keeps lookup, manual
entry reason, parcel details and receipt/sorting/dispatch confirmations together.
Parcel queues retain ordinary search and review; they link to Scan Parcel for
physical scan operations. Courier scanning and server authorization are retained.
An empty scanner exposes no parcel list, and exact-reference lookup stays scoped
to the operator's operational centers. Editing the reference hides the previous
parcel's action panel until the new lookup matches.

Validation: 61 relevant Logistics/marketplace tests passed (784 assertions).
Targeted ESLint, TypeScript, Prettier, Pint and production build passed. Isolated
browser checks cover sidebar active state, queue camera removal, manual reason
persistence in history, receipt/sorting submissions on the scanner, mobile dark
reflow, camera capture/fallbacks, offline feedback, unknown reference and waybill
printing. Desktop/light and 320px/dark screenshots were inspected. Artifacts:
storage/app/logistics-operations-ui-check/. Physical hardware, screen readers,
full contrast and zoom verification remain pending. No deployment was performed.

### Seller invitation styling restored - 2026-10-16

Supersedes the minimal seller invitation above at the user's request. Restored
original gradient, decorative rings, spacing, typography and copy; only the store
emblem is removed. Seller registration behavior is preserved. ESLint, TypeScript,
Prettier, production build and 8 homepage tests passed (89 assertions).
Browser visual and accessibility verification remain pending.

### Logistics notifications styled like Admin - 2026-10-16

Replaced the plain Logistics bell-menu links with the Admin notification pattern:
Notifications header, descriptive icon rows, actual count badges and a bell badge.
Counts are refreshed on opening and every 30 seconds while the page is visible.
The authenticated /logistics/notifications endpoint returns only five queue counts
for the operator's accessible operational centers, with private/no-store caching.
Dashboard and toolbar share the queue-count definitions. The bell total includes
review/handling tasks; ongoing deliveries are shown separately to avoid counting
the same in-transit parcel twice in the attention total. Loading, refresh-error,
retry and zero-pending states are explicit; unknown counts show a dash.

Validation: 63 relevant Logistics/marketplace tests passed (797 assertions),
including endpoint authorization, center isolation, queue transitions and empty
centers. Targeted ESLint, TypeScript, Prettier, Pint and production build checked.
Twelve isolated browser checks passed, including notification count/icon rows,
320px dark menu width and Escape focus restoration. Desktop/light and 320px/dark
notification screenshots were inspected. Artifacts:
storage/app/logistics-operations-ui-check/logistics-notifications-desktop.png
and logistics-notifications-dark-320.png. Full screen-reader, contrast and zoom
verification remains pending. Existing in-progress search-form changes were
preserved. No deployment was performed.

### Dashboard inline form validation - 2026-10-16

Forms across buyer, seller, rider, Logistics and Admin workspaces, including
shared dialogs, support and account settings, now use ValidatedForm. Native
required/type/range constraints show registration-style inline icon feedback.
Invalid submissions focus the first invalid control; correcting a control clears
its local message. Server validation and existing submit handlers remain in place.
Shared fields reserve server feedback space; InputError uses compact icon feedback.

Targeted ESLint, TypeScript, Prettier and production build passed. Dashboard,
AdminManagement, MarketplaceFlow and LogisticsWorkspace: 98 Laravel tests passed
(1,280 assertions). Isolated Admin browser checks passed mobile/tablet/desktop,
dark theme and inline validation/focus/correction checks with no runtime errors.
The 320px inline validation screenshot was visually inspected.
The broader browser run passed buyer/seller/rider checks but stopped at the
Logistics account menu: /api/account/settings returned 403 and the expected menu
control was absent. Full all-role form, screen-reader, contrast and zoom checks
remain pending; automated checks do not establish WCAG compliance.

### Move parcel queue navigation and search to Logistics Dashboard - 2026-10-16

Moved the eight parcel queue shortcuts and tracking/store search panel from parcel
results pages to the dashboard, directly after the welcome section. Queue links
use the existing stage routes and carry entered search text. Search opens all
matching parcels. Results retain their cards, actions and pagination, show the
search term when present, and link back to the dashboard for another search.
The separate Scan Parcel page and sidebar navigation remain available.

Validation: 63 relevant Logistics/marketplace tests passed (797 assertions),
14 isolated browser checks passed, and targeted ESLint, TypeScript, Prettier and
production build passed. Browser checks exercise dashboard queue navigation,
search preservation and all-parcel search results, confirm the repeated panel is
removed from results pages, and verify 320px dark-theme reflow. Desktop/light and
mobile/dark dashboard screenshots were inspected. Artifacts:
storage/app/logistics-operations-ui-check/dashboard-parcel-navigation-desktop.png
and dashboard-parcel-navigation-dark-320.png. Full screen-reader, contrast and
zoom verification remains pending. No deployment was performed.

### Scan workspace reset action - 2026-10-16

Styled Clear / next parcel with the shared outline Button and reset icon, retaining
its existing Inertia navigation to /logistics/scan. The action now has the shared
44px minimum height, visible border, hover and keyboard focus treatment.
Browser visual, keyboard, dark theme and zoom verification remain pending.
Validation: targeted ESLint, Prettier, TypeScript and production build passed;
LogisticsWorkspaceTest passed (40 tests, 466 assertions).

### Parcel queue search action - 2026-10-16

Replaced the wide Dashboard / parcel search text action with a compact shared
outline search icon button aligned to the right. Retains /dashboard navigation;
the link has an accessible name and native Search parcels title. Shared icon
sizing provides a 44px target with keyboard focus, hover and theme tokens.
Browser visual, keyboard and screen-reader verification remain pending.
Validation: ESLint, Prettier, TypeScript and production build passed;
LogisticsWorkspaceTest passed (40 tests, 466 assertions).

### Remove Scan Parcel clear link - 2026-10-16

Removed the Clear / next parcel control from Scan Parcel and its unused Button,
Link and RotateCcw imports. Operators can still enter or scan another reference.
Targeted ESLint, TypeScript and Prettier passed; 44 Logistics tests passed
(533 assertions). Production build checked separately. Manual browser review of
this small removal remains pending.

### Seller panel illustration and compact button - 2026-10-16

Added the existing transparent auth-marketplace-3d.webp illustration to the public
homepage seller panel, using the shared asset map. The smaller Become a seller
button sits below the illustration, retains a minimum 44px touch target and opens
the existing seller registration flow. Desktop keeps the image/button to the
right of the copy; mobile stacks them below the copy. The below-fold image has
explicit dimensions, lazy loading and async decoding. No image dependency added.

Validation: 8 homepage tests passed (89 assertions). Targeted ESLint, TypeScript,
Prettier and production build passed. Five isolated homepage browser checks passed,
including illustration loading, button position/size at 1440/768/320px, no page
overflow, theme persistence and seller registration navigation. Desktop and 320px
seller-panel screenshots were inspected. Artifacts:
storage/app/home-typography-ui-check/seller-panel-1440.png and seller-panel-320.png.
Full screen-reader/contrast/zoom checks remain pending. No deployment performed.

### Organize parcel scanning workspace - 2026-10-16

Grouped tracking lookup and entry method in a responsive main column, with a
separate camera panel and a clearly separated handover reminder. Added a scan
section heading and replaced the oversized empty state with a compact parcel
prompt. Retained lookup routes, manual evidence, camera behavior and parcel actions.

Validation: targeted ESLint, TypeScript, Prettier and production build passed;
LogisticsWorkspaceTest passed (40 tests, 466 assertions). All 14 existing isolated
logistics browser checks passed, including 320px dark reflow, manual evidence,
camera fallback/denial/capture, offline handling and unknown tracking. Inspected
the desktop scan screenshot at storage/app/logistics-operations-ui-check/sorting-desktop.png.
Full screen-reader, keyboard, contrast and zoom verification remains pending.

### Seller panel decorative shopping elements - 2026-10-16

Added dimensional parcel, shopping bag and location accents, sparkles and an
orbital outline around the existing seller illustration. Decorations are hidden
from assistive technology and contained within the responsive illustration area.
Gentle floating animation finishes within five seconds and only runs when the
visitor has no reduced-motion preference. Existing seller registration is retained.
Validation: targeted ESLint, TypeScript, Prettier and production build passed;
8 homepage tests passed (89 assertions). Browser visual review at mobile/desktop,
light/dark themes, zoom and assistive technology checks remain pending.

### Seller panel reference layout - 2026-10-16

Moved the seller CTA below the copy on the left and enlarged the illustration
on the right with decorative stacked parcels. Retained existing purple panel,
text colors and font rules; applied the requested blue pill button with a darker
hover state. Existing mobile stacking and reduced-motion behavior are retained.
Validation: ESLint, TypeScript, Prettier, production build and 8 homepage tests
(89 assertions) passed. Browser visual, theme, zoom and keyboard review pending.

### Compact seller panel and yellow CTA - 2026-10-16

Reduced seller panel padding and illustration height to remove excess vertical
space. Changed the CTA to the existing warm yellow accent with deep purple text,
including explicit dark-theme states. Fonts, purple background and reduced-motion
aware floating animations remain intact. ESLint, TypeScript, Prettier, production
build and 8 homepage tests (89 assertions) passed. Manual browser visual, zoom
and keyboard verification remains pending.

### Seller location decoration overlap fix - 2026-10-16

Positioned the location charm above the parcel stack using the same bottom anchor
plus the stack height and 24px clearance. This keeps the icon clear of the boxes,
including its existing 10px floating movement. Colors, fonts and motion retained.
Prettier, ESLint, TypeScript, production build and 8 homepage tests (89 assertions)
passed. Manual browser visual verification remains pending.

## 2026-10-18 ó Rider and Logistics naming

Standardized active application role identifiers to `rider` and `logistics`, including registration, policies, middleware, dashboard navigation, notifications, fixtures and tests. Renamed the Rider dashboard directory and the LogisticsCenter model; database tables now use logistics_centers/logistics_center_user and the affiliation key uses logistics_center_id. Current role guides use the same names. Historical migrations and audit evidence retain their original terminology; legacy dashboard redirects and migration compatibility tests intentionally reference old values.

Added and applied a forward migration to the local MySQL database after creating a private SQL backup under storage/app/private. It preserves role/account IDs, affiliations and saved draft selections. The first application attempt stopped MySQL during an unscoped metadata query that reached a corrupt phpMyAdmin table; the query now scopes to this application's database, MySQL restarted, and the retry succeeded. Local verification found no legacy account/application roles or orphaned user affiliations; foreign key checks remain enabled.

Validation: TypeScript, ESLint across resources and frontend scripts, targeted Prettier, PHP Pint, and production build passed. Registration/historical migration/terminology tests: 37 passed. Marketplace, terminology and approval-chain retest: 43 passed, 2 failed. The two remaining Logistics profile-edit tests expect mutation through the legacy /settings/profile endpoint; the existing working-tree authorization rule denies Logistics edits there in favor of the account-settings boundary. That rule was preserved. The initial full suite recorded 993 passed, 3 skipped and 5 failures; the three rename-related failures were corrected and their targeted tests pass. No complete green-suite claim is made. Browser visuals, keyboard, screen reader and zoom checks were not performed for this terminology-only batch. No deployment or Git commit/push occurred.

## 2026-10-18 ó Rider dashboard and local sample seeder

Applied the Logistics visual shell to Rider: grouped delivery/cash/workspace navigation, matching collapsed sidebar width, shared search/notification/account toolbar, welcome/priorities panel, actionable queue metrics, shared parcel charts, scoped recent parcels, COD handover total and delivery checklist. Delivery queue navigation is present on both the dashboard and parcel list; filtered empty states distinguish no matches from no assignments. Charts explicitly describe the Rider's active-parcel population.

RiderWorkspace scopes all dashboard, queue and COD figures to the signed-in Rider. Added a protected, no-store Rider notifications endpoint. Rider queue filters now apply to pickup, prepared dispatch, out-for-delivery, issues, pending COD and completed parcel lists. Existing proof, tracking-capture, dispatch acceptance, failed-attempt and cash-receipt authorization rules are preserved; company review, sorting, rates, rider assignment and cash receipt remain unavailable to Riders.

Added optional local/testing-only RiderDemoSeeder and documentation/RIDER_DEMO.md. Applied it to the local database: creates a dedicated DEMO company/Rider with five tagged parcels and privately saved generated login credentials. Verified the saved password hash and account operational access. Repeated seeding preserves passwords and parcel progress, and creates no completed delivery, proof or COD collection. Real customer accounts are not used for the samples.

Validation: 93 relevant feature tests passed with 1,115 assertions (Rider workspace, dashboard roles, Marketplace flow and Logistics suites), including cross-Rider isolation, rejected management access, dispatch handover, proof/COD completion, Logistics cash receipt, failed attempts, empty data and repeatable/production-refused seeding. TypeScript, targeted ESLint/Prettier, PHP Pint and production build passed. Headless Rider browser checks passed for search, six filtered queues, notifications, account menu, inline validation and zero runtime/console errors; responsive checks covered 1440px desktop, 768px tablet, 844px landscape and 320px mobile, light/dark themes, mobile menu Escape/Close and document overflow. Screenshots reviewed in storage/app/dashboard-ui-check. Screen reader, actual 200%/400% browser zoom and physical touch testing remain unverified. This batch does not establish complete WCAG compliance. No deployment or Git commit/push occurred.

## 2026-10-18 ó Rider settings categories

Added a Rider-specific settings page at the existing /settings/profile route, matching the Logistics category layout. Categories cover personal details, vehicle/Logistics affiliation, registered address, submitted-document status and contact/security, with links to the existing password and address workflows. Rider registration fields remain read-only; existing display-name/contact edits, plate/bank re-review and photo-ID replacement continue through the existing Rider profile endpoint. Each save submits only its category's changes. Email confirmation/current-password behavior and existing account deletion controls remain available. Password/address pages expose the same Rider category navigation.

Document metadata is restricted to the Rider's own application. The page displays submission status without issuing document URLs, preserving the existing reviewer-only document authorization. The Logistics change-request API and management permissions were not extended to Riders.

Validation: 71 Settings/Rider feature tests passed (562 assertions), including own-registration isolation, document access refusal, protected role/affiliation, name saves and plate-change re-review. Focused new tests passed again after fixing their date for deterministic age assertions. TypeScript, targeted ESLint/Prettier, PHP Pint and production build passed. Headless browser checks exercised category navigation and an actual display-name save; desktop and 320px mobile/light/dark screenshots are under storage/app/dashboard-ui-check/rider-settings-*.png. Existing Rider dashboard/mobile/notification/password-validation browser checks still pass with no runtime/console errors. Screen reader, physical touch and true 200%/400% zoom remain unverified; automated checks do not certify WCAG conformance. No deployment, commit or push occurred.

## 2026-10-18 ó Rider queue tabs on dashboard only

Removed the duplicate Rider queue-tab row from the deliveries page. The existing row remains on the Rider dashboard and continues opening the same filtered delivery URLs. Sidebar navigation and delivery actions remain intact. Targeted ESLint, TypeScript and production build were run; six Rider workspace feature tests passed (150 assertions). No new browser visual review was performed for this removal.

## 2026-10-18 ó Rider change-password form

Applied the supplied three-field password form to Riders using the shared password page: Current Password, New Password and Confirm New Password, with the full-width Change Password action and current-password/email-code explanation. Rider current-password confirmation is now validated by the existing PasswordUpdateRequest at both code-request and final-save boundaries, matching Admin/Logistics. Email confirmation, session invalidation and Google-only handling remain in place. Associated current-password errors with their input.

Expanded the existing password security tests to Riders: incorrect/missing current passwords cannot request a code, and a correct current password still cannot bypass email verification. All 21 password tests passed (146 assertions). Targeted ESLint, TypeScript, Prettier/Pint and the production build were run for this batch. Screen reader and actual browser zoom remain unverified.

Rider headless browser verification also passed after the password change: settings category/save flow, desktop/mobile/dark reflow, password inline required-field feedback and zero runtime/console errors.

## 2026-10-18 ó Personal information presentation for Logistics and Rider

Replaced separate first-name/last-name/middle-initial rows with a shared, prominent Full name summary in both settings pages. Middle initials are retained in the full name when supplied. Date of birth displays a readable month/day/year, sex values use consistent capitalization, and age includes units. A single read-only registration note replaces repeated lock icons. Existing registration values, approval badges, correction workflows and permissions are unchanged; missing data stays explicit rather than substituting an account nickname.

Validation: 40 relevant Rider/Logistics Account feature tests passed (168 assertions), plus TypeScript, targeted ESLint/Prettier and production build. Logistics account and Rider headless browser workflows passed, including settings categories, save behavior, responsive reflow and existing authorization/security interactions. Added personal-details desktop/mobile screenshots to the Logistics account browser harness. No screen-reader or true 200%/400% zoom verification was performed; this is not a WCAG certification. No deployment or Git commit/push occurred.

## 2026-10-22 - ZXing scanning and free barcode generation

Added a lazy ZXing browser decoder fallback shared by Logistics and Rider, accepting existing Code 39 and new Code 128 labels. JsBarcode generates free Code 128 waybill SVGs with white quiet margins, black bars, readable text and proportional scaling. Manual/scanner input, explicit operational confirmation and scoped lookup remain in place. Capture stops tracks and clears the video source.

Validation: 70 PHP tests passed (959 assertions), TypeScript, targeted ESLint, Prettier and production build passed. Browser checks exercise actual ZXing decoding of JsBarcode pixels for both formats, plus existing camera fallback/denial, capture cleanup, URL rejection, receipt/sorting, offline feedback, label printing and 320px dark reflow. The waybill screenshot was inspected. Physical camera/printer/scanner, full contrast, screen readers and actual 200%/400% zoom remain unverified. See [parcel scanning](../PARCEL_SCANNING.md). No deployment was performed.
## 2026-10-22 - Seller operational workspace

Applied the existing Rider/Logistics operational dashboard, toolbar, charts and sidebar patterns to Seller. Added store-scoped preparation/delivery queues, product and order searches, live task counts, low-stock and missing-weight filters, and query-preserving pagination. Existing inventory saves, ordered preparation transitions, barcode waybill requests, order conversations, proof access, support and reports retain their authorization and business rules. Product forms show upload progress and packed-weight guidance.

Extracted the Rider settings presentation into a shared operational profile used by Rider and Seller. Seller categories show personal registration details, store/bank settings, registered address, document submission status, and contact/security. Documents remain private; store/bank and identity changes follow existing confirmation and admin review rules. No Seller pickup, dispatch or COD collection permissions were added.

Validation: 299 relevant PHP tests passed (2 skipped, 2482 assertions). TypeScript, targeted ESLint, Prettier, PHP Pint and production build passed. Seven Seller headless browser scenarios passed: dashboard, live tasks, search/preparation, stock and weight saves, audited barcode printing, reports/messages/profile save, and light/dark reflow at 320/768/1280px. Desktop dashboard and 320px dark order screenshots were visually reviewed. Browser artifacts are in storage/app/seller-workspace-ui-check. Full screen-reader, physical touch, printer/scanner, comprehensive contrast, and actual 200%/400% browser zoom remain unverified; automated checks do not establish WCAG compliance. No deployment, commit or push was performed.

Additional regression: the existing dashboard browser harness passed 14 Rider/Seller checks, including Rider queue/search/settings saves, Seller dashboard data, tablet/landscape and 320px navigation, Escape/Close handling, account menus, dark themes, inline validation and no runtime errors. The first attempt timed out while starting Chrome; the unchanged retry started successfully and completed all checks.

## 2026-10-25 - Seller and buyer completion, variants, vouchers and ratings

Connected the dedicated buyer dashboard to its route, added purchase-specific links and buyer shortcuts, and enabled scoped buyer search and order queues. Buyer and seller lists refresh every 30 seconds. Corrected out-for-delivery progress and seller-ready terminology; handover details display recorded pickup, receipt, sorting, dispatch acceptance and delivery timestamps without inventing events. The first saved checkout address is selected automatically.

Added seller-managed size/color combinations with independent stock and retirement, separate variant cart/order lines, checkout snapshots and exact cancellation restoration. All options share product price and packed weight. Added fixed peso store vouchers with minimums, expiry, total capacity and per-buyer restrictions; discount previews and checkout recalculate on the server, snapshot the code/amount and keep shipping separate. Commission uses product sales after the seller-funded discount.

Added public product details and verified-purchase reviews, restricted to owned delivered items. Buyers can edit one review per order item; authorized admins can hide/restore reviews with an audited reason. Moderated reviews stay hidden after buyer edits and are excluded from public counts/averages. Existing approval, logistics custody and COD boundaries remain intact.

Full-suite verification: 1041 passed, 3 skipped, 2 failed (7815 assertions). Remaining failures are historical Logistics settings tests expecting writes through the deliberately blocked legacy /settings/profile endpoint. Dedicated buyer/seller dashboard assertions were corrected. A new supported /api/account/reverification journey verifies linked Rider blocking and restored access through the same center after approval. New feature tests cover store/buyer isolation, stock, cancellation, voucher limits, discounts, verified ratings and moderation. The five-role delivery/COD journey also passes with a variant and voucher.

TypeScript, targeted ESLint/Prettier, PHP Pint and production build pass. Twelve disposable-database browser scenarios cover Seller preparation, inventory and variant saves, voucher creation, labels and settings; Buyer search/queues, public reviews, two-option checkout, first-address selection, voucher totals; Admin moderation; and 320/768/1280px light/dark reflow. Screenshot review caught and corrected a narrow-column mobile cart issue that overflow checks missed. Artifacts: storage/app/seller-workspace-ui-check.

Started local XAMPP MySQL on localhost, verified a private application SQL backup, and successfully applied only the new marketplace migration. Read-only Buyer/Seller dashboard and order queries pass on MySQL; foreign key checks remain enabled. No deployment, commit or push occurred. Screen reader, physical touch/printer/scanner, comprehensive contrast and actual 200%/400% browser zoom remain unverified. See [seller/buyer completion and role connections](../SELLER_BUYER_COMPLETION.md) for the workflow and remaining payout/refund/ledger limits.

## 2026-10-26 - System checklist, manual settlements, Logistics Rider pay and returns

Added documentation/SYSTEM_FEATURE_CHECKLIST.md with 111 Admin/Seller/Buyer/Logistics/Rider/shared feature items, local implementation states and external acceptance limits. Applied the owner's decisions: Logistics handles all Rider management/compensation; Admin records seller payments after full COD reconciliation and controls return/refund decisions. No automatic bank transfer/provider integration was introduced.

Added role-scoped settlement, Rider fee/payment, return/refund and Seller cost/profit pages using existing Page/Card/form/feedback components. Sidebar and completed-order links expose the correct role workflows. Seller CSV export remains separate from the Admin-only export endpoint and is store/date scoped. Reports retain historical sales and separately show refunds, commission reversals, Seller deductions and actual payouts.

Return flow: owned delivered parcel request, Admin decision, original-provider Logistics assignment with current Rider/company/service-area eligibility, scanned Rider collection, scanned Seller receipt with condition and explicit restock, then bounded manual refund/reference after COD reconciliation. Received zero-COD/no-refund cases can be closed by Admin with a reason. Return history preserves actors/actions/notes. Incorrect labels, role/company/ownership violations and repeated effects are rejected. Manual financial records retain references and cannot be silently repeated; payout audit failure rolls back. Earlier seller refund debt reserves the store's later payout balance.

Cancellation and return restoration share a locked inventory service. Original purchases restored after size/color options were introduced go into an inactive unallocated-stock bucket until Seller inspection/allocation; no size/color is invented. Held stock cannot be published and does not inflate active option availability. Cost mistakes are voided with reasons; profit and unpaid/owed balances remain distinct from actual bank transfers.

Validation: latest full suite 1057 passed, 3 skipped, 2 failed (8122 assertions). Remaining failures are the previously documented legacy Logistics /settings/profile mutation expectations; supported company re-verification remains separately covered. Subsequent focused ledger/return suite: 17 passed, 313 assertions. TypeScript, targeted ESLint/Prettier, PHP Pint and production build passed. The disposable SQLite browser harness passes 13 scenarios, including actual forms across all five roles for seller payout, Logistics fee/payment, Buyer return, approval/assignment, Rider collection, Seller receipt/cost, refund and Seller debt display. Mobile finance screenshots were visually reviewed under storage/app/seller-workspace-ui-check. Automated checks do not certify WCAG compliance; screen-reader, true 200%/400% zoom, comprehensive contrast and physical device/return acceptance remain outstanding.

Restarted the stopped local XAMPP MySQL service, verified a fresh private SQL backup, and applied only the new ledger migration. Read-only page-query checks passed on local MySQL for Admin, Seller, Buyer, Logistics and Rider; foreign key checks remain enabled. No sample payments/refunds were created in the configured database. No deployment, commit, push or financial transfer occurred. See documentation/FINANCE_AND_RETURNS.md for calculations and limits.

## Four-role workspace acceptance - 2026-10-26

Buyer, Seller, Logistics and Rider now share settings category/navigation and page-frame components; Admin keeps its existing visual output. Consequential actions use Radix dialogs and ordinary persisted actions use dismissible toast feedback with inline validation retained. Decorative action arrows are removed from the four-role and onboarding/public action surfaces; Admin and essential disclosure icons remain.

GET /workspace/status is verified/active/role protected and returns scoped counts and opaque revisions. Active polling uses four seconds to leave network/render time within the local 2-5 second target, pauses hidden/offline, backs off on errors and respects Retry-After. Changed page props refresh without replacing drafts or filters. Status polling uses a separate limiter bucket after browser verification exposed interference with voucher actions. Buyer/Seller message activity is excluded from Rider/Logistics indicators. History-restored flashes are remembered to avoid replay; successful new mutations can repeat the same message.

Cart quantities persist without reserving inventory. Checkout deducts stock transactionally and validates the reviewed item subtotal as well as stock, variants, vouchers and shipping. Cart shipping quotes invalidate when packed weights, addresses or rate revisions change. Waybill requests keep stable identity and require review; print media excludes confirmation dialogs, overlays and toasts. A PDF sample is available under storage/app/seller-workspace-ui-check/seller-waybill-print.pdf. This verifies a browser print request/PDF, not actual printer completion.

Final verification: full suite 1067 passed, 3 skipped, 2 failed (8206 assertions). Only the existing LogisticsApprovalChainTest expectations for blocked Logistics /settings/profile mutations fail; supported company re-verification is independently covered. A temporary proof-file assertion failure during overlapping PHP suites disappeared when the complete suite ran without another PHP test suite. TypeScript, targeted ESLint/Prettier, PHP Pint and production build pass. Browser harnesses pass 38 scenarios (14 marketplace/finance/returns, 16 logistics/scanning/waybill, 8 account/settings/Admin review). Separate authenticated Seller HTTP messages appeared in an open Buyer page in 4578 ms, retaining the Buyer draft. Escape cancellation and trigger focus restoration, confirmation layouts, barcode/PDF and print-media feedback hiding pass. The local login returns HTTP 200.

Screenshots reviewed: Buyer mobile cart/checkout confirmation, Seller desktop preparation confirmation and Logistics mobile company settings. Light/dark reflow is checked at 320, 768 and 1280/1440 widths in the harnesses. This is not WCAG certification. Physical printer/label sizing, real camera/scanner/touch devices, real email, fresh user-created account approvals, concurrent MySQL/load, screen-reader, true zoom and full contrast acceptance remain pending. Configured MySQL data/accounts/restrictions/payments were not reset or bypassed. No deployment, commit, push or financial transfer occurred. See documentation/WORKSPACE_ACCEPTANCE.md for the connected role journey and fresh-account checklist.

## Admin registration approval notifications - 2026-10-26

Confirmed mandatory Admin approval after email verification for Buyer, Seller and Logistics; Rider approval stays with Logistics. Added individual recent-application alerts (role and applicant/store/company label), direct review links and per-role counts to the existing Admin notification menu. Pending menu/badge/list updates use five seconds while visible/online; list refresh pauses for a review dialog. The notification limiter has its own bucket. Unverified applications are visible with an explicit label, but the review form cannot approve them; server authorization/validation remains authoritative. Approved/rejected applications and Rider requests are excluded from the Admin pending feed.

Validation: 415 related feature tests pass, 3 existing manual/environment cases skipped; the account/settings browser harness passes 9 scenarios including the three role alerts, 320px dark-theme menu and opening the correct Seller review. The menu screenshot was visually reviewed. TypeScript, targeted ESLint/Prettier, Pint and production build pass; read-only Admin workspace queries pass on local MySQL. No new email channel or background worker dependency was added. This does not certify full accessibility or update the live website. No real accounts were approved/altered, and no push/merge/deployment occurred. See documentation/ADMIN_APPROVAL_NOTIFICATIONS.md.

## Pickup approval and delivery assignment progression - 2026-10-26

Fixed approved-but-unassigned parcels disappearing from Pickup Requests. The queue and notification count now keep them visible until pickup Rider assignment. The parcel dialog resolves newly claimed legacy parcels across both unallocated and owned results and derives availability from actual center ownership. Assignment controls are raised above long order/address details; unassigned pickup screens no longer prioritize receiving/sorting scan instructions. If an action moves a parcel outside the current filter, an explicit link opens that tracking reference across all queues.

The dispatch queue parcel dialog now exposes label capture and delivery Rider assignment directly, while keeping server-required exact tracking/manual reason, receiving/sorting, company/center approval and destination coverage checks. Destination choices match the buyer address; missing eligible Rider coverage has an explicit setup message. Stage guidance tells Logistics and Rider the next physical action or whose acceptance is awaited, and repeat pre-handover dispatch assignment is labelled Reassign Delivery Rider. No scan or custody timestamp is fabricated and no workflow stage is skipped.

Validation: 103 related feature tests pass (1806 assertions), including full regular and accepted-unallocated pickup journeys, same Rider and different delivery Rider, scan rejection, dispatch acceptance, proof and actual COD. The Logistics browser harness passes 19 scenarios: both pickup approval paths retain usable assignment controls, pickup assignment appears in the correct Rider account, dispatch assignment works directly from its queue and appears with the acceptance action for the delivery Rider. Existing camera/scanner/offline/waybill checks still pass. Latest mobile dark screenshots for approval/assignment were visually reviewed. TypeScript, targeted ESLint/Prettier, Pint, production build and whitespace checks pass. Browser data is isolated temporary SQLite. No real account/parcel/COD records were changed; physical-device/full accessibility and production deployment acceptance remain separate. No deployment, commit or push occurred.

Mobile action polish: assignment controls precede long parcel details, and toast notifications now sit below modal dialogs so they cannot cover the assignment/confirmation buttons. Production build and formatting pass after this layering adjustment.

## Buyer and Seller stock and checkout integrity - 2026-11-01

Product and size/color editors now send original stock snapshots so a purchase
while the Seller edits cannot be overwritten by an older form. Validation tells
the Seller to close and reopen the editor; the entered draft remains available
until then. Cart availability reflects category/department and store eligibility,
and unavailable lines remain removable. The cart minus control reduces directly
to remaining stock after a larger stock drop. Flat-fee checkout now sends the
reviewed shipping amount, matching the provider-based quote protection. Branding,
routes, COD, ownership and approval boundaries are preserved.

Validation: 12 new integrity cases pass (163 assertions). Full backend run:
1,086 passed, 3 skipped, the same 3 pre-existing Logistics expectation failures.
The final Buyer/Seller browser run passes all 17 scenarios, including a separate
Buyer purchase while a Seller stock editor remains open, rejection and reviewed
retry, live cart stock recovery, request payload snapshots, mobile/light/dark
reflow, and the connected finance/return journey. TypeScript, targeted ESLint,
Prettier, PHP Pint and production build pass. See
[Buyer/Seller verification](../BUYER_SELLER_VERIFICATION_2026_11_01.md).
Physical devices, actual email/OAuth, production MySQL contention and comprehensive
screen-reader/contrast/zoom acceptance remain unverified; this is not a WCAG
certification. No deployment, commit or push occurred.

## 2026-11-05 - Web parcel camera reliability

Reproduced native BarcodeDetector empty-result failure, then added software fallback for empty/invalid/error results, deeper row searches, explicit rotated/inverted pixel attempts, ideal high-resolution capture and an uncropped preview. Shared Logistics/Rider UI now distinguishes scanning, unreadable-label guidance, stopped capture and the exact captured tracking reference. Permission cancellation releases late camera streams; scanning never submits a handover.

Fresh checks: 28 Logistics/Rider browser scenarios passed using generated barcode video frames; 58 relevant Laravel tests passed (1,109 assertions) against isolated SQLite with fake mail; targeted ESLint, TypeScript, Prettier and production build passed. Captured/guidance screenshots were reviewed at dark 320px; existing light/desktop and mobile reflow checks passed. Physical webcam/printed-label and full accessibility acceptance remain unverified; automated checks do not certify WCAG compliance. See documentation/PARCEL_SCANNING.md and local storage/app/scanner-fix-1793878734636/ evidence. No existing application records, permissions, schema, dependencies or deployment configuration were changed.


## 2026-11-05 - Same-reference QR and actual Infinix camera verification

Added a square QR next to the existing web waybill barcode using installed ZXing code; both encode the same tracking reference. Shared Logistics/Rider decoding supports QR without accepting URLs or changing permissions/handovers. QR images retain white margins, black-on-white print contrast and accessible names. Thirty-one isolated browser scenarios passed, including actual rendered waybill QR and a rotated view, exact lookup and URL rejection. ESLint, TypeScript, Prettier and production build passed.

Actual Infinix X6876 Chrome camera capture of parcel #15 QR was observed: correct tracking, matching authorized parcel, camera stopped and no handover submitted by the assistant. Private evidence is in storage/app/private/scanner-diagnostics/phone-qr-success.json. The physical screen-to-camera Code 128 attempt did not decode; its exact optical/rendering cause remains unresolved. Printed linear barcodes, other hardware and full screen-reader/zoom/contrast acceptance remain unverified. This does not certify WCAG compliance. No new dependency, database/schema change, commit, push or deployment.


## 2026-11-05 - Logistics mobile web operations

Added Logistics-only fixed mobile navigation for Dashboard/Scan/Parcels/Menu, safe-area content clearance, active-page semantics and menu Escape/focus restoration. Reduced the sticky mobile Logistics header by moving descriptions into scrollable content; preserved other-role headers. Scan camera now precedes manual fields, has full-width primary controls and a bounded uncropped preview; redundant disabled Start hides during active mobile scanning. Added dashboard Scan action, mobile queue grid and parcel shrink/wrap fixes. Existing branding, authorization, payloads, QR/barcode decoding and handover rules remain intact.

Verification: 46 Logistics browser scenarios and 45 cross-role dashboard scenarios passed; 78 relevant Laravel tests passed (1241 assertions), isolated SQLite/fake services; ESLint, TypeScript, Prettier, PHP fixture Pint and production build passed. All 12 selected company pages fit 320px without document overflow. Reviewed light 408px/dark 320px scan screenshots. Physical Infinix DOM measurements on Rider payments confirmed 408px/no overflow and visible navigation; a complete physical Scan screenshot/touch acceptance was not obtained because the tab was backgrounded/navigated during inspection. Actual hardware scanning was not repeated after this layout change. Full screen-reader/contrast, true browser zoom and complete WCAG acceptance remain unverified. Evidence: storage/app/logistics-mobile-1793881443393/VERIFICATION.md. No database schema, business records, new dependency, commit, push or deployment was changed.


## 2026-11-09 - Google account password setup

Google accounts can now set a LubosMart password using the existing email-code form while preserving Google sign-in. Existing current-password checks remain for accounts with passwords. ESLint, TypeScript, Prettier and production build passed. Browser visual, keyboard, zoom and screen-reader acceptance were not performed; WCAG compliance and live inbox delivery remain unverified. See documentation/deployment/MAIL_VERIFICATION.md for coverage and live acceptance steps.
