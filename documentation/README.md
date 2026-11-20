<div align="center">

# Documentation

**One place for the product, implementation and operating guides.**

[Home](../README.md) · [Documentation](README.md) · [Website](https://lubosmart.app)

</div>

---

## Start here

LubosMart’s Web platform is implemented. These guides describe its current behavior, shared Laravel backend and separate Flutter client. Choose a guide by the task you need to complete.

| If you need to…               | Read                                       | What it covers                                                        |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Understand the product        | [Project overview](../README.md)           | Website features, technology and a local starting point               |
| Understand a role             | [Workspaces](WORKSPACES.md)                | Buyer, Seller, Rider, Logistics and Admin in one guide                |
| Follow an order or refund     | [Workflows](WORKFLOWS.md)                  | Checkout, scanning, COD, Lubos Coins, returns, vouchers and approvals |
| Find backend or database code | [Architecture](ARCHITECTURE.md)            | System map, technology, access boundaries and data model              |
| Find or edit a screen         | [Frontend](FRONTEND.md)                    | React/Inertia.js pages, shared components and source locations        |
| Install or run locally        | [Setup and development](SETUP.md)          | Web, Mobile, shared API and environment configuration                 |
| Integrate an API client       | [API guide](api/GUIDE.md)                  | Tokens, response formats, retries, coverage and contracts             |
| Operate an installation       | [Deployment and operations](DEPLOYMENT.md) | Production services, releases, backups and transactional mail         |

## How to use these guides

1. Use the current guides above for implemented Web behavior. Assignment, custody, delivery, reconciliation and payout remain separate business events.
2. Run PHP, Composer, npm and Docker commands from <code>web/</code>; run Flutter commands from <code>mobile/</code>, unless a historical report explicitly records an older command.
3. Use a dedicated test installation for experiments. Preserve application keys, customer data and private uploads.
4. Read dated reviews as evidence from their review date. They do not replace the current workflow or certify live infrastructure and physical-device acceptance.

## API references

| Reference                                                                                    | Purpose                                                                            |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [API guide](api/GUIDE.md)                                                                    | Authentication, boundaries, responses and safe writes                              |
| [Endpoint inventory](api/ENDPOINTS.md)                                                       | Documented operations and middleware                                               |
| [Mobile role coverage](api/ROLE_COVERAGE.md)                                                 | Buyer, Seller and Rider native coverage                                            |
| [Mobile connection](api/MOBILE_CONNECTION_GUIDE.md)                                          | Test networking, sessions, retries and uploads                                     |
| [Finance API additions](api/FINANCE_2026_11_11.md)                                           | Dated finance changes and superseding return/refund repair                         |
| [OpenAPI](api/openapi.json) · [Postman collection](api/lubosmart-v1.postman_collection.json) | Generated integration snapshots; later finance additions are documented separately |

## Project standards

| Standard                                                                             | Applies to                                                                             |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [Git workflow](standards/GIT_WORKFLOW_RULES.md)                                      | Branches, commits, reviews, pushes and release authorization                           |
| [UI/UX](standards/UI_UX_RULES.md)                                                    | LubosMart identity, full supported Tailwind design tools, components and accessibility |
| [Registration requirements](standards/REGISTRATION_REQUIREMENTS.md)                  | Registration field coverage and the supplied reference                                 |
| [Agent instructions](../.agents/PROJECT_INSTRUCTIONS.md)                             | Repository layout, task skills and working conventions                                 |
| [Account-creation test cases](standards/Blackbox_Test_Cases_Account_Creation-1.xlsx) | Existing black-box test workbook                                                       |

Automated tests remain in the application source. Development snapshots, browser artifacts and completed build logs belong in the ignored root <code>.tools/development-artifacts/</code> directory. Laravel <code>web/storage/</code> remains reserved for application and runtime data.

## Reviews and implementation history

These reports retain their original requirements, commands, paths, results and acceptance limits. Earlier implementation gaps are historical; current role, scanning and finance guides describe the completed Web behavior.

| Date              | Review                                                                          | Read it for                                                                  |
| ----------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| October 15, 2026  | [Core requirements baseline](reviews/CORE_WORKFLOWS_2026_10_15.md)              | Original requirements, proposed scanning flow and unchecked acceptance items |
| October 15, 2026  | [Logistics workspace](reviews/LOGISTICS_WORKSPACE_2026_10_15.md)                | Historical navigation, entry points and validation record                    |
| November 14, 2026 | [Marketplace redesign](reviews/MARKETPLACE_REDESIGN_2026_11_14.md)              | Visibility decisions, responsive layout changes and recorded checks          |
| November 14, 2026 | [Marketplace reference refinement](reviews/MARKETPLACE_REFERENCE_2026_11_14.md) | Reference follow-up, catalog treatment and browser evidence                  |
| November 20, 2026 | [Performance and motion](reviews/PERFORMANCE_MOTION_2026_11_20.md)              | Local loading observations, animation changes and verification limits        |

<details>
<summary>Where the former guides are now</summary>

| Former category                                               | Consolidated guide                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Architecture, technology, backend and database READMEs        | [Architecture](ARCHITECTURE.md)                                           |
| Frontend README and code map                                  | [Frontend](FRONTEND.md)                                                   |
| Five separate role READMEs                                    | [Workspaces](WORKSPACES.md)                                               |
| Workflow index and individual business workflow guides        | [Workflows](WORKFLOWS.md)                                                 |
| Setup index, Web, development, Flutter and environment guides | [Setup and development](SETUP.md)                                         |
| Deployment README and mail verification                       | [Deployment and operations](DEPLOYMENT.md)                                |
| API README                                                    | [API guide](api/GUIDE.md)                                                 |
| Dated audits and historical standards                         | [Reviews and implementation history](#reviews-and-implementation-history) |

</details>

## Documentation decisions and verification

The retained records identify the following points to reconcile or confirm. These are documentation and acceptance questions, not a list of unimplemented Web features.

| Topic                                 | Recorded difference or missing evidence                                                                      | Next decision or verification                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Role identifiers                      | Older records use <code>courier</code>, <code>sorting_center</code> and older dashboard routes               | Confirm legacy aliases before refreshing historical technical descriptions                     |
| Returns and scanning                  | Older proposals and API tables differ from version-3 returns and three forward checkpoints                   | Use the current workflow contract; preserve the dated records as history                       |
| API snapshots                         | The inventory records 82 operations; later finance additions are documented separately                       | Review and regenerate integration snapshots as a separate contract update                      |
| Google enrollment                     | Web reference and native API descriptions differ on password collection                                      | Confirm the intended distinction between enrollment flows                                      |
| Historical paths and Windows commands | Older records use <code>storage/app</code>, pre-split paths or the combined Composer dev command             | Use current artifact locations and application working directories; retain historical evidence |
| Location data                         | Account settings records no supplied vetted PSGC/postal crosswalk                                            | Confirm the authoritative dataset and its import status                                        |
| Acceptance                            | Live inbox, infrastructure, physical-device, accessibility and performance evidence is installation-specific | Add newer dated evidence when available                                                        |
| Source references                     | Some reports mention unlinked handoff/restoration records; no official SRS is identified                     | Supply authoritative document locations                                                        |

---

<div align="center">

**LubosMart** · Documentation · [Documentation](README.md)

</div>
