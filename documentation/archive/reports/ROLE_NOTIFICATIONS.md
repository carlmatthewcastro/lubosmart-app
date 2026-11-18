> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Role-based notifications implementation report

Implemented locally on 2026-11-10. The additive migration was applied after verifying the local environment and local database connection. No deployment, commit, branch change, or production-data migration was performed.

## Existing system analysis

- Laravel 12, Inertia 2, React 19, Tailwind 4, Radix/Headless UI, and SWR are already installed. Pages live in `resources/views/pages`, not the starter kit's default path.
- `User` already uses Laravel `Notifiable`. Existing notification classes deliver verification, application decisions, account changes, compliance notices, and delivery updates through mail. They remain intact.
- Previous `/admin/notifications`, `/seller/notifications`, `/rider/notifications`, and `/logistics/notifications` endpoints return operational queue counts. They do not store messages or read state. These endpoints remain available. The redundant header queue dropdowns and their polling were removed at the user's request; dashboard counts and sidebar destinations remain.
- Persistent database notifications did not exist. No configured broadcasting/Echo/Reverb infrastructure was found. The new inbox uses 30-second polling with the installed SWR library.
- Actual roles are `buyer`, `seller`, `rider`, `logistics`, and `admin`. Pickup and delivery are stages/assignments of one rider role. Logistics recipients are limited to approved operators of the parcel's operational center.
- Orders split into store-specific `SellerOrder` parcels. Preparation uses `processing` and `shipped`; there is no separate seller-confirmed status. Checkout already has an idempotent checkout key and transaction locks.
- `DeliveryController` owns authorized parcel transitions, custody evidence, COD collection, logistics cash receipt, discrepancies, and platform reconciliation. `parcel_events` records those operations and request keys. Assignment uses `AssignParcelRider`.
- Returns have requested, approved/rejected, assigned, collected, received, closed, and refunded states. Admins decide returns; sellers confirm physical receipt. Refunds and seller payouts record existing manual payments; neither initiates bank transfers.
- The mobile app uses versioned Sanctum endpoints and role-scoped token abilities. New endpoints use the same token middleware. Existing request and response contracts are preserved.

## Backend design and safety

`WorkflowNotificationObserver` handles Eloquent creation and changed-state events. `ParcelNotifications` runs after a successful delivery transition and audit event, inside the existing transaction. The inbox service persists Laravel `DatabaseNotification` models through the user's `notifications()` relation and the notification's `toDatabase()` payload.

Database-only delivery is synchronous and atomic with its business transaction. A rollback removes the business change, its audit event, and its inbox messages. There is no external delivery before commit. Existing queued mail keeps its existing after-commit behavior. Database inbox delivery deliberately does not depend on mail queue availability or email/SMS preferences.

Notification IDs are deterministic per recipient, event name, and event key. Creation uses model IDs; delivery transitions use parcel-event IDs; checkout stock alerts use order/product IDs. Replayed event delivery finds the existing primary key instead of inserting another notification. Observer updates only dispatch for changed relevant attributes; real repeated transitions receive a new event key. Existing business locks, request keys, and status guards remain responsible for accepting or rejecting an operation.

Bulk cancellation now updates the already-locked parcels individually so their real cancellation transitions reach the observer. Checkout's conditional stock decrement remains unchanged; stock alerts are evaluated once against each product's final stock inside the checkout transaction. Repeated held/failed-attempt states and unchanged cash discrepancies do not generate more messages.

Queries always start from the authenticated user's relation. Read-one uses an owned lookup and returns 404 for someone else's ID. Read-all updates only owned unread rows. Links are resolved from fixed server-side routes and current record ownership, role, center, assignment, and relevant task state. Missing or inaccessible records have no link. Clicking a link only navigates to a review page; all business actions retain their existing authorization and state checks.

History defaults to 15 rows, preview to 5, and API page sizes are capped at 50. Indexes cover ownership, unread count, category history, and stable timeline ordering. Related records and COD states are loaded in batches for the current page. A regression test checks that 15 distinct parcel links need at most three related-record queries.

