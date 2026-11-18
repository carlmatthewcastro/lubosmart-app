# Branch cleanup review - November 17, 2026

## Completed local cleanup

Following the user's explicit request to remove redundant branches, refreshed
remote references with `git fetch origin --prune` and rechecked ancestry and
worktree registrations. Removed the 25 local branches listed below with ordinary
`git branch -d`; every tip was contained in both `origin/main` and the current
branch. Local branch count decreased from 30 to 5.

Before deletion, created and verified the complete-history recovery bundle at
`storage/app/private/branch-backups/merged-local-branches-20261117-082812.bundle`.
The bundle remains local and ignored by Git.

Verified that HEAD (`803343e`) and the complete working-tree status were unchanged
after deletion. Kept `main`, `feat/platform-release-ui-onboarding`,
`docs/project-guides-standards`, `feat/admin-workspace-release`, and
`feat/api-sanctum-foundation`. Remote branches and worktree registrations were
preserved. No merge, force-push or deployment was performed.

The original review below records the earlier proposal and its historical state;
its pending-approval and no-deletion statements are superseded by this completion
record. Local branch deletion does not remove corresponding GitHub branches.

## Original review

Remote references were refreshed with `git fetch origin` without pruning.
Reviewed base: `origin/main` at `ba640af` (PR #28). The current branch,
`feat/platform-release-ui-onboarding` at `d829f8a`, is fully contained in that
base, one merge commit behind it. Local `main` is 82 commits behind the refreshed
remote and has no unique commits. It was not moved or merged.

## Preserve current work

The working tree already contained Rider Android source, tests, bundled fonts,
build helper, mobile documentation and two UI audit files. They remain in place.
This task updates the root README and adds this cleanup review only. No staging,
commit, branch switch, deletion, remote push or deployment was performed.

## Proposed local cleanup: 25 fully merged branches

Each tip below is an ancestor of the refreshed `origin/main`. Exclude `main`, the
current branch and every branch associated with a worktree. Approval is pending
for local deletion only; remote branches are outside this proposed cleanup.

| Local branch | Reviewed tip |
| --- | --- |
| `docs/admin-deployment` | `6805993` |
| `docs/deployment-guide` | `a4cb090` |
| `docs/onboarding-ui-workflow` | `59ab232` |
| `docs/organized-project-guides` | `7f49ce2` |
| `docs/project-handbook` | `2120065` |
| `docs/readme-refresh` | `c94821b` |
| `feat/account-admin-backend` | `3fe3626` |
| `feat/admin-account-ui` | `e2cb58e` |
| `feat/admin-dashboard` | `d574828` |
| `feat/admin-final-polish` | `4032dff` |
| `feat/checkout-commission` | `e7b8d19` |
| `feat/erp-category-taxonomy` | `1fbb546` |
| `feat/local-admin-credentials` | `3ddb14e` |
| `feat/local-development-fixes` | `5aeb54a` |
| `feat/logistics-workspace` | `3c39dc0` |
| `feat/lubosmart-homepage-auth` | `6bd0d73` |
| `feat/registration-logistics-schema` | `b7a9771` |
| `feat/registration-marketplace-workflows` | `e56e1a2` |
| `feat/responsive-marketplace-ui` | `fc67268` |
| `feat/ui-ux-standards` | `3c39dc0` |
| `feature/marketplace-database-schema` | `ec4d172` |
| `fix/admin-account-visibility` | `042a31f` |
| `fix/inertia-page-path` | `df07eee` |
| `fix/light-theme` | `53457e8` |
| `ui/application-ux-standards` | `2340274` |

After explicit approval, re-fetch and verify every tip, ancestry and worktree
association before deleting any branch. Retain a verified local Git bundle of
the candidate refs before deletion. Use ordinary `git branch -d` with explicit
names; stop and investigate refusals rather than using `-D`. The recorded tips
are a snapshot, not permission to delete branches that have since changed.

## Retain and review

| Branch or reference | Reason |
| --- | --- |
| `main` | Stable production branch; local tip is stale. Updating it is a separate action. |
| `feat/platform-release-ui-onboarding` | Current branch; carries pending uncommitted Rider work. |
| `docs/project-guides-standards` | One commit outside `origin/main`; also registered to another worktree. |
| `feat/admin-workspace-release` | One commit outside `origin/main`; no upstream configured. |
| `feat/api-sanctum-foundation` | Five commits outside `origin/main`; no upstream configured. |
| `origin/ui/storefront-home-refresh` | Remote-only reference with two commits outside `origin/main`. |

Unmerged history may duplicate later source changes, but ancestry alone cannot
establish that. Review differences before making a separate cleanup decision.
The docs worktree is reported as prunable because its gitdir path is missing;
its registration and branch were preserved. No worktree pruning was performed.

All other fetched remote branch tips are contained in `origin/main`; that does
not establish that collaborators have stopped using them. Remote deletion needs
a separate exact list and explicit approval.

## Verification and limits

The review used branch ancestry, unique-commit counts, worktree registrations and
working-tree status after fetching. Documentation links and changed-line
whitespace were checked for this documentation task. Application tests were not
rerun; prior test/build results remain historical evidence. Branch consolidation
does not establish deployment readiness or complete the outstanding physical
Rider camera, QR, proof and delivery/return acceptance checks.

See [Git workflow rules](standards/GIT_WORKFLOW_RULES.md) and the
[project README](../README.md).
