# Admin workspace

The admin workspace manages marketplace access, seller compliance, support, platform rates, and published content. This update is local; it has not been pushed or deployed.

## Functions

| Function | Page | Behavior |
| --- | --- | --- |
| Overview and notifications | `/dashboard/admin` | Live counts, oldest application queue, unread conversations, open complaints, blocked listings, and platform activity. |
| Registration review | `/reviews` | Inspect submitted information and private documents; approve or reject buyer, seller, courier, and sorting-center applications. Decisions queue an email. New buyers normally verify their email without submitting an application. |
| Account management | `/accounts` | Search and filter accounts, inspect profiles, and activate, suspend, or deactivate eligible accounts with a required audit reason. |
| Seller compliance | `/admin/compliance` | Find category mismatches, warn sellers, block or restore listings, and suspend sellers for violations. Reasons and history are retained. |
| Complaints and disputes | `/support?kind=complaint` | Review concerns and private evidence, communicate with involved parties, record an outcome, resolve, or reopen a case. |
| Messaging | `/support?kind=message` | Start an admin conversation using a recipient email or a parcel order number. Participants can reply through their Support page. |
| Commission | `/admin/commission` | Set the commission percentage and delivery fee. Defaults remain 10% and PHP 50; existing order snapshots do not change. |
| Reports | `/reports` | Filter completed parcels by delivery date and download sales or commission CSV reports. |
| Platform settings | `/admin/platform` | Create and edit announcements and policies, keep drafts private, publish, or withdraw content. Published announcements appear on the homepage. |
| COD operations | `/deliveries` | Inspect deliveries and reconcile cash handed over by sorting centers. |
| Own account and logout | `/settings/profile` and the user menu | Maintain account details and password; end the session. |

Admin can review couriers across centers. Sorting-center staff retain permission to review couriers assigned to their active centers.

Deactivation retains account and transaction records. Suspended or deactivated sellers cannot publish, appear in the public catalog, or receive new checkouts. Admin cannot deactivate their own account or activate an unapproved partner through account management. Blocked listings need admin clearance before a seller can republish them.

## Test locally

The new migrations have been applied to the local database. For another local checkout, run `php artisan migrate` before opening the new pages.

1. Start Laravel and Vite using the [local setup guide](../development/local-setup.md).
2. Sign in with the existing admin testing account. Credentials remain in the private local testing-account guide; password regeneration is unnecessary.
3. Open every page listed above and check navigation on desktop and mobile.
4. Submit a synthetic partner application using another account. Review it as admin, check the decision history, and check the notification in the configured mail transport.
5. Warn or block a synthetic seller listing. Verify the seller sees the review notice in Inventory and cannot republish a blocked listing. Restore it after correcting any category mismatch.
6. Open a complaint from a buyer account, optionally attaching JPG, PNG, or PDF evidence up to 5 MB. Reply as admin, then as a participant. Record a resolution and reopen the case. Unrelated users must not access the case or its evidence.
7. Start a general conversation from admin using a testing user's email. Verify it appears in that user's Support inbox and new replies appear in the admin attention count.
8. Publish a sample announcement and check the homepage and public announcements page. Unpublish it and confirm it disappears. Policies are available on `/platform-information`.
9. Change the commission rate, then verify a new order uses it while older order snapshots remain unchanged. Filter reports and download both CSV files.
10. Suspend or deactivate a testing account and verify access is denied, including an existing session. Restore eligible access through admin account management.

Only use synthetic data for these checks. Email delivery needs a configured mail provider and queue worker. Messaging is stored and refreshed through page navigation; it is not a live websocket chat service. Resolving a dispute records its outcome; it does not issue a refund or seller payout.

## Deployment notes

Two additive migrations introduce admin management tables, the deactivated account status, product blocking, and message-read tracking. Back up production data and apply these migrations in maintenance mode before exposing the new code. Do not roll them back on populated data: rollback removes moderation, conversation, evidence metadata, and platform-content records.

Your personal verified admin account will be configured separately later. Public registration still cannot create admin accounts. This update does not replace your account or provision a production administrator.

[Documentation index](../README.md) · [Deployment guide](deployment.md)
