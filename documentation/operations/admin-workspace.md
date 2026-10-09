# Admin workspace

The admin workspace uses grouped navigation, a light theme, categorized attention notifications, and account/registration/conversation detail modals. Activity history uses account names and action choices instead of requiring account IDs.

The admin workspace manages marketplace access, seller compliance, support, platform rates, and published content. This update is local; it has not been pushed or deployed.

## Functions

| Function | Page | Behavior |
| --- | --- | --- |
| Overview and notifications | `/dashboard/admin` | Live counts, oldest application queue, unread conversations, open complaints, blocked listings, and platform activity. |
| Registration review | `/reviews` | Inspect submitted information and private documents. Admin approves or rejects buyers, sellers, and sorting centers, with courier override available. Each approved sorting center reviews its own couriers. Decisions queue an email. |
| Account management | `/accounts` | Search and filter accounts, inspect profiles, and activate, suspend, or deactivate eligible accounts with a required audit reason. |
| Seller compliance | `/admin/compliance` | Find category mismatches, warn sellers, block or restore listings, and suspend sellers for violations. Reasons and history are retained. |
| Complaints and disputes | `/support?kind=complaint` | Review concerns and private evidence, communicate with involved parties, record an outcome, resolve, or reopen a case. |
| Messaging | `/support?kind=message` | Start a conversation in a modal by choosing an approved recipient or order participants, then selecting a topic. Participants can reply through their Support page. |
| Commission | `/admin/commission` | Edit commission (0-100%, up to two decimal places) with a calculation preview and confirmation. New orders snapshot the percentage; existing orders keep their original rate. Commission amounts are calculated on delivery. Shipping fees are outside the admin controls. |
| Reports | `/reports` | Filter completed parcels by delivery date and download sales or commission CSV reports. |
| Platform settings | `/admin/platform` | Create and edit announcements and policies, keep drafts private, publish, or withdraw content. Published announcements appear on the homepage. |
| COD operations | `/deliveries` | Inspect deliveries and reconcile cash handed over by sorting centers. |
| Own account and logout | `/settings/profile`, `/settings/password`, and the user menu | Edit the admin display name and change the password; the sign-in email is read-only and contact numbers are omitted. End the session from the user menu. |

Admin can inspect and override courier decisions across centers and suspend accounts for compliance. Each approved sorting center reviews and deactivates only its own couriers. Admin handles suspension and reactivation. All approved, verified admins have the same access; there are no sub-admin roles. Activity history is retained for accountability, with the read-only audit page at `/admin/audit-log`. See [Account approval and security](../accounts/account-security.md) for the current rules.

Deactivation retains account and transaction records. Suspended or deactivated sellers cannot publish, appear in the public catalog, or receive new checkouts. Admin cannot deactivate their own account or activate an unapproved partner through account management. Blocked listings need admin clearance before a seller can republish them.

Admin accounts can use email and password without Google sign-in. Keep an accessible sign-in email for password recovery and your current password plus an email security code for password changes. Name edits do not require a code. The server rejects admin email and contact-number changes through profile settings. Existing contact values are retained in storage but are not shown in admin settings.

Local testing accounts and live accounts belong to their respective databases. Starting or restarting `php artisan serve` does not recreate accounts. The account migrations preserve existing administrators, passwords, and verification; keep the existing live database when deploying updates.

## Test locally

The new migrations have been applied to the local database. For another local checkout, run `php artisan migrate` before opening the new pages.

1. Start Laravel and Vite using the [local setup guide](../development/local-setup.md).
2. Sign in with the existing admin testing account. Credentials remain in the private local testing-account guide; password regeneration is unnecessary.
3. Open every page listed above and check navigation on desktop and mobile.
4. Submit a synthetic partner application using another account. Review it as admin, check the decision history, and check the notification in the configured mail transport.
5. Warn or block a synthetic seller listing. Verify the seller sees the review notice in Inventory and cannot republish a blocked listing. Restore it after correcting any category mismatch.
6. Open a complaint from a buyer account, optionally attaching JPG, PNG, or PDF evidence up to 5 MB. Reply as admin, then as a participant. Record a resolution and reopen the case. Unrelated users must not access the case or its evidence.
7. Start a general conversation from admin using a testing user's email. Verify it appears in that user's Support inbox and new replies appear in the admin attention count.
8. In Platform Settings, create an announcement or policy in the modal editor. Preview it, save a draft, and check the Content Type and Visibility filters. Publish it and check the public page (and homepage for announcements). Save it as a draft again and confirm it disappears publicly. Policies are available on `/platform-information`.
9. Change commission, then verify new orders use the new percentage while existing orders retain their recorded rates. Delivery fees are not editable from admin. Commission amounts are calculated when delivered. Filter reports and download both CSV files.
10. Suspend or deactivate a testing account and verify access is denied, including an existing session. Restore eligible access through admin account management.

Only use synthetic data for these checks. Email delivery needs a configured mail provider and queue worker. The floating Messages panel is available from the navbar or bottom-right launcher on admin pages. Open it to read conversations, send replies, or start a new conversation without leaving the current page. The panel refreshes every 30 seconds while open and visible; it does not use websockets. The full inbox provides attachments and case actions. Resolving a dispute records its outcome; it does not issue a refund or seller payout.

## Deployment notes

Two additive migrations introduce admin management tables, the deactivated account status, product blocking, and message-read tracking. Back up production data and apply these migrations in maintenance mode before exposing the new code. Do not roll them back on populated data: rollback removes moderation, conversation, evidence metadata, and platform-content records.

Your personal verified admin account will be configured separately later. Public registration still cannot create admin accounts. This update does not replace your account or provision a production administrator.

[Documentation index](../README.md) · [Deployment guide](deployment.md)

## Frontend organization and commission controls

The admin homepage is `resources/js/pages/admin/dashboard.tsx`. Admin-only messaging and toolbar components live in `resources/js/components/admin`. Shared account and application-review screens live in `pages/management`, registration completion in `pages/onboarding`, public homepage and content in `pages/public`, and non-admin dashboards in `pages/workspace`. Existing browser URLs are unchanged. Blade in `resources/views` contains the Inertia shell and mail templates; interactive pages are React.

Admin commission settings accept only the commission percentage. Attempts to submit `shipping_fee_per_seller_order` are rejected and leave the settings unchanged. The existing delivery-fee calculation remains in checkout until a separate logistics pricing workflow is designed. No logistics fee editor is introduced in this change.
