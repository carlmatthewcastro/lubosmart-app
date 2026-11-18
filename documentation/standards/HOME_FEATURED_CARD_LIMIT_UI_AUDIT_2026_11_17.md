# Homepage featured card limit

Reduced the homepage featured product limit from 16 to 15 to remove the extra
card and fill three rows in the five-column desktop grid. Product records and
marketplace listings remain available.

Validation: targeted ESLint, TypeScript, nine homepage feature tests (103
assertions), and production build passed. The build reported unresolved image
references for catalog, orders, returns banners and the category atlas.

Browser visual review, responsive reflow, theme, keyboard, and zoom verification
were not performed. Automated checks do not establish WCAG compliance.
