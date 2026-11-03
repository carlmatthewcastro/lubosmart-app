# Admin approval and registration notifications

Verified locally on 2026-10-26. These changes have not been deployed to lubosmart.app.

Buyer, Seller, and Logistics accounts require Admin approval. Email verification confirms the email address; it does not approve the account. A complete, verified registration remains `pending`, shows the waiting-for-approval page, and cannot access its operational dashboard. Only a valid Admin decision grants approval. Rider review remains exclusively with the affiliated Logistics company.

## Admin queue and notification menu

- Submitted Buyer, Seller, and Logistics applications appear under **Registrations → Awaiting review** and in the notification count. Drafts, approved/rejected applications, and Rider applications are excluded.
- The notification menu lists the latest eight pending applications with the role and applicant/business label. Buyer uses the applicant name; Seller uses the store name; Logistics uses the company name. The total count includes all matching applications, including older pages.
- Each alert links to the correct application review. Unverified submissions say **Email verification pending**; review details remain readable, but approval controls stay unavailable until verification and the pending account state are valid. Server-side validation also rejects an attempted bypass.
- Admin notifications, the sidebar badge, and the open registration list refresh every five seconds while visible and online. Notification requests also refresh on focus/reconnection; their rate-limit bucket is separate from registration/review actions. Detail dialogs defer list refresh to preserve the review interaction.
- Approved/rejected records leave the pending notification feed. The existing decision email is sent after the decision is saved; mail failure cannot silently undo a valid approval.

`GET /admin/notifications` remains active-Admin-only and private/no-store. Its existing `permissions` and `badges` are preserved. It also returns `registrationCounts` for the three roles and `registrationAlerts` containing only review identifiers, role, label, verification state, and submission time. It exposes no private documents or identity numbers.

## Verification

- 415 related feature tests pass (3 existing manual/environment cases skipped), covering real registration, email verification, pending dashboard restrictions, all three Admin notifications/review rows, approval, alert removal, approval emails, and access control.
- The account-settings browser harness passes nine scenarios, including the three role alerts, mobile menu reflow, and opening the Seller review directly from its notification.
- TypeScript, targeted ESLint/Prettier, PHP Pint, and the production build pass. A read-only query check also passes on the configured local MySQL database.
- Tests do not grant approval to real accounts. No account status repair, production database update, push, merge, or deployment was performed.

For live testing, the applicant and Admin must both use **lubosmart.app**. An account registered there cannot appear in the separate localhost/XAMPP database. Deploy the reviewed release before expecting this notification behavior on the live site.
