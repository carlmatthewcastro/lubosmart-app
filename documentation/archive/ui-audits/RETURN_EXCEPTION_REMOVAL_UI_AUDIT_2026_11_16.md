> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Return exception section removal

Removed the Authorized return exception section, including parcel search, selection,
details, and authorization controls, from the shared return policy card as requested.
The standard policy display and edit action remain. Backend routes and permissions
are unchanged.

Validation: targeted ESLint, TypeScript, production build, and
RefundWorkflowUpgradeTest passed (1 test, 14 assertions). The build reports four
unresolved image references that Vite leaves for runtime resolution.

Browser visual review, light/dark themes, mobile reflow, keyboard and screen reader
checks were not performed. Automated checks do not establish WCAG compliance.
