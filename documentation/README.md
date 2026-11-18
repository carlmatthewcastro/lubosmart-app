# LubosMart documentation

Use the current guides below for navigation and operating rules. Current identifies the maintained guide for a topic; it does not certify live deployment or a fresh test pass. Dated execution evidence is indexed separately in the archive.

| Area | Current entry point | Contents |
| --- | --- | --- |
| Setup | [Local setup](setup/README.md) | Laravel/web, Flutter and environment variables |
| Architecture | [Architecture and repository map](architecture/README.md) | System diagram, source layout, stack, frontend/backend, database and API links |
| Workflows | [Workflow index](workflows/README.md) | Role guides, orders, scanning/POD, finance, returns/refunds and vouchers |
| Testing | [Testing and acceptance](testing/README.md) | Black-box guide, checklists, result templates and dated evidence |
| Deployment | [Deployment and backup runbook](deployment/README.md) | Existing Azure/Docker procedures, persistence and recovery precautions |
| Archive | [Historical records](archive/README.md) | Dated audits, repairs, handoffs, implementation and verification history |

## Standards and compatibility

- [Git workflow rules](standards/GIT_WORKFLOW_RULES.md) and [UI/UX rules](standards/UI_UX_RULES.md) remain at their established paths.
- [Registration requirements](standards/REGISTRATION_REQUIREMENTS.md), [core workflow requirements](standards/CORE_WORKFLOWS_AND_SCANNING_REQUIREMENTS.md) and [Logistics workspace specification](standards/LOGISTICS_WORKSPACE.md) preserve requirements context. Older implementation statements must be read alongside the current workflow guides.
- Role-specific guides remain under `functions/`; technical guides remain under `tech-stack/`, `front-end/`, `backend/`, `database/` and `api/`. These useful existing folders are linked rather than relocated.
- The [Android setup record](api/ANDROID_SETUP_2026_11_05.md) retains its script-referenced path. Generated API contracts and their generator remain unchanged.
- Requirements workbooks and their historical evidence remain under `standards/` and `requirements/`. See the [archive index](archive/README.md#records-retained-at-existing-paths).

## Evidence and unresolved claims

This cleanup uses repository source inspection and read-only local link checks. No application tests, builds, migrations, seeders, production connections or live checks were performed. Older test totals, SDK paths, migration statements and deployment reports describe their original dates, not current acceptance. See the [cleanup review record](DOCUMENTATION_CLEANUP_2026_11_17.md) for scope and validation.

The archived frontend handoff describes a former shared branch; use the Git rules for new work. The existing [branch cleanup review](BRANCH_CLEANUP_2026_11_17.md) is a proposal, not permission to delete branches.

[Project README](../README.md)
