> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Parcel menu placement — 2026-11-16

Anchored logistics parcel list menus to the upper-right of the parcel card.
Removed the redundant menu from embedded parcel details per the user's correction.
Embedded handling history uses a visible disclosure and delivery proof has a direct
download link so both remain available without that menu.
Reserved space beside the list product preview to keep long
names clear of the menu. RecordHeader accepts an optional menu wrapper class;
existing menu actions, permissions and focus restoration remain in place.

Targeted ESLint, TypeScript and production build passed. LogisticsWorkspaceTest
passed with 61 tests and 924 assertions. Build retained runtime image resolution
warnings for catalog shopping, orders, returns and category atlas assets.
Browser review at mobile/desktop widths, zoom, both themes and keyboard/screen
reader checks remains pending. Automated checks do not establish WCAG compliance.
