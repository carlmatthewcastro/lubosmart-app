# Documentation

Product, development and operating guides for LubosMart.

[Project overview](../README.md) · [Website](https://lubosmart.app)

## Product and architecture

| Guide                           | Contents                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| [Workspaces](WORKSPACES.md)     | Buyer, Seller, Rider, Logistics and Admin responsibilities       |
| [Workflows](WORKFLOWS.md)       | Checkout, parcel custody, COD, settlements, returns and vouchers |
| [Architecture](ARCHITECTURE.md) | System structure, technology, access boundaries and database     |

## Development

| Guide                                      | Contents                                                           |
| ------------------------------------------ | ------------------------------------------------------------------ |
| [Setup and development](SETUP.md)          | Installation, local startup, configuration and Flutter connection  |
| [Frontend](FRONTEND.md)                    | React/Inertia.js conventions, shared components and source map     |
| [API integration](api/GUIDE.md)            | Authentication, response formats, retries and contract limitations |
| [Deployment and operations](DEPLOYMENT.md) | Production services, backups, release procedures and email checks  |

Run PHP, Composer, npm and Docker commands from `web/`; run Flutter commands from `mobile/`. Mobile UI development is paused pending a new Figma design; the [existing client](../mobile/README.md) remains an integration reference.

## Standards and references

- [Git workflow](standards/GIT_WORKFLOW_RULES.md): branches, commits, reviews and release authorization.
- [UI/UX standards](standards/UI_UX_RULES.md): branding, components, accessibility and frontend validation.
- [Registration field coverage](standards/REGISTRATION_REQUIREMENTS.md): supplied requirements and web/native enrollment distinctions.
- [Account-creation test workbook](standards/Blackbox_Test_Cases_Account_Creation-1.xlsx): existing test cases; recorded expectations need checking against current source.
- [Historical reviews](reviews/README.md): dated requirements, implementation reports and testing evidence.
- [Repository instructions](../.agents/PROJECT_INSTRUCTIONS.md): layout, working conventions and reusable skills.

Current guides describe repository behavior, not acceptance of a live installation. Dated reviews retain their original findings and limitations. API snapshots, missing original references and environment-specific acceptance are explained in the relevant guides.
