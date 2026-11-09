# Account creation audit

Audit date: 2026-10-13, Asia/Manila. Scope: current working-tree account creation, authentication, onboarding, approval, documents, and role/center access. **Analysis only. Implementation is not authorized by this audit.**

## Evidence and workbook integrity

The requested `docs/standards/Blackbox_Test_Cases_Account_Creation-1.xlsx` is absent. The identically named workbook exists at `documentation/standards/Blackbox_Test_Cases_Account_Creation-1.xlsx` and was read directly as an OOXML ZIP, including shared strings, workbook relationships, all worksheet rows, cached cell values, and formulas. No workbook cell was edited.

All eight sheets were inspected: Summary, Test Data, Test Files, Assumptions, Buyer, Seller, Logistics, Rider. Exactly 150 distinct case IDs were extracted, including all eleven requested fields. Summary's example failure is explicitly an illustration, not an execution result or a 151st case. Its actual case statuses are all Not Run. The complete, individually classified matrix is in [ACCOUNT_CREATION_TRACEABILITY.md](ACCOUNT_CREATION_TRACEABILITY.md); its header records the workbook SHA-256. Supporting-sheet values are reproduced below.

No application, test, migration, environment, or dependency code was modified. No database query, migration, seed, test suite, or production request was executed. The only runtime inspection was database-free email validation using the installed framework. It accepted `juanmiguel.delacruz@example` and rejected the other four Buyer invalid-email examples. This is a validator probe, **not a workbook PASS/FAIL**. A subsequent password-rule introspection call used an unsupported method and failed; password conclusions instead use the installed rule source and existing test assertions. No test outcome is inferred from that failed call.

The audit reflects the real working tree, including pre-existing uncommitted frontend organization and documentation changes. It does not treat a clean Git commit, the saved API branch, or production as equivalent to this checkout. File hashes were captured for application/configuration/frontend/migrations/tests/dependency files and checked after document generation. Deployment configuration and live database constraints were not inspected. Runtime browser behavior, email arrival, network services, and concurrency remain unverified.

## Classification summary

IMPLEMENTED means source evidence for the scenario-specific contract; it does not mean the workbook case passed. PARTIAL means only some required behavior exists. MISSING means the required feature/entry point is absent. CONFLICT means implemented behavior differs from the workbook. NEEDS VERIFICATION means inspection cannot establish the requested outcome. Each case has one primary classification; its finding preserves additional dependencies and differences.

| Role | Implemented | Partial | Missing | Conflict | Needs verification | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Buyer | 8 | 5 | 3 | 13 | 1 | 30 |
| Seller | 12 | 11 | 6 | 14 | 1 | 44 |
| Logistics | 11 | 12 | 8 | 12 | 1 | 44 |
| Rider | 1 | 1 | 27 | 3 | 0 | 32 |
| **Total** | **32** | **29** | **44** | **42** | **3** | **150** |

All 150 workbook executions remain NOT RUN during this audit. Atomic existing controls such as email uniqueness or cross-role denial are assessed independently of missing workbook prerequisites. Consequently, IMPLEMENTED rows may still require revised setup data before execution. Missing Add Rider endpoints are not credited as secure merely because they cannot be accessed.

## Current architecture

### Framework and frontend

Installed Composer metadata and `composer.lock` identify Laravel **12.69.3**, Inertia Laravel **2.0.28**, Socialite **5.31.0**, and Pest **3.8.7**. `package-lock.json` identifies React **19.0.0**, TypeScript **5.7.3**, and Inertia React **2.0.3**. Version constraints in `composer.json` and `package.json` are broader than these concrete installed/locked versions.

This is a Laravel web/session application with controllers, Eloquent models, Form Requests, policies, middleware, domain services, notifications, and database transactions. Public registration validates inline; onboarding uses Form Requests. There is no separate registration action/service covering all creation paths. `bootstrap/app.php:16–35` registers web routing and global account middleware; it does not register the saved Sanctum API branch's routes.