## Complete event-to-recipient matrix

`Action` describes the category at event creation. It is retained as history; current links and `requires_action` are recalculated. Completed tasks display “Task completed or changed” and “View update.”

| Event identifier | Actual trigger | Recipients | Action |
| --- | --- | --- | --- |
| `account.registered` | Email verification completed | Account owner | No |
| `account.{status}` | Account status changed, including approval/rejection | Account owner | No |
| `account.security` | Password/email changed | Account owner | No |
| `application.submitted` | Buyer/seller/logistics application submitted or resubmitted | Approved admins with registration permission | Review application |
| `order.placed` | Store parcel created by checkout | Buyer | No |
| `order.new` | Store parcel created by checkout | Owning seller | View order |
| `order.processing` | Seller starts preparation | Buyer | No |
| `order.shipped` | Seller marks parcel ready for pickup | Buyer | No |
| `order.cancelled` | Buyer cancels pending order | Buyer and each parcel's seller | No |
| `pickup.pending` | Parcel becomes ready with an identified center | That center's logistics operators | Review parcel/assign pickup |
| `assignment.pickup` | Logistics assigns pickup | Assigned pickup rider | View assignment |
| `pickup.scheduled` | Pickup assignment recorded | Seller | No |
| `assignment.delivery` | Logistics prepares delivery assignment | Assigned delivery rider; message includes stored parcel COD total | View assignment |
| `assignment.removed` | Assignment changes to another rider | Previous rider | No; inaccessible link removed |
| `delivery.picked_up` | Rider confirms physical collection | Buyer and seller | No |
| `delivery.receive` | Center records parcel receipt | Buyer | No |
| `delivery.damaged` | Center records damaged receipt | Center operators and admins with operations permission | Investigate parcel |
| `delivery.out_for_delivery` | Rider starts delivery | Buyer | No |
| `delivery.failed_attempt` | Rider records failed delivery | Buyer | No |
| `delivery.delivered` | Delivery proof and full COD accepted | Buyer and seller | No |
| `logistics.claim`, `logistics.approve_pickup` | Center claims/approves pickup | Center operators | Assign pickup |
| `logistics.sort` | Sorting completed | Center operators | Assign delivery |
| `logistics.failed_attempt`, `logistics.hold`, `logistics.return_to_center`, `logistics.receive_return` | Supported exception/custody transition | Center operators | Review parcel |
| `exception.failed_attempt`, `exception.hold`, `exception.return_to_center` | Exception needs rider follow-up | Current rider | View assignment |
| `logistics.delivered` | Delivery and COD collection completed | Center operators | Review pending cash handover |
| `cod.recorded` | COD collection officially inserted | Buyer; exact recorded collection amount | No |
| `cod.pending` | COD collection officially inserted | Collecting rider; exact recorded amount | Review cash handover |
| `cod.receive_cod` | Logistics records cash handover | Rider and center operators (update); operations admins (reconcile task) | Admin reconciliation |
| `cod.cod_discrepancy` | Logistics records a changed cash discrepancy | Rider (update), center operators and operations admins (task) | Review discrepancy |
| `cod.reconcile_cod` | Admin reconciles verified full receipt | Rider and center operators | No |
| `cod.verified` | COD reconciliation completed | Seller | No |
| `return.requested` | Buyer creates return | Buyer and seller | No; seller is informed, admin owns decision |
| `return.review` | Return created | Admins with disputes permission | Review return |
| `return.approved`, `return.rejected` | Admin finalizes decision | Buyer and seller | No |
| `return.assign` | Return approved | Responsible center's operators | Arrange return pickup |
| `return.assigned` | Return rider assigned/reassigned | Buyer and seller | No |
| `return.assignment` | Return rider assigned/reassigned | Assigned return rider | Review return pickup |
| `return.reassigned` | Return assignment moves to another rider | Previous rider | No |
| `return.collected` | Return rider confirms collection | Buyer (update), seller (receipt task) | Seller confirms receipt |
| `return.received` | Seller confirms returned parcel receipt | Buyer, seller, center operators | No |
| `return.closed`, `return.refunded` | Admin records supported closure/manual refund | Buyer and seller | No |
| `settlement.recorded` | Manual seller payout inserted | Seller; stored payout amount | No |
| `stock.low` | Product moves from above 5 units to 1–5 | Owning seller | Review stock |
| `stock.empty` | Product moves from positive stock to zero | Owning seller | Review stock |
| `support.complaint` | Complaint case created | Admins with messages permission | Review case |

