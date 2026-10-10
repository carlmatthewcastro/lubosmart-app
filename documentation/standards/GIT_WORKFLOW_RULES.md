# LubosMart Git workflow rules

This is the permanent source of truth for branching, commits, GitHub pushes, and
pull requests. Read it before any Git operation, including status/diff inspection,
branching, staging, committing, pushing, merging, or renaming branches.
For frontend work, also read [UI/UX rules](UI_UX_RULES.md).

## Branches

`main` is the stable production branch. Never commit or push directly to `main`,
or merge into it, without the user's explicit authorization. Deployment requires
separate authorization; a push or merge does not authorize deployment.

Use lowercase, descriptive names with hyphen-separated words:

| Prefix | Purpose | Example |
| --- | --- | --- |
| `feat/` | New features | `feat/buyer-order-tracking` |
| `fix/` | Bug fixes | `fix/checkout-validation` |
| `ui/` | UI/UX improvements | `ui/seller-dashboard-redesign` |
| `refactor/` | Internal improvements | `refactor/order-service` |
| `docs/` | Documentation | `docs/api-documentation` |
| `test/` | Automated tests | `test/auth-coverage` |
| `chore/` | Maintenance and configuration | `chore/ci-checks` |
| `hotfix/` | Urgent production fixes | `hotfix/checkout-failure` |

A branch represents logically related work, not a file or an individual commit.
Existing historical names do not need retroactive renaming.

## Before significant work

1. Inspect the current branch, tracking branch, staged/unstaged changes, untracked
   files, and relevant history. Identify unrelated work already present.
2. Identify the task category and affected modules. Reuse the current branch when
   its scope clearly fits; otherwise recommend a descriptive new branch name.
3. Recommend separate branches and pull requests for independent work. Explain
   the split and obtain approval before creating and pushing multiple independent
   branches. Never silently distribute uncommitted changes across branches.
4. Establish the intended base from the repository and task context. For work
   intended for `main`, use an appropriate reviewed base; dependent work may use
   its existing feature branch with the dependency explained. Do not assume a
   stale local `main` is current or change the base through an unapproved merge.
5. Do not switch branches if this could overwrite or disrupt pending changes.
   Do not automatically stash, discard, reset, or relocate another task's work.

When the current name is misleading, suggest a clearer name and explain why.
Never rename a shared or published branch without approval. Preserve history,
coordinate active pull requests, and never automatically delete the old remote
branch. Do not rewrite history without explicit authorization.

## Commits

Use Conventional Commits with a clear module scope:

```text
type(scope): short description
```

Examples:

```text
feat(auth): implement Sanctum token authentication
fix(checkout): prevent duplicate order submission
ui(seller): improve dashboard responsiveness
refactor(orders): extract checkout business logic
docs(api): document authentication endpoints
test(auth): add login endpoint coverage
chore(ci): update build configuration
```

`ui` is an accepted repository commit type for UI/UX work. `hotfix/` describes
branch urgency; a bug-fix commit on it still uses `fix(scope): ...`.
Mark breaking changes with `!` and explain them in the commit body.

Keep commits meaningful and focused. Group related files into one logical unit;
split unrelated work. Avoid a commit per minor edit and generic messages such as
"update files", "fix stuff", or "changes". Inspect the staged diff before committing.
Stage explicit paths or reviewed hunks; avoid blanket staging in a mixed working
tree. Review new files as well as tracked diffs, including generated artifacts.

Never commit populated `.env` files, secrets, tokens, credentials, or private keys.
Inspect the actual content being staged; an ignore rule alone is not proof that
sensitive information is excluded. Do not reveal credentials in command output.

## GitHub push workflow

When the user instructs Codex to push:

1. Read these rules, then inspect status, current/tracking branches, complete
   staged and unstaged diffs, and every relevant untracked file.
2. Identify logical commit groups, unrelated changes, and the intended destination.
   Explain the proposed groups and branch names before staging. Recommend a new
   branch or rename when appropriate; follow the approval rules above.
3. Run relevant checks for the work being committed. For frontend changes, use
   ESLint, TypeScript, formatting checks, relevant tests, and a production build.
   For backend changes, use relevant Laravel tests and PHP formatting checks.
   Documentation-only changes need content, links, and whitespace validation;
   they do not require rebuilding unchanged application code.
4. Stage only each logical group's paths or hunks, inspect the staged diff, and
   create descriptive Conventional Commits. Preserve unrelated pending changes.
5. Push to the appropriate feature branch and intended remote, setting upstream
   when needed. If a push is rejected, inspect the cause rather than force-pushing
   or rewriting history. Do not claim success without confirmation from Git.
6. Report the branch, commit hashes, and push result. Provide a pull request link
   when one exists. Do not imply a pull request was created or CI passed without
   verifying those results.

A general instruction to "push" authorizes committing and pushing the current
task's appropriate feature branch. It does not authorize merging, force-pushing,
deleting branches, unrelated changes, or deploying.

## Pull requests

Prefer focused pull requests that are easy to review and test. Include:

- A descriptive title and concrete summary of changed behavior.
- Affected modules and relevant testing results.
- Screenshots for significant UI changes; state when visual verification is blocked.
- Database migration notes and security considerations where applicable.
- Breaking changes, if any, and dependent branches when relevant.

Do not automatically merge a pull request. Obtain an explicit instruction before
merging into `main`.

## Safety and authorization

Never force-push, delete branches, reset/discard uncommitted changes, rewrite
existing history, or rename published/shared branches without explicit approval.
Never push unrelated local changes without first identifying them and obtaining
authorization for their inclusion. Preserve existing work even when a new task
requires a different branch. Pushing does not authorize deployment.

Setting up these rules alone does not authorize branch changes, staging, commits,
pushes, merges, renames, or deployment.

## Existing repository workflow

Reviewed 2026-10-11: branch history already uses descriptive feature/fix/docs
branches and mostly Conventional Commits; older unscoped messages and historical
names remain intact. These rules apply to future work, not history cleanup.

The existing GitHub Actions workflows run on pushes to `main`/`develop` and pull
requests targeting those branches. A feature-branch push alone does not trigger
these workflows. They provide build/test/lint jobs and do not deploy. Some current
lint steps modify files inside the CI checkout; their automatic commit step is
commented out. Do not describe CI as a branch-protection or commit-message
enforcement system. Remote protection settings were not verified during setup.

Sources: `.github/workflows/tests.yml`, `.github/workflows/lint.yml`, repository
branch/history inspection, and [deployment guide](../deployment/README.md).
