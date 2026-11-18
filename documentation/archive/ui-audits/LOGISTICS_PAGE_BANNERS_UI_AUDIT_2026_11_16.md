> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Logistics page banners — 2026-11-16

Added a shared Logistics banner through `Page`, using the supplied orders banner as the visual reference: rounded purple surface, page title and purpose, parcel artwork, and a function-specific decorative icon. Includes dashboard, parcel queues and records, delivery management, scanning, riders, coverage/rates, reports, payments, returns, messages, notifications, and shared settings that use `Page`. Other roles retain their existing headers.

Parcel records and delivery management now describe their respective functions. The banner owns the single h1; the navbar retains a non-heading page label. Existing actions remain outside the banner with their original behavior. Artwork is decorative and hidden on narrow screens to prioritize readable text. Semantic theme colors support light and dark preferences; no animation or new dependencies were added.

Validation:

- Targeted ESLint and TypeScript passed.
- Production build passed, with existing public-image URL resolution warnings.
- LogisticsWorkspaceTest: 61 passed, 924 assertions.
- Existing Logistics consolidation browser checks passed all 60 Logistics page/viewport/theme combinations at 320, 768, and 1440px: single h1, no document overflow, and existing parcel dialog reflow/focus checks.
- A first browser run overlapped a production rebuild and encountered a temporarily missing Vite manifest; rerunning after the build passed these Logistics checks. The rerun logged a rate-limited `/locations` request at shipping rates; that page's heading and reflow assertions passed.

Limitations: existing browser screenshots focus on parcel dialogs, so full unobstructed banner review remains outstanding. No manual screen reader, touch-device, 200%/400% zoom, or full contrast audit was completed; automated checks do not establish WCAG compliance. Shared settings, payments, returns, and messages receive the banner via `Page`, but were not individually exercised by this browser suite.
