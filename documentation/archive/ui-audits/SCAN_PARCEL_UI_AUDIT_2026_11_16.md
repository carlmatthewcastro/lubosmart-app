> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Scan Parcel UI refinement audit — 2026-11-16

## Follow-up polish

- Camera preview now fills its panel width at a bounded responsive height instead
  of shrinking to a narrow aspect-ratio box. Camera control includes state icons;
  preview guidance and feedback retain existing capture and cancellation behavior.
- Desktop uses a 5:7 scan/review split; smaller widths stack naturally. Progress
  uses scan, review and confirmation icons. Tracking lookup has a clearer heading.
- Parcel review has a consistent header, stable loading state and a short physical
  verification checklist in the empty state instead of a mostly blank dashed card.
- Shared camera presentation also applies to the existing rider camera surface.

Follow-up validation: targeted ESLint, TypeScript and production build passed;
LogisticsWorkspaceTest passed (61 tests, 924 assertions). Runtime catalog image
resolution warnings remain. Browser harness first encountered assets being rebuilt;
after build completion a fresh run timed out during login before reaching Scan.
Current visual screenshots, real camera/hardware input, mobile/zoom, keyboard,
screen reader and theme verification therefore remain pending.

Scope: UI-only refinement of the existing logistics Scan Parcel workspace. Preserve the shared sidebar, purple banner and illustration, Poppins, theme tokens, endpoints, payloads, camera decoder, physical confirmation dialog and duplicate request protections.

Changes:
- Compact camera preview with a decorative barcode frame and reduced-motion-aware scanning line. Decoding still reads the full camera image.
- One contextual Start/Stop camera control, including cancellation while opening.
- Camera and tracking lookup beside the existing parcel review at wide widths, stacked on smaller screens.
- Shared Scan → Review → Confirm indicator; review becomes current after an exact successful lookup. Confirmation remains an explicit existing operation, never inferred from scanning.
- Reuse actual product thumbnails and the neutral parcel icon fallback, existing next-step guidance and handling history. No fabricated recent scans or global history endpoint.
- In the scan workspace, present the first permitted exception action from existing server allowed_actions; suppress reassignment while awaiting dispatch acceptance. Other parcel screens retain their existing controls.
- Update existing browser check selectors for the Start camera label.

Validation: targeted ESLint, TypeScript and production build passed. LogisticsWorkspaceTest: 61 passed, 924 assertions. Build reports unresolved existing catalog/marketplace image paths that remain runtime URLs.

Browser verification: the existing logistics browser harness launched but timed out during login before reaching the scanner. A second attempt failed at the same login step. Real camera scanning, hardware scanner input, light/dark screenshots, 320px and tablet reflow, zoom, keyboard, screen-reader announcements and measured contrast remain unverified for this batch. Automated checks do not establish WCAG compliance. No backend, database, route or status transition changes; no deployment.