React screens live under `resources/views/pages`, layouts under `resources/views/layouts`, and components under `resources/views/components`. [resources/js/app.tsx:17](../../resources/js/app.tsx#L17) resolves Inertia names to `../views/pages/**/*.tsx`. [resources/views/app.blade.php:16](../../resources/views/app.blade.php#L16) mounts Inertia and loads Vite assets. Laravel supplies props; React `useForm` sends forms through the web routes. A `.tsx` file under views is still a React component, not a PHP Blade template.

### Account creation and authentication routes

| Entry point | Implementation and contract |
| --- | --- |
| GET/POST `/register` | [routes/auth.php:27–30](../../routes/auth.php#L27), `RegisteredUserController::create/store`; POST is guest-only and throttled 10/minute. |
| GET/POST `/login`, POST `/logout` | [routes/auth.php:32–35](../../routes/auth.php#L32), [AuthenticatedSessionController::store:30](../../app/Http/Controllers/Auth/AuthenticatedSessionController.php#L30), `LoginRequest::authenticate:58`; stored user state determines redirect, not submitted role/status. |
| Google redirect/callback | [routes/auth.php:21–25](../../routes/auth.php#L21), [GoogleAuthController::redirect/callback:20–104](../../app/Http/Controllers/Auth/GoogleAuthController.php#L20); verified provider email, session-held role/intent, 15-minute intent expiry, stateful Socialite, transaction, uniqueness recovery. |
| Verification link | [routes/auth.php:17–18](../../routes/auth.php#L17), `VerifyEmailController::__invoke:17`, `EmailVerificationLinks::verify:53`; public bearer token verifies the owner without signing in another session. |
| Verification notice/resend/correct address | [routes/auth.php:55–63](../../routes/auth.php#L55); authenticated account; resend cooldown and throttles. |
| Application edit/draft/submit/wait | [routes/web.php:39–45](../../routes/web.php#L39); verified account; `ApplicationController::edit/draft/store/waiting`; draft/submit throttles 20/10 per minute. |
| Application review | [routes/web.php:91–93](../../routes/web.php#L91); verified, operational Admin/Sorting Center plus policy and Admin permission middleware. |
| Private registration documents | [routes/web.php:45](../../routes/web.php#L45), signed URL plus reviewer policy in `RegistrationDocumentController::__invoke:13`. |
| Rider management | [routes/web.php:76–78](../../routes/web.php#L76), `AccountController::index/show/update`; list/view/change existing rider status. **No Add Rider creation or invitation route exists.** |

### Registration stages and actual statuses

1. [RegistrationForm:81–252](../../resources/views/components/auth/registration-form.tsx#L81) collects email, role, password and confirmation only. Public role choices include Buyer, Seller, Courier, Sorting Center. It is reused by the dedicated registration page and storefront modal (`storefront-auth-modal.tsx:263`).
2. [RegisteredUserController::store:38–99](../../app/Http/Controllers/Auth/RegisteredUserController.php#L38) normalizes email, validates it globally, hashes password, creates user plus draft application in a transaction, and sets user `unverified`. Structured names and optional store/category are accepted by the backend for older callers; names are not mandatory when omitted. The default displayed name is `LubosMart member`.
3. `RegisteredUserController::store:101–112` dispatches Registered, handles mail failure without losing the account, signs in a restricted session and routes to verification. [User::sendEmailVerificationNotification:80–82](../../app/Models/User.php#L80) delegates to `EmailVerificationLinks`.
4. [EmailVerificationLinks::send/verify:21–73](../../app/Services/EmailVerificationLinks.php#L21) uses random 64-character tokens, SHA-256 hashes, **24-hour** expiry, consumed marker, current-email binding, row locks, and 60-second resend cooldown. Verification changes `unverified` to **`incomplete`**, not Active or immediately Pending Approval.
5. [SubmitApplicationRequest::rules:24–54](../../app/Http/Requests/SubmitApplicationRequest.php#L24) requires personal data, PH mobile, birthday, address hierarchy, four-digit ZIP, identity and submission consent. Sellers require business name/category/business permit. Sorting Centers require business name/business permit. Couriers require vehicle, plate, operational center, license and OR/CR. [SaveApplicationDraftRequest::rules:10–17](../../app/Http/Requests/SaveApplicationDraftRequest.php#L10) reuses these constraints while making fields optional for drafts.
6. [ApplicationController::store:83–132](../../app/Http/Controllers/ApplicationController.php#L83) resolves address values, locks user then application, prevents repeat submission, stores details/documents and marks user `pending`, application `submitted`. Buyer is included in this approval workflow.
7. [ApplicationReviewController::update:69–115](../../app/Http/Controllers/ApplicationReviewController.php#L69) rechecks authorization and eligibility under matching locks; approves/rejects application/user, updates seller store or center affiliations, writes audit evidence, queues decision email after commit. Rejection requires a reason. Couriers are normally reviewed by their selected center; Admin override requires a reason.
8. Rejected applicants can correct and resubmit. [ApplicationController::store:118–124](../../app/Http/Controllers/ApplicationController.php#L118) clears prior decision metadata and restores pending/submitted. Document uploads append records; there is no explicit replacement/current-version selector.

Actual user statuses: `unverified`, `incomplete`, `pending`, `approved`, `rejected`, `suspended`, `deactivated`. Application statuses: `draft`, `submitted`, `approved`, `rejected`. There is no `pending_activation` status or separate 24-hour rider password-setting invitation. Do not blindly translate workbook Active to an existing enum without deciding the allowed workflow.

### Models, relationships and schema

| Entity | Actual relationship / constraints |
| --- | --- |
| User | Single `users` table; roles `buyer`, `seller`, `courier`, `sorting_center`, `admin`; `User` implements MustVerifyEmail. `User.php:32–62` protects status/phone from mass assignment and hides password/bank data. One global email unique index: initial users migration `:15`. Phone `:18` is nullable and not unique. |
| Personal profile | `user_profiles.user_id` unique; names max 80; sex/birthday and PSGC codes. Foundations migration `:14–23` plus extension migration `2026_10_07_022244...:21–25`. Accessed through query builder; no dedicated profile/Role model was found. |
| Seller | `User::store:101` has one Store; stores.user_id unique (`2026_10_05_124119...:13`). Name max 160, no global name unique index; category and approval state. Encrypted bank account is set later in settings. |
| Logistics | Workbook Logistics maps to canonical `sorting_center`. User joins SortingCenter through `sorting_center_user` with `granted_by`; a user may join multiple centers. Approved application creates/reuses a center (`ApplicationReviewController::update:93–97`). Center name is not unique. |
| Rider | Workbook Rider maps to `courier`. `users.sorting_center_id` belongs to assigned center; approval syncs center membership. `rider_profiles.user_id` unique; vehicle/plate stored, but plate not unique. No license-number/expiry or invitation schema. |
| Registration application | One per user (`2026_10_06_135205...:27`), role/status/reviewer/reason/address/business/center; separate one-per-application draft JSON record. |
| Documents | Many RegistrationDocuments per application (`foundations migration:40–49`); kind/disk/path/MIME/size. No uniqueness or current-document/version flag per kind. |
| Admin | Public signup excludes Admin. Interactive [CreateAdmin::handle:21–64](../../app/Console/Commands/CreateAdmin.php#L21) provisions it. `User::canAdmin:121–123` requires approved, verified operational status. Current `adminPermissions:116–118` gives the full permission list to every Admin, not configurable individual subsets. |

Schema history matters: [2026_10_09_055208_align_account_registration_flow.php:15–41](../../database/migrations/2026_10_09_055208_align_account_registration_flow.php#L15) maps old rider/logistics values to courier/sorting_center and changes status/role enums. Historical migrations should not be rewritten to implement the workbook. Live migration state/indexes/collation remain unverified.

Bounded source searches covered `app`, `routes`, `database`, `resources`, relevant `config`, and `tests` for registration/activation methods, TIN, seller type, SEC/company fields, license number/expiry, and phone/plate/business uniqueness. No applicable TIN/SEC/seller-type/license-number/license-expiry fields or manager rider-create/invitation implementation was found. Operational service-area/shipping-rate features exist, but are not a registration regional multiselect. The separate saved API branch was not treated as deployed/current implementation.

### OTP, uploads, approval and authorization

[EmailSecurityCodes::send/verify:18–82](../../app/Services/EmailSecurityCodes.php#L18) does implement six-digit hashed codes for password recovery and sensitive profile confirmation: **ten-minute** expiry, five wrong attempts, three requests/hour per email, row locks and one-time confirmation tokens. It does **not** implement A9 registration OTP or rider activation. [routes/auth.php:37–49](../../routes/auth.php#L37) connects recovery code/reset endpoints. Reusing that service would require deliberate purpose/expiry changes and regression coverage, not renaming the existing password-code page.

Uploads use `file|mimes:jpg,jpeg,png,pdf|max:5120` (`SubmitApplicationRequest:29`) and Laravel-generated storage names (`ApplicationController::storeDocuments:160`). [config/filesystems.php:33–38](../../config/filesystems.php#L33) places local documents under `storage/app/private`. Downloads require authenticated verified reviewer, signed URL and policy, then return nosniff/private-no-store/CSP sandbox headers (`RegistrationDocumentController:15–22`). MIME inspection is not original filename-extension checking or malware scanning; neither scanning nor re-encoding was found. Private storage and policy controls are present; no exploitable upload execution path was established.

`User::canOperate:126–129` requires approved + verified; couriers also need an operational center. [SortingCenter::scopeOperational:18–21](../../app/Models/SortingCenter.php#L18) requires an active center with approved verified operator. `EnsureOnboardingAccess:17–31`, `EnsureAccountIsActive:11–17`, `EnsureRole:11–15`, `EnsureAccountIsNotSuspended`, and `EnsureAdminPermission` protect existing pages. [DashboardController::show:39–43](../../app/Http/Controllers/DashboardController.php#L39) enforces role equality.

[RegistrationApplicationPolicy::review/view:10–24](../../app/Policies/RegistrationApplicationPolicy.php#L10) excludes self-review and checks approved verified reviewer and center affiliation. [AccountController::index:29–31](../../app/Http/Controllers/AccountController.php#L29) scopes logistics rider lists by owned operational centers; [UserPolicy::updateStatus:9–19](../../app/Policies/UserPolicy.php#L9) scopes changes. [AccountController::update:67–80](../../app/Http/Controllers/AccountController.php#L67) prevents status-management approval bypass and restricts restoration of Admin-disabled riders. [DeliveryController::index/update:20–30,79–85](../../app/Http/Controllers/DeliveryController.php#L20) scopes courier parcels and update actions. No cross-center bypass was established from reviewed code; multi-center/company identity and runtime adversarial requests still need verification.

## Assumptions requiring reconciliation

| Ref | Actual behavior compared with proposal | Decision needed |
| --- | --- | --- |
| A1 | Signup is credentials-only; full application follows verification. Names, sex, address and ID are required later for all roles. Bank/payout details are configured later. Logistics is a center operator rather than a dedicated Company model. | Single complete registration form, or preserve staged onboarding and adjust workbook? |
| A2 | Optional structured signup names and application names have max 80, no min 2 or punctuation whitelist. | Adopt exact 2–50 whitelist, preserving current names and Unicode rules? |
| A3 | Email is globally unique and normalized on password signup. Basic RFC validation accepts a no-dot domain from the invalid examples. Live mixed-case legacy records/collation unverified. | Must every accepted email have a dot-qualified domain? Define fixtures and cross-role legacy reconciliation. |
| A4 | PH format regex exists later; mobile is not globally unique or normalized. | Adopt canonical global uniqueness; resolve existing duplicates before a unique index? |
| A5 | Password signup/reset/change require minimum 8 and confirmation, without composition. Admin CLI separately requires 12 plus letters/numbers. | Adopt composition for public creation/activation only, or also change/reset? Keep existing working passwords usable. |
| A6 | Birthday is valid past date after 1900; age is displayed, not required to be 18. | Adopt adulthood for Buyers/Riders only; resolve date/timezone and grandfathering. |
| A7 | Province/NCR→city→barangay with relationship validation; no region-first input. ZIP exactly 4 digits at application. | Add region-first selection or reconcile workbook with existing verified hierarchy? |
| A8 | No TIN field/storage/unique rule. | Approve 12-digit format and seller/logistics shared uniqueness. |
| A9 | 24-hour random verification link, no registration OTP; unrelated recovery/profile codes expire after 10 minutes. | Replace link, supplement it, or change workbook? Decide Google verified-email handling. |
| A10 | MIME JPG/JPEG/PNG/PDF and max 5120 KB implemented in application/draft/profile uploads. Account already exists before upload. | Preserve upload stage or require pre-account validation? Confirm file-extension semantics and deployment request limits. |
| A11 | Generic identity + business_permit; no Individual/Sole Proprietorship/Corporation taxonomy or separate DTI/SEC/BIR slots. | Adopt conditional seller taxonomy and document schema without discarding old documents. |
| A12 | All roles, including Buyers, require application approval; verification produces incomplete. Seller/Logistics wait only after application submission. Resubmission exists. | Remove buyer approval or preserve it? Decide status names and existing pending/rejected users. |
| A13 | Couriers publicly register, choose center, submit documents, undergo center approval; Admin override exists. No invitation/activation flow. | Replace, coexist with, or retain public courier signup? Define company/center ownership before introducing invitations. |
| A14 | User email/owner foreign keys unique; business names and plates are not. SEC/license identifiers absent. | Approve identifier normalization/uniqueness scope and remediation of existing duplicates. |
| A15 | No license-number/expiry metadata. Proposed mask/example contain one letter + **10** digits, whereas prose says 11 digits. | Choose the authoritative mask/digit count; define expiry inclusivity/timezone. |
| A16 | Existing role, approval and center guards exist; some domain pages are deliberately shared across authorized roles. | Interpret as denial of unauthorized pages/data, not forbidding shared support/orders/settings. |

## Architectural and security risks

These are findings or residual risks, not claims of exploitation. Missing proposed business rules do not automatically establish a security vulnerability.

| Priority | Finding, evidence and implication | Proposed response (requires implementation approval) |
| --- | --- | --- |
| P1 | Workflow conflicts A9/A12/A13 affect the whole acceptance model. Source references above and explicit existing tests accept buyer review, link verification, and public courier registration. | Reconcile before writing code. Do not remove buyer review or public courier registration without a migration/transition decision. |
| P1 | Phone/business/plate uniqueness is absent; TIN/SEC/license storage is absent. Existing DB user email uniqueness is present. | Approve scope/canonicalization; use read-only duplicate inventory, then additive/backfill/index phases. Never delete duplicate records automatically. |
| P1 | No adulthood rule and no requested password-composition rule. `SubmitApplicationRequest:36`, `RegisteredUserController:53`, installed Password default. | Implement only approved admission/password rules and test server enforcement; preserve Google auth and existing login/reset contracts. |
| P1 | Repeat registration uses pre-insert unique validation + DB constraint but no unique-violation recovery/idempotency in password signup (`RegisteredUserController:45–99`). Frontend busy guard protects ordinary clicks, not parallel requests. | Test simultaneous identical submissions on isolated MySQL; provide safe retry/duplicate handling and at-most-once notification semantics. DB duplicates are blocked; an error response under a race is a risk, not a reproduced result. |
| P1 | Future rider invitation would expand company-owned account creation and expose cross-center write boundaries. Existing center-scoped policies cannot substitute for authorizing a new endpoint. | Establish owned company/center identity, prohibit submitted role/status/foreign owner injection, atomically consume invitation, restrict suspended/pending company actions. |
| P2 | Upload resubmission appends documents, and requiredness trusts stored document-kind metadata (`SubmitApplicationRequest:27–29`, `ApplicationController:148–165`). Review doesn't programmatically ensure every referenced file still exists. | Preserve history, explicitly select current version and verify required artifacts. Test missing storage files and concurrent resubmission. Do not delete existing documents. |
| P2 | MIME/size/private headers exist, but no malware/content scan or original-extension match found. PHP/proxy multipart limits and malformed-image/PDF behavior are unverified. | Verify limits and adversarial file fixtures; decide additional hardening based on actual deployment threat model. Do not assert WCAG/upload safety from a build. |
| P2 | Duplicate creation paths: password controller and Google callback each create user/application. Signup frontend is reused correctly, but legacy Blade modal presents obsolete rider role and seller fields (`components/auth-modal.blade.php:164–202`); no active include was found. | Prefer shared validation/action only if it removes actual policy divergence. Keep existing integrations; do not delete the legacy template during this audit. |
| P2 | Frontend/server rules are not identical: browser validity differs from RFC email validation; onboarding has required but no name/phone/ZIP patterns/maxima on general field helper (`application.tsx:204–235`). Signup consent is optional, later application accepted. | Align approved constraints in UI and server; server remains authoritative. Add exact field-error/value-retention browser checks. |
| P2 | Approval mail is queued after commit (`ApplicationReviewed:19–21`); live worker/inbox delivery isn't proven. Signup failure retains unverified account and exposes retry. | Verify local mail catcher and worker configuration without sending to real people; test transport failure/retry and duplicate delivery. |
| P2 | Changing partner name/bank/plate/identity reopens review and can block affiliated riders (`Settings/ProfileController::update:63–122`). New global identifiers must cover profile edits, not just signup. | Include current settings/re-review, parcel affiliation, suspension, COD and seller fulfillment regressions. |

Existing OTP security is stronger than a bare code lookup: hashing, per-purpose records, attempt limits, confirmation expiry, rotation and lock-based consumption exist. Its ten-minute recovery flow must remain separate from proposed five-minute registration OTP. Verification link rotation/single use/expiry/current-email checks are present. No existing OTP bypass or approval bypass was demonstrated.

## Existing automated test evidence and limits

| Test source | Contracts inspected |
| --- | --- |
| `tests/Feature/Auth/RegistrationTest.php:9,35,60,128,161,175,202,217` | Credentials-only creation, optional structured names, Courier self-registration, Buyer approval requirement, rejected public Admin/legacy roles, mail-failure retry, optional signup consent. Several deliberately conflict with workbook assumptions. |
| `tests/Feature/Auth/EmailVerificationTest.php:33,54,63,73,83,94,109,125` | Hashed link token, incomplete status, invalid/used links, device/session separation, 24-hour expiry, resend rotation/cooldown, changed-email invalidation, unverified access restriction. |
| `tests/Feature/Auth/ApplicationWorkflowTest.php:61,81,100,108,113,144,151,161,172,181,190,198,215,238,255,269,279,292` | Required documents/consent, address hierarchy, role-specific fields, repeated submission, eligibility, approver authorization, rejection reason, center scope, private documents, approval bypass prevention, resubmission, center/store state. |
| `tests/Feature/Auth/ApplicationDraftTest.php:21,47,57,63,79,101` | Partial draft resume, private files, immutable submitted drafts, rejected draft corrections, saved documents, address relationships. |
| `tests/Feature/Auth/RoleAccessTest.php:12,27,33,37,42,51,57` | Role dashboards, cross-role denial, verified/pending gates, suspension and privilege injection. |
| `tests/Feature/Auth/AccountBoundaryTest.php:14,28,51,66,82` | Optional consent boundaries, stored-state login, login lockout, signature + policy, audited Admin override. |
| `tests/Feature/Auth/EmailCodeTest.php:25,50,63,72,86,106,121` | Recovery OTP expiry, wrong attempts, resend limits, single-use tokens, session revocation, per-purpose isolation. Not registration OTP coverage. |
| `tests/Feature/Auth/GoogleAuthTest.php:8,44,54,116,139,161,175` | Provider verified-email, linking, roles, deferred application and Buyer approval. |
| `tests/Feature/LogisticsApprovalChainTest.php:32,50,64,84,103,122,137` | Operational center dependencies, document access, center-scoped riders, Admin restrictions, business/document re-review, bank changes and service-area scope. |
| `tests/Feature/Logistics/LogisticsWorkspaceTest.php:102,169` | Admin restriction preservation and center-scoped operations/reports. |
| `tests/Feature/Notifications/TransactionalMailTest.php` | Application/security mail rendering and escaping; not real inbox delivery. |

These tests were inspected, not rerun in this audit. Prior session results are not recounted as current case results. The suite uses Pest/Laravel feature tests with RefreshDatabase, SQLite `:memory:`, array mail/session/cache, sync queue, and faked external services (`phpunit.xml`, `tests/Pest.php`). `tests/TestCase.php:13` disables Vite in HTTP tests. No installed real-browser test package was found. Existing tests do not establish 150-case coverage, JS visual/value retention, exact upload-byte boundaries, deployed constraints, mail arrival, or concurrent MySQL behavior. No new tests were written.

## Workbook ambiguities and required decisions

1. **Authority and lifecycle:** Are A1–A16 to replace existing behavior, or should the workbook be reconciled to the current system? Specifically decide Buyer approval, link versus OTP, staged registration, and public versus company-created Riders. They are mutually material choices, not routine refactoring.
2. **Company identity:** Can one Logistics account own several sorting centers and can several operators share one company? Current memberships support several centers/operators. A13's creator company isolation needs an explicit ownership mapping; do not use caller-submitted center ID as authority.
3. **Existing accounts:** What happens to incomplete/pending/rejected applications, publicly registered couriers, same-name shops/companies and duplicate phone/plate values? Preserve records and approvals until an explicit transition is approved.
4. **OTP/activation semantics:** Decide coexistence/retirement of links, Google's already verified email, exact five-minute and 24-hour boundaries, resend invalidation, and how delivery failure affects state. Only introduce activation if A13 is accepted.
5. **Unique values:** Decide case/spacing normalization for business names, SEC/TIN/license/plate, uniqueness across companies/roles, and treatment of shared/reassigned vehicles or phone numbers. Workbook's global scopes must be explicitly accepted.
6. **Dates and formats:** A15 says one letter + eleven digits, but `A00-00-000000` and `N01-23-456789` have ten digits. Cached date formulas reflect October 7, 2026; recalculate before execution. On this audit date the age boundary is October 13, 2008 and license expiry boundary October 13, 2026. Transport should use unambiguous ISO dates; workbook display is MM/DD/YYYY. Decide leap-day birthdays and timezone.
7. **Fixtures and documents:** Test Files lists files to prepare, not supplied upload binaries. Prepare safe fixtures of the specified byte sizes. Seller rejection uses Account 2 (Corporation) but refers to a DTI rejection/replacement intended for Sole Proprietorship; choose a matching rejected document or appropriate applicant fixture. Define how old generic business_permit maps to DTI/SEC/BIR/Mayor documents without deleting originals.
8. **Email and names:** Confirm rejecting single-label email domains and exact allowed Unicode letters/punctuation. The name error says only letters although A2 also allows spaces/punctuation; agree meaningful messages without silently changing the allowed set.
9. **Execution environment:** Authorize a separate local/staging acceptance run with disposable database, mail catcher, upload fixtures, two company accounts and known Admin credentials. No production testing/data mutation is proposed.

## Recommended sequence

First approve the reconciliation choices; then implement additive schema/normalization, approved validation and registration stages, role-specific documents, chosen verification lifecycle, company-owned invitations if accepted, and final acceptance/regression execution. Each phase has exact case coverage, likely files, migration/security/tests/risks in [ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md](ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md).

Stop here: these documents are proposals. No implementation, branch change, commit, push, deployment, data cleanup, or acceptance run is authorized by their creation.

## Supporting worksheets — exact extracted values

The following tables reproduce all nonempty row records from Test Data, Test Files, and Assumptions, including headers and workbook notes. Empty/merged cells remain empty. Summary was separately inspected and its counts/instructions described above; the case sheets are reproduced individually in the traceability matrix. Formula results are cached values, not recalculated execution fixtures.

### Test Data (77 row records)

| Workbook row | A | B | C | D | E | F | G |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Test data and input details |  |  |  |  |  |  |
| 2 | Every form field per role, with its rule and two complete sets of valid data. Account 1 is the main account in the test cases. Account 2 is for cases that need a second account. All people, companies, numbers and addresses are fictional. |  |  |  |  |  |  |
| 4 | Buyer: Self-registration |  |  |  |  |  |  |
| 5 | Role | Field | Required | Input type | Format / rule | Account 1 (valid) | Account 2 (valid) |
| 6 | Buyer | First Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Juan Miguel | Ana Marie |
| 7 | Buyer | Last Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Dela Cruz | Reyes |
| 8 | Buyer | Email | Yes | Email | Valid email format; unique | juanmiguel.delacruz@example.com | anamarie.reyes@example.com |
| 9 | Buyer | Mobile Number | Yes | Text | 09XXXXXXXXX or +639XXXXXXXXX; unique | 09171234567 | 09173456789 |
| 10 | Buyer | Date of Birth | Yes | Date picker | At least 18 years old | 05/14/1998 | 11/02/2001 |
| 11 | Buyer | Password | Yes | Password | Min 8 characters; uppercase, lowercase, number, special character | Mamimili@2026 | Suki#2026Ana |
| 12 | Buyer | Confirm Password | Yes | Password | Must match Password | Mamimili@2026 | Suki#2026Ana |
| 13 | Buyer | Terms and Privacy Policy | Yes | Checkbox | Must be ticked | Ticked | Ticked |
| 15 | Seller: Self-registration, then admin approval |  |  |  |  |  |  |
| 16 | Role | Field | Required | Input type | Format / rule | Account 1 (valid) | Account 2 (valid) |
| 17 | Seller | First Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Maria Clara | Roberto |
| 18 | Seller | Last Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Santos | Villanueva |
| 19 | Seller | Email | Yes | Email | Valid email format; unique | mariaclara.santos@example.com | roberto.villanueva@example.com |
| 20 | Seller | Mobile Number | Yes | Text | 09XXXXXXXXX or +639XXXXXXXXX; unique | 09189876543 | 09194567890 |
| 21 | Seller | Shop Name | Yes | Text | 3 to 30 characters; unique | Maria Clara Handicrafts | RV Gadget Hub |
| 22 | Seller | Shop Category | Yes | Dropdown | One main category | Home &amp; Living | Mobiles &amp; Gadgets |
| 23 | Seller | Seller Type | Yes | Dropdown | Individual, Sole Proprietorship or Corporation | Sole Proprietorship | Corporation |
| 24 | Seller | TIN | Yes | Text | 000-000-000-000 (12 digits); unique | 123-456-789-000 | 456-789-012-000 |
| 25 | Seller | Region | Yes | Dropdown | Philippine regions | National Capital Region (NCR) | Region VII (Central Visayas) |
| 26 | Seller | Province | Yes | Dropdown | Filtered by Region | Metro Manila | Cebu |
| 27 | Seller | City / Municipality | Yes | Dropdown | Filtered by Province | Quezon City | Cebu City |
| 28 | Seller | Barangay | Yes | Dropdown | Filtered by City / Municipality | Commonwealth | Lahug |
| 29 | Seller | Street Address | Yes | Text | House, unit or lot number and street | Blk 12 Lot 8, Sampaguita St. | 2F, 45 Gorordo Ave. |
| 30 | Seller | Postal Code | Yes | Text | Exactly 4 digits | 1121 | 6000 |
| 31 | Seller | Government-issued ID (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | govt_id_front.jpg (1.2 MB) | govt_id_front.png (2.4 MB) |
| 32 | Seller | DTI Certificate (upload) | Sole Proprietorship only | File | JPG, PNG or PDF; max 5 MB | dti_certificate.pdf (850 KB) | Not applicable |
| 33 | Seller | SEC Certificate (upload) | Corporation only | File | JPG, PNG or PDF; max 5 MB | Not applicable | sec_certificate.pdf (1.0 MB) |
| 34 | Seller | BIR Form 2303 (upload) | Sole Proprietorship and Corporation | File | JPG, PNG or PDF; max 5 MB | bir_2303.pdf (1.1 MB) | bir_2303.pdf (1.1 MB) |
| 35 | Seller | Password | Yes | Password | Min 8 characters; uppercase, lowercase, number, special character | Tindahan@2026 | Gadget#Hub26 |
| 36 | Seller | Confirm Password | Yes | Password | Must match Password | Tindahan@2026 | Gadget#Hub26 |
| 37 | Seller | Terms and Privacy Policy | Yes | Checkbox | Must be ticked | Ticked | Ticked |
| 39 | Logistics: Self-registration, then admin approval |  |  |  |  |  |  |
| 40 | Role | Field | Required | Input type | Format / rule | Account 1 (valid) | Account 2 (valid) |
| 41 | Logistics | Company Name | Yes | Text | Unique | Bilis Hatid Express Inc. | Agila Cargo Movers Corp. |
| 42 | Logistics | SEC Registration No. | Yes | Text | 2 letters followed by 9 digits; unique | CS202012345 | CS201998765 |
| 43 | Logistics | TIN | Yes | Text | 000-000-000-000 (12 digits); unique | 234-567-890-000 | 567-890-123-000 |
| 44 | Logistics | Region | Yes | Dropdown | Philippine regions | National Capital Region (NCR) | Region XI (Davao Region) |
| 45 | Logistics | Province | Yes | Dropdown | Filtered by Region | Metro Manila | Davao del Sur |
| 46 | Logistics | City / Municipality | Yes | Dropdown | Filtered by Province | Pasig City | Davao City |
| 47 | Logistics | Barangay | Yes | Dropdown | Filtered by City / Municipality | Kapitolyo | Buhangin |
| 48 | Logistics | Street Address | Yes | Text | House, unit or lot number and street | Unit 5B, 88 West Capitol Drive | Door 3, 210 Sampaguita St. |
| 49 | Logistics | Postal Code | Yes | Text | Exactly 4 digits | 1603 | 8000 |
| 50 | Logistics | Contact Person First Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Carlos Antonio | Liza Mae |
| 51 | Logistics | Contact Person Last Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Mendoza | Fernandez |
| 52 | Logistics | Position | Yes | Text | Job title of the contact person | Operations Manager | General Manager |
| 53 | Logistics | Email | Yes | Email | Valid email format; unique | operations@bilishatid.example.com | admin@agilacargo.example.com |
| 54 | Logistics | Mobile Number | Yes | Text | 09XXXXXXXXX or +639XXXXXXXXX; unique | 09285551234 | 09396667890 |
| 55 | Logistics | Service Areas | Yes | Multi-select | At least one region | NCR; Region IV-A (CALABARZON) | Region XI (Davao Region) |
| 56 | Logistics | SEC Certificate (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | sec_certificate.pdf (1.0 MB) | sec_certificate.pdf (1.0 MB) |
| 57 | Logistics | BIR Form 2303 (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | bir_2303.pdf (1.1 MB) | bir_2303.pdf (1.1 MB) |
| 58 | Logistics | Mayor's / Business Permit (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | mayors_permit.pdf (1.3 MB) | mayors_permit.pdf (1.3 MB) |
| 59 | Logistics | Valid ID of Authorized Representative (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | govt_id_front.jpg (1.2 MB) | govt_id_front.png (2.4 MB) |
| 60 | Logistics | Password | Yes | Password | Min 8 characters; uppercase, lowercase, number, special character | Hatid@2026 | Agila#Cargo26 |
| 61 | Logistics | Confirm Password | Yes | Password | Must match Password | Hatid@2026 | Agila#Cargo26 |
| 62 | Logistics | Terms and Privacy Policy | Yes | Checkbox | Must be ticked | Ticked | Ticked |
| 64 | Rider: Created by an Approved logistics account |  |  |  |  |  |  |
| 65 | Role | Field | Required | Input type | Format / rule | Account 1 (valid) | Account 2 (valid) |
| 66 | Rider | First Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Pedro Jose | Mark Anthony |
| 67 | Rider | Last Name | Yes | Text | 2 to 50 characters; letters, spaces, hyphen, apostrophe, period | Garcia | Bautista |
| 68 | Rider | Date of Birth | Yes | Date picker | At least 18 years old | 03/22/1995 | 08/09/1999 |
| 69 | Rider | Email | Yes | Email | Valid email format; unique | pedrojose.garcia@example.com | markanthony.bautista@example.com |
| 70 | Rider | Mobile Number | Yes | Text | 09XXXXXXXXX or +639XXXXXXXXX; unique | 09451239876 | 09662345678 |
| 71 | Rider | Driver's License No. | Yes | Text | A00-00-000000; unique | N01-23-456789 | D05-19-123456 |
| 72 | Rider | License Expiry Date | Yes | Date picker | Today or later | 03/22/2030 | 08/09/2031 |
| 73 | Rider | Vehicle Type | Yes | Dropdown | Motorcycle, Car or Van | Motorcycle | Van |
| 74 | Rider | Plate Number | Yes | Text | Unique | 123ABC | NBC1234 |
| 75 | Rider | Driver's License (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | drivers_license.jpg (1.5 MB) | drivers_license.png (2.0 MB) |
| 76 | Rider | Vehicle OR/CR (upload) | Yes | File | JPG, PNG or PDF; max 5 MB | or_cr.pdf (900 KB) | or_cr.pdf (900 KB) |
| 77 | Rider | Password (set by the rider at activation) | Yes | Password | Min 8 characters; uppercase, lowercase, number, special character | Rider@2026 | Hatid#Mark26 |
| 79 | Other values |  |  |  |  |  |  |
| 80 | Spare emails for repeat attempts |  | buyer.test01@example.com to buyer.test10@example.com (same pattern for seller.test, logistics.test and rider.test) |  |  |  |  |
| 81 | Spare mobile numbers for repeat attempts |  | 09170000001 to 09170000020 |  |  |  |  |
| 82 | Admin account for approval tests |  | Use the admin account already seeded in your system |  |  |  |  |

### Test Files (21 row records)

| Workbook row | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| 1 | Upload files to prepare |  |  |  |  |
| 2 | Prepare these files before testing the document uploads. Use sample or blank documents, not anyone's real ID or certificate. The size limit is 5 MB, which is 5,120 KB or 5,242,880 bytes. |  |  |  |  |
| 4 | File name | Type | Size | Used for | Expected result |
| 5 | govt_id_front.jpg | JPG | 1.2 MB | Valid government ID | Accept |
| 6 | govt_id_front.png | PNG | 2.4 MB | Valid government ID in PNG | Accept |
| 7 | dti_certificate.pdf | PDF | 850 KB | DTI Certificate of Business Name Registration | Accept |
| 8 | dti_certificate_clear.pdf | PDF | 1.0 MB | Replacement document for the resubmit test (seller) | Accept |
| 9 | sec_certificate.pdf | PDF | 1.0 MB | SEC Certificate of Registration | Accept |
| 10 | bir_2303.pdf | PDF | 1.1 MB | BIR Certificate of Registration (Form 2303) | Accept |
| 11 | mayors_permit.pdf | PDF | 1.3 MB | Mayor's / Business Permit | Accept |
| 12 | mayors_permit_2026.pdf | PDF | 1.2 MB | Replacement document for the resubmit test (logistics) | Accept |
| 13 | drivers_license.jpg | JPG | 1.5 MB | Rider's driver's license | Accept |
| 14 | drivers_license.png | PNG | 2.0 MB | Rider's driver's license in PNG | Accept |
| 15 | drivers_license.pdf | PDF | 700 KB | Rider's driver's license in PDF | Accept |
| 16 | or_cr.pdf | PDF | 900 KB | Vehicle Official Receipt and Certificate of Registration | Accept |
| 17 | size_4.9MB.jpg | JPG | 4.9 MB (5,138,022 bytes) | Just under the size limit | Accept |
| 18 | size_5.0MB.jpg | JPG | 5.0 MB (5,242,880 bytes) | Exactly at the size limit | Accept |
| 19 | size_5.1MB.jpg | JPG | 5.1 MB (5,347,738 bytes) | Just over the size limit | Reject |
| 20 | price_list.docx | DOCX | 320 KB | Wrong file type (Word document) | Reject |
| 21 | store_banner.gif | GIF | 480 KB | Wrong file type (GIF image) | Reject |
| 22 | installer.exe | EXE | 2.1 MB | Wrong file type (program) | Reject |

### Assumptions (19 row records)

| Workbook row | A | B | C | D |
| --- | --- | --- | --- | --- |
| 1 | Assumptions used in the test cases |  |  |  |
| 2 | These rules are modeled on Philippine marketplaces, not taken from your actual system. Write your real rule in column D where it differs, then filter the Assumption Ref column on each role sheet to find the test cases to adjust. |  |  |  |
| 4 | Ref | Topic | Assumed rule | Your system's actual rule (fill in if different) |
| 5 | A1 | Form fields | Each role's form has the fields listed on the Test Data sheet, modeled on Philippine marketplaces. Payout details (bank or e-wallet) are set up after approval, not during registration. |  |
| 6 | A2 | Name rule | 2 to 50 characters. Letters (including ñ), spaces, hyphen, apostrophe and period only. |  |
| 7 | A3 | Email rule | Must be a valid email format. Unique across all roles (one email = one account). Not case-sensitive. Leading and trailing spaces are removed. |  |
| 8 | A4 | Mobile number rule | Philippine mobile number entered as 09XXXXXXXXX (11 digits) or +639XXXXXXXXX. Both forms are stored as the same number. Unique across all accounts. |  |
| 9 | A5 | Password rule | At least 8 characters with at least one uppercase letter, one lowercase letter, one number and one special character. Confirm Password must match. |  |
| 10 | A6 | Date of birth rule | Buyers and riders must be at least 18 years old on the day of registration. A future date is not allowed. |  |
| 11 | A7 | Address rule | Region, Province, City/Municipality and Barangay are linked dropdowns: each list depends on the one before it. Postal Code is exactly 4 digits. |  |
| 12 | A8 | TIN rule | 12 digits in the form 000-000-000-000 (9-digit TIN plus 3-digit branch code). Unique across seller and logistics accounts. |  |
| 13 | A9 | Email verification (OTP) | A 6-digit numeric code is emailed after registration. It is valid for 5 minutes. Resending creates a new code and cancels the old one. An account cannot be used until it is verified. |  |
| 14 | A10 | Document upload rule | Accepted file types: JPG, PNG, PDF. Maximum size: 5 MB (5,120 KB) per file. |  |
| 15 | A11 | Seller documents by seller type | Individual: Government-issued ID. Sole Proprietorship: Government-issued ID, DTI Certificate and BIR Form 2303. Corporation: Government-issued ID of the representative, SEC Certificate and BIR Form 2303. |  |
| 16 | A12 | Account status flow | Buyer: Unverified, then Active after OTP. Seller and Logistics: Unverified, then Pending Approval after OTP, then Approved or Rejected by an admin. A rejected applicant can correct the details and resubmit. |  |
| 17 | A13 | Rider account flow | Riders cannot register themselves. Only an Approved logistics account can create a rider. The rider starts as Pending Activation and becomes Active after setting a password through an emailed activation link, which is valid for 24 hours. Riders do not need separate admin approval. |  |
| 18 | A14 | Unique business identifiers | Shop Name (3 to 30 characters), Company Name, SEC Registration No. (2 letters followed by 9 digits), Driver's License No. and Plate Number must each be unique. |  |
| 19 | A15 | Driver's license rule | License number follows the LTO form A00-00-000000 (1 letter and 11 digits). The expiry date must be today or a later date. |  |
| 20 | A16 | Role-based access | Each role can open only its own pages. Opening another role's page is denied (error 403 or redirect). |  |

## Implementation follow-up - Logistics and Rider, 2026-10-13

The baseline findings above are historical source inspection. The approved follow-up implemented all 44 Logistics and 32 Rider source contracts; see ACCOUNT_CREATION_TRACEABILITY.md for current per-ID evidence and ACCOUNT_CREATION_IMPLEMENTATION_PLAN.md for dependency groups, migrations and remaining decisions. All 150 original IDs and eleven extracted workbook fields remain present. Source classification is now IMPLEMENTED for all 150 scenarios; no complete workbook/browser/inbox case is reported PASS.

The final full automated suite executed **803 passing tests, 3 explicit skips and 5,464 assertions**, with zero failures. The report storage/logs/logistics-rider-phase-tests.xml maps all 150 IDs: 147 have executed passing backend variants; TC-BUY-020, TC-SEL-018 and TC-LOG-018 require manual password visibility checks. Company enrollment now creates private company-bound, expiring, single-use Rider invitations. New Riders cannot publicly register or operate before activation; foreign company authorization is rejected server-side, including shared-center edge cases. New company approval requires verified complete applications and current private documents. Duplicate identifiers are protected by safe unique-key migrations plus tested transactional concurrency.

No configured/production database was migrated. Legacy collision/ownership reconciliation, production MySQL behavior, real PH address service/data, inbox delivery, actual browser interactions and accessibility remain unverified. A15?s prose license digit count conflicts with its exact examples; the implementation follows the exact A00-00-000000 mask. Ambiguous legacy shared centers require an explicit owner decision before new invitations. Audit updates do not authorize another phase, deployment, commits or data mutation.