Platform admins do not receive successful-order/delivery notices. Routine internal transit, label printing, bin changes, and notification reads do not create inbox messages. Cart/wishlist/profile actions remain temporary feedback.

## UI implementation

- Shared notification bell in all five authenticated operational toolbars, with unread badge and polite unread-count announcement.
- Headless UI popover provides desktop preview, viewport-constrained mobile width, keyboard navigation, Escape dismissal, and focus restoration. Its content scrolls within 70% of the dynamic viewport height.
- Preview and dedicated `/notifications` page share categories, contextual icons, text descriptions, unread distinction, timestamps, read controls, empty/loading/error states, and authorized links. Full history is paginated.
- SWR polls count and mounted lists every 30 seconds, pauses interval refresh while hidden/offline, deduplicates requests, and stops component timers on unmount. Focus/reconnection revalidates. Read mutations revalidate mounted inbox/count caches.
- The notification bell is the header's notification entry point. Redundant work-queue dropdowns/checklist icons were removed across all roles. Operational queues remain accessible through dashboards and sidebar navigation.
- Existing feedback provider now supports success/error/warning/information icons, close buttons, live status/alert roles, four-second normal dismissal, ten-second error dismissal, and suppression of repeated identical messages within four seconds. Login announces “Welcome back!” Admin mutations with server status messages also use the shared toast host.
- Desktop toasts sit at the upper right below the header. Mobile toasts sit above bottom navigation. A browser test caught and prompted correction of a toast that initially covered the bell.
- Existing purple/lavender tokens, typography, rounded surfaces, Inertia navigation, validation, and business action forms are preserved.

## Routes and mobile API

Web routes use session authentication, verification, active-account checks, CSRF protection for mutations, and throttling. Mobile routes use Sanctum, `mobile.token`, current-role token abilities, active-account checks, and the existing mobile rate limiter.

| Method | Web | Mobile |
| --- | --- | --- |
| GET | `/notifications` | `/api/v1/notifications` |
| GET | `/notifications/unread-count` | `/api/v1/notifications/unread-count` |
| PATCH | `/notifications/{uuid}/read` | `/api/v1/notifications/{uuid}/read` |
| PATCH | `/notifications/read-all` | `/api/v1/notifications/read-all` |

List parameters: `category=all|action_required|updates`, `page>=1`, and `per_page=1..50`. Web requests with `Accept: application/json` and mobile list requests return JSON. Responses include `notifications` (Laravel pagination), `unread_count`, and `category`. Each entry includes event/title/message, kind/category/priority, `requires_action`, ISO timestamps, related type/ID, and nullable authorized URL/action label. Responses use `Cache-Control: private, no-store`. Mobile clients can map `related` to native screens; provided URLs are authenticated web destinations, not bearer-token URLs.

## Files created

- `app/Notifications/WorkflowNotification.php`
- `app/Observers/WorkflowNotificationObserver.php`
- `app/Services/Notifications/NotificationInbox.php`
- `app/Services/Notifications/ParcelNotifications.php`
- `app/Http/Controllers/NotificationInboxController.php`
- `database/migrations/2026_11_10_000000_create_notifications_table.php`
- `resources/views/components/shared/notification-inbox.tsx`
- `resources/views/pages/notifications/index.tsx`
- `tests/Feature/Notifications/NotificationInboxTest.php`
- `tests/Fixtures/notification-browser-seed.php`
- `tests/Frontend/notifications-browser-check.cjs`
- `documentation/archive/reports/ROLE_NOTIFICATIONS.md`
- `documentation/archive/ui-audits/NOTIFICATION_UI_AUDIT.md`

