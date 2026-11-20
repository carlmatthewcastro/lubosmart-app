# Repository instructions

## Repository layout

`web/` contains Laravel, the React/Inertia website, the shared mobile API,
backend tests, dependency manifests and Docker configuration. Run PHP, Composer,
npm and Docker commands from `web/`. `mobile/` contains the Flutter application;
run Flutter commands there. Android helper scripts live in `mobile/scripts/`.
Shared documentation, Git configuration and local SDKs remain at the repository
root. Paths in standards such as `resources/` are relative to `web/` unless stated
otherwise. Open either application folder directly; no workspace file is needed.

Keep development snapshots, source copies, browser artifacts and completed build
logs in the ignored root `.tools/development-artifacts/` directory. Never create
them inside Laravel `web/storage/`; that folder is reserved for application
uploads, private files, runtime logs, sessions and framework caches. Never remove
customer uploads or private documents as part of development cleanup.

## Git operations

Before any Git operation, including read-only inspection, branching, staging,
committing, pushing, merging, or renaming branches, read
`documentation/standards/GIT_WORKFLOW_RULES.md` and follow it.
For tasks involving frontend changes and Git, read both the Git workflow rules
and `documentation/standards/UI_UX_RULES.md` before starting work.
Preserve existing work, explain logical commit groups and destination branches
before a requested push, and follow the rules' explicit approval requirements.
Never commit or push directly to `main`, merge into it, force-push, delete branches,
or deploy without the user's explicit authorization for that action.
Setting up standards alone does not authorize branch changes, commits, or pushes.

## Frontend and UI work

Before every frontend, styling, accessibility, or UI/UX task, read
`documentation/standards/UI_UX_RULES.md` and apply it to the implementation.
Inspect the relevant existing components and layouts before introducing new patterns.
Use the applicable repository skills for Inertia React and Tailwind development.

Preserve LubosMart branding, routes, authorization, authentication, data structures,
and business workflows. Reuse installed dependencies and shared components.
Keep unrelated work in the working tree intact. Work in reviewable batches and
validate changed code with ESLint, TypeScript, relevant tests, and a production build.
Record unresolved visual or requirements verification accurately; automated checks
alone do not establish WCAG compliance. Do not deploy or perform destructive actions
without explicit authorization.
