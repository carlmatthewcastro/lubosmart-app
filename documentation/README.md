# LubosMart documentation

[Website](https://lubosmart.app) · [Project overview](../README.md)

Choose a topic below. Start with **User flows** to understand the system or **Local setup** to run it on your computer.

## Product

Marketplace rules, product categories, and the requirements behind the system.

- [Business rules](product/business-rules.md) — COD, commission, and order policies.
- [Product categories](product/erp-categories.md) — Departments and subcategories.
- [Source requirements](product/source-requirements.md) — Reference documents and design assumptions.

## Accounts

Registration, verification, and approval.

- [Account approval and security](accounts/account-security.md) — Current status flow, admin approvals, Google linking, email codes, and transactional mail setup.

- [Registration and authentication](accounts/registration-authentication.md) — Roles, access, and account states.
- [Onboarding decisions](accounts/onboarding-design-decisions.md) — Signup and saved application progress.
- [Google sign-in](accounts/google-oauth.md) — OAuth configuration and troubleshooting.
- [Gmail SMTP on localhost](accounts/local-email-setup.md) — Private credentials, SMTP checks, queues, and verification links across devices.

## Design

- [User flows](design/ui-workflow.md) — Connected pages, role journeys, and the UI theme.

## Architecture

- [Database schema](architecture/core-schema-erd.md) — Relationships, snapshots, and migration notes.

## Development

- [Local setup](development/local-setup.md) — Installation, environment setup, and startup commands.
- [Testing workflow](development/testing-workflow.md) — Branches, checks, and local testing.
- [Coding guidelines](development/coding-guidelines.md) — Backend and frontend conventions.

## Operations

- [Admin workspace](operations/admin-workspace.md) — Functions, permissions, and a local testing checklist.
- [Deployment](operations/deployment.md) — Updating the Azure VM and Docker application.
- [Release checklist](operations/release-readiness.md) — Acceptance checks and recovery.
- [Sorting centers](operations/sorting-center.md) — Parcel custody and dispatch rules.

## Keeping guides current

Update the relevant guide when behavior changes. Mark planned features clearly. Private testing credentials remain in the local `storage/app/private/local-test-accounts.md` file and are excluded from GitHub.
