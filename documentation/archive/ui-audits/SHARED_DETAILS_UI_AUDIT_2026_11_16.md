> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Shared order, return and activity presentation — November 16, 2026

Latest density adjustment: retained the supplied two-panel layout while reducing
desktop product frames from 112px to 80px, outer vertical padding from 24px to
16px, status icons from 28px to 20px, and heading/action typography. Targeted
ESLint, TypeScript, build and 22 refund tests (294 assertions) passed. Browser
screenshots above describe the preceding larger version; this spacing-only
adjustment has not had a fresh browser run.

## User-supplied status-panel card reference

Updated request rows to follow the latest supplied design: larger framed product
images, store and return reference above the product heading, order/parcel text
below, separate tinted Refund status and Physical return panels with large icons,
desktop dividers, and an outlined details button. Success and review surfaces
derive from existing semantic theme tokens. Mobile keeps the image alongside the
product and stacks the status panels and action; tablet places panels side by
side. Existing banners, data, permissions and dialog actions remain intact.
Targeted ESLint, TypeScript, build and 22 refund tests (294 assertions) passed.

## Summary card visual refinement

Refined the request cards after screenshot feedback: product names now carry the
main heading, store names are quieter, return references use small chips, and
order/parcel references form a secondary line. Status badges fit their text and
include icons, with credited refunds using the existing success token and credits
needing review using the warning surface. Physical custody has its own icon and
line. Desktop status columns have a bounded width and the action area has a quiet
divider. The existing details action includes a directional icon. Tablet/mobile
content stacks without changing data, actions, banners or historical notes.

Targeted ESLint, TypeScript, production build and 22 refund approval tests
(294 assertions) passed for this refinement. Existing runtime artwork warnings
remain in the build.

## Follow-up: banner, summary alignment and historical audit notes

Restored the existing returns banner stylesheet and its Buyer guide marker; other
roles show the same existing return artwork in a purple banner. Summary rows use
aligned product thumbnails, request information, status and a compact details
action, with stacked mobile content. Existing work that shortened the details
button label and removed list-level amounts remains intact.

`resources/js/lib/activity-note.ts` now strips structured JSON audit fragments
from displayed return and parcel history notes while retaining surrounding human
text and explicit note/reason/message fields. Stored records and timestamps are
unchanged. Seven direct formatter cases passed, including the supplied mixed
human-note/before-after payload, plain bracketed prose and malformed audit text.
Targeted ESLint, TypeScript, production build and 22 refund approval feature tests
(294 assertions) passed. Runtime artwork URL warnings remain in Vite; the return
banner SVG exists in public assets.

The follow-up build was exercised with the isolated browser presentation harness:
all five role lists passed; populated Buyer/Admin/Seller details passed reflow,
Escape and focus restoration checks. Light/dark evidence was refreshed under
`storage/app/shared-ui-check/`. The restored Buyer banner was visually inspected.
No uncaught browser exceptions were reported. Assigned transport workflows remain
outside this presentation fixture as described below.

The supplied return/refund reference guides the shared returns page: compact
request summaries open a responsive details dialog with refund/custody/recovery
summaries, product information, financial breakdown, responsibility, references,
physical custody/proof information, and a connected activity timeline. Existing
permission-derived actions remain in the details dialog with their existing forms.

## Changed presentation files

- `resources/views/components/shared/activity-timeline.tsx`: reusable connected
  purple icon timeline, actual timestamps, explicit recorded/completed/pending
  states and readable return event labels. Recorded audit activity is not treated
  as proof that a whole workflow completed. Unknown actions retain a readable
  fallback; notes and evidence links are preserved.
- `resources/views/components/marketplace/refund-workflow.tsx`: shared Buyer,
  Admin, Seller, Logistics and Rider return summaries and details presentation.
- `resources/views/components/marketplace/buyer-return-card.tsx`: older return
  history uses the shared activity presentation.
- `resources/views/pages/marketplace/deliveries.tsx`: shared parcel activity
  timeline retains existing actor, event labels, details and supporting photos.
- `resources/views/pages/finance/overview.tsx`: transaction timeline reuses the
  shared timeline with the server's existing completion flags.
- `resources/views/components/finance/finance-ui.tsx`: financial records use
  centered, scrollable details dialogs across finance, settlements and payments.
- `resources/views/pages/marketplace/orders.tsx`: non-Buyer order details move
  into a two-column dialog with existing product images and permission-specific
  delivery information. Existing Buyer order/tracking dialogs remain intact.
- `resources/views/pages/logistics/parcels.tsx`: align the existing parcel dialog
  surface and heading divider with Buyer details styling.

No backend, routes, request payloads, authorization, financial calculations or
historical records were changed. Amounts use existing response fields and the
existing money formatter. No new dependencies or business actions were added.

## Validation

- Targeted ESLint, TypeScript and production build passed. Vite still reports
  runtime-resolved marketplace banner/category artwork URLs.
- RefundApprovalWorkflowTest, SettlementAndReturnsTest and
  RefundWorkflowUpgradeTest: 76 passed, 1,267 assertions.
- Existing browser harness startup/fixtures were reused for an isolated SQLite
  presentation check. A real request was submitted through the Buyer form.
  Buyer, Admin, Seller, Logistics and Rider return lists rendered at 320, 768
  and 1440 pixels without page horizontal overflow. Populated Buyer/Admin/Seller
  details dialogs also passed internal horizontal overflow checks at those widths,
  Escape closing and trigger focus restoration. Light/dark screenshots were
  captured; no uncaught browser exceptions occurred.
- Browser evidence: `storage/app/shared-ui-check/`, results in `results.json`.
  This presentation run preceded the final decorative status icons and credited
  amount text; the final source was rechecked by lint, TypeScript and build.

## Verification limits

The presentation fixture had no assigned Rider/Logistics return tasks. Their
populated task dialogs and all nested approval/transport forms still need full
rendered workflow acceptance after this layout change; backend feature coverage
is not browser action coverage. Non-Buyer order details, parcel activity and
finance dialogs passed static checks/build but have not been exercised in this
browser run. Existing Buyer request submission was verified, while Buyer order,
review and tracking interactions were not rerun. Full screen-reader testing,
contrast measurement, 200%/400% zoom, real device/touch behavior and performance
remain manual checks; this report does not claim WCAG certification or complete
application-wide visual acceptance. No deployment was performed.