## Files modified

- `app/Actions/Checkout/CreateOrderFromCart.php` — final stock-threshold integration.
- `app/Http/Controllers/DeliveryController.php` — successful parcel-event notification integration and unchanged cash-discrepancy detection.
- `app/Http/Controllers/OrderController.php` — observable cancellation updates on locked parcels.
- `app/Http/Controllers/ParcelReturnController.php` — applies the existing parcel parameter to returned history as well as eligible return selection.
- `app/Providers/AppServiceProvider.php` — registers model observers.
- `routes/web.php`, `routes/api.php` — shared inbox routes.
- `resources/views/components/admin/toolbar.tsx` — shared bell, admin success toasts, and removal of the redundant queue dropdown/polling.
- `resources/views/components/logistics/logistics-toolbar.tsx` — shared bell and removal of redundant queue dropdowns/polling for logistics, riders, and sellers.
- `resources/views/components/workspace/workspace-toolbar.tsx` — shared buyer bell and removal of the redundant queue dropdown.
- `resources/views/components/shared/action-feedback.tsx` — toast variants, placement, timing, deduplication.
- `resources/views/pages/auth/login.tsx` — successful login toast.

The pre-existing list-filter, shared marketplace UI, dashboard browser test, page-filter, and UI audit changes remain separate pending work. No dependencies were added. Build assets are generated/ignored artifacts.

## Validation

- Full backend run during implementation: **1,161 passed, 3 skipped, 9,301 assertions**. This run preceded the final inbox tests and subsequent small refinements; it is not represented as a final full-suite run.
- Final focused backend regression run: **123 passed, 1,465 assertions**, covering inbox, settlement/returns, logistics workspace, mobile role parity, and transactional mail.
- Final standalone inbox run: **17 passed, 104 assertions**.
- Targeted ESLint, TypeScript (`tsc --noEmit`), Prettier, PHP Pint, production Vite build, and Git whitespace checks passed.
- Isolated Chrome acceptance: all five roles passed preview, focus restoration, categories, pagination, read actions, 320px/768px reflow, live polling, and toast deduplication. Zero uncaught browser exceptions. Screenshots were inspected for desktop preview and narrow light/dark surfaces; this is not a contrast or screen-reader audit.
- Tests cover ownership, category validation, bounded pagination, stable read timestamps, unread counts, idempotent delivery, unchanged saves, rolled-back transitions, missing related records, reassigned rider links, exact stored COD amounts, failed delivery validation, successful delivery/COD, discrepancy deduplication, reconciliation, returns, payouts, threshold alerts, admin recipient selection, batched link queries, and all five mobile role tokens.
- Browser checks use a fresh temporary SQLite database and synthetic fixtures. They never use the configured application database or actual customer accounts. Fixtures refuse to run outside their temporary stage.

## Remaining limitations and operational notes

