# Admin approval and registration notifications

Buyer password signup activates after email verification. Buyer review statements below apply to applications that still require review, such as legacy onboarding. See the [Buyer guide](../functions/buyer/README.md).

Seller, Logistics and review-required Buyer applications require Admin approval. Email verification confirms the email address; it does not approve the account. A complete, verified registration remains `pending`, shows the waiting-for-approval page, and cannot access its operational dashboard. Only a valid Admin decision grants approval. Rider review remains exclusively with the affiliated Logistics company.

## Admin queue and notification menu

- Submitted Buyer, Seller, and Logistics applications appear under **Registrations → Awaiting review** and in the notification count. Drafts, approved/rejected applications, and Rider applications are excluded.
- The notification menu lists the latest eight pending applications with the role and applicant/business label. Buyer uses the applicant name; Seller uses the store name; Logistics uses the company name. The total count includes all matching applications, including older pages.
- Each alert links to the correct application review. Unverified submissions say **Email verification pending**; review details remain readable, but approval controls stay unavailable until verification and the pending account state are valid. Server-side validation also rejects an attempted bypass.
- Admin notifications, the sidebar badge, and the open registration list refresh every five seconds while visible and online. Notification requests also refresh on focus/reconnection; their rate-limit bucket is separate from registration/review actions. Detail dialogs defer list refresh to preserve the review interaction.
- Approved/rejected records leave the pending notification feed. The existing decision email is sent after the decision is saved; mail failure cannot silently undo a valid approval.

`GET /admin/notifications` remains active-Admin-only and private/no-store. Its existing `permissions` and `badges` are preserved. It also returns `registrationCounts` for the three roles and `registrationAlerts` containing only review identifiers, role, label, verification state, and submission time. It exposes no private documents or identity numbers.

## Environment

For live testing, the applicant and Admin must both use **lubosmart.app**. An account registered there cannot appear in the separate localhost/XAMPP database. Check the deployed revision separately before expecting this behavior on the live site.
