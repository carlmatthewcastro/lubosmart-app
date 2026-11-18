> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Support reference UI — 2026-11-15

Applied the supplied purple Messages dashboard direction to the shared support
inbox and conversation views, with buyer support as the priority. Changes include
a purple gradient banner with a local SVG support-agent illustration, a compact
row of category tabs, search and Contact Support, and a collapsed More filters
section retaining topic/status/read filtering. Inbox rows now show an avatar,
subject, preview, activity time and unread badge. Existing shared navigation remains.

Following the user's request for closer matching, non-admin embedded conversations
now use one chat panel with a participant header, expandable case details, centered
date separators, outlined incoming bubbles with avatars, lavender outgoing bubbles,
and a paperclip/textarea/send composer. Attachments can be removed before sending.
Administrator case management remains in the existing detailed view. Desktop
initially opens the latest actual conversation; mobile starts with the inbox.
Opening it acknowledges messages through the existing authorized endpoint.

The shared views also serve other roles. Recipient selection, filters, unread
counts, pagination, polling, attachments, resolved conversations, and administrator
case actions retain their existing behavior. No simulated online indicator,
response-time promise, or invented conversation data was introduced.

Validation: targeted ESLint and TypeScript passed; SupportMessagingTest passed
(6 tests, 49 assertions); production build passed. The build reported unresolved
existing returns-banner.svg, catalog-shopping-banner.svg and
category-atlas-v1.png references.

Browser visual verification was unavailable. Manual checks remain for 320px,
tablet/desktop, landscape, 200%/400% zoom, light/dark contrast, keyboard navigation,
screen-reader announcements, and attachment/dialog interactions. Automated checks
do not establish WCAG compliance. This is an adaptation of the reference rather
than a pixel-identical reproduction.

Pre-existing order, returns, sidebar, and related test changes were preserved.
No commit, push, branch change, or deployment was performed.