1. The additive notification-table migration has been applied to the verified local database. Other environments must apply it before using the changed app: `php artisan migrate`. No production database was modified. Dropping this table on rollback would delete notification history; prefer a forward fix for populated installations.
2. Existing historical business activity is not backfilled. History starts with new transitions after installation. Dashboard queues and sidebar destinations still expose work that predates installation.
3. Notifications poll; they are not WebSocket or device-push messages. Native Flutter notification screens/OS push handling are not implemented by this backend/web change. The new authenticated APIs support that follow-up.
4. There is no distinct seller-confirmed status, pickup-failure workflow, assignment rejection, rider-initiated COD remittance submission, product-report submission, separate dispute-escalation model, payout approval queue, or logistics-company settlement approval workflow in the inspected implementation. Those events were not invented. COD receipt/reconciliation and manual refunds/payouts use the actual existing workflows.
5. If a parcel has no designated logistics center, it cannot safely target a company notification. The existing available-pickup queue remains the discovery path until a center claims it.
6. Account decisions are persisted, but rejected/pending/inactive users cannot enter the operational inbox until eligible. Existing decision emails and onboarding pages remain their immediate communication channels.
7. Low stock currently means five units. Alerts are product-level; no independent per-variant threshold policy was added. Replenishing above the threshold allows a later genuine crossing to notify again.
8. Categories preserve why an event originally required attention. Current task availability and action labels are checked independently; the inbox is not a replacement for live operational queues.
9. Email/SMS preferences continue to govern their existing behavior. No separate opt-out for required database task history was added. No retention/deletion policy or history export was invented.
10. Automated checks and screenshots do not certify WCAG compliance. Screen-reader announcements, contrast measurements, physical touch devices, landscape, and 200%/400% zoom need the manual checks below.

## Manual testing guide

Use a local/test database with approved, verified role accounts and the normal existing workflow prerequisites.

1. **Buyer:** place an idempotent checkout; confirm one notice per store parcel and seller. Retry the checkout key and verify no duplicates. Start seller preparation, collect the parcel, receive it at the center, dispatch, record a failed attempt/retry, and complete delivery with valid proof and exact COD. Check only relevant buyer milestones and exact COD receipt.
2. **Seller:** verify new-order action, preparation updates, buyer cancellation, pickup scheduling/collection, delivered update, low/out-of-stock crossings, return decision/collection/receipt, and recorded manual payout. Replenish stock and cross the threshold again; unchanged low-stock edits should not repeat alerts.
3. **Pickup rider:** assign a valid pickup using the existing center/coverage rules. Confirm notification and assignment link. Reassign to another eligible rider; the former rider's link disappears. Complete pickup through the authorized parcel screen.
4. **Delivery rider:** complete sorting and assign dispatch; verify COD matches stored subtotal plus shipping. Accept dispatch, start delivery, record failure/retry, then complete proof/COD. Confirm cash-handover-pending and later reconciliation messages.
5. **Logistics:** verify ready pickup, claimed pickup, sorted delivery, exceptions, damaged receipt, collected COD, cash discrepancy, and return assignment/receipt. A different company's operator must receive none of those private notices. Repeat an unchanged held state/cash discrepancy and check no additional message.
6. **Admin:** submit buyer/seller/logistics applications and a complaint; submit a return; record a damaged receipt or COD discrepancy. Verify review links lead to existing authorized pages. Successful routine orders must not generate admin inbox entries. Record COD reconciliation, supported manual refund, and seller payout using existing evidence requirements.
7. **Inbox controls:** open preview and history, switch all/action-required/updates, paginate, read one and all, reload, and verify timestamps/counts persist. Complete a task and verify its link becomes “View update.” Delete/invalidate a related record in a test database and verify no record link remains.
8. **Live behavior:** keep another user's inbox open in a visible online tab, perform a valid transition elsewhere, and wait up to 30 seconds. Count and list must update without manual refresh. Hide the tab and return; verify revalidation. Navigate away and confirm interval requests stop for unmounted lists.
9. **Mobile API:** use a bearer token containing `api:v1` and the account's current `role:*` ability. Exercise all four endpoints. Try another user's notification UUID, a wrong role ability, missing/expired token, invalid category, and excessive page size. Never paste real tokens into documentation or screenshots.
10. **Accessibility:** at 320px/tablet/desktop and in both themes, tab through the bell, categories, read controls, links, and pagination. Escape must close the preview and restore bell focus. Check 200%/400% zoom, landscape, visible focus, touch targets, real screen-reader announcements, contrast, loading/error/empty states, and that toasts avoid header/bottom navigation.

Reproducible automated browser command after a build: `node tests/Frontend/notifications-browser-check.cjs`. Results and screenshots are written to `storage/app/notification-ui-check/`.
