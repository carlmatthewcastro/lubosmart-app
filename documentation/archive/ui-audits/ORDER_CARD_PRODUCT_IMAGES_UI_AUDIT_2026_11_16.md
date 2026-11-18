> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Order card product photos — 2026-11-16

Buyer and seller order cards hide the decorative package icon in their record
header. Seller order responses now include the same current public product photo
URL as buyer responses, with constrained eager loading and without serializing
the product record. Existing ownership filters and workflows are preserved.
The shared order image component displays the actual product photo and uses a
text “No photo” fallback instead of another package icon for missing or failed
images. This fallback also applies to other surfaces using this component.

Validation: four buyer/seller photo payload cases passed, including missing
photos and seller ownership isolation. Four buyer workspace tests passed; its
dashboard test failed because the response lacks the expected stats.Orders prop.
Targeted ESLint, TypeScript, PHP syntax, and targeted Pint passed. Production build passed with existing
runtime resolution warnings for catalog, orders, category, and returns artwork.

The screenshot product's stored photo and live browser rendering were not
verified. Light/dark themes, mobile reflow, zoom, and assistive technology remain
manual verification items; automated checks do not establish WCAG compliance.
