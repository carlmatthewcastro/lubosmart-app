> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

﻿# Shared dashboard welcome banners - 2026-11-16

User requested the Buyer welcome-banner design across every role dashboard. Buyer (WorkspaceDashboard), Seller, Rider and Admin already use DashboardWelcome with role-specific descriptions and actions. Updated Logistics to use that same component, preserving company context and Scan parcel and adding the existing /deliveries destination as Manage parcels. Reuses the shared truck illustration, theme tokens and responsive layout. No dashboard metrics, permissions, routes or workflows changed.

Changed implementation: resources/views/pages/logistics/dashboard.tsx. Existing pending changes elsewhere were preserved. Targeted ESLint and TypeScript passed. The shared banner hides the decorative illustration at narrow widths and keeps the text/actions accessible. Manual all-role visual acceptance and complete accessibility review remain unverified for this follow-up.
