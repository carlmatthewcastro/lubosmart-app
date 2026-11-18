> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Parcel assignment alignment — 2026-11-16

Replaced the intrinsic-width wrapping assignment form with a container-responsive
grid. At 48rem of parcel panel width, area, approved rider and Assign share a row;
the button aligns with inputs rather than their reserved error feedback. Narrower
panels stack full-width controls. Coverage notices span the form. Both pickup and
delivery assignment use the same layout; validation and submission remain intact.

Targeted ESLint, TypeScript, production build and LogisticsWorkspaceTest passed
(61 tests, 924 assertions). The build retained runtime
image resolution warnings for catalog shopping, orders, returns and category atlas.
Browser visual, theme, zoom and keyboard checks remain pending; the browser harness
timed out during login in the preceding batch. Automated checks are not WCAG proof.
