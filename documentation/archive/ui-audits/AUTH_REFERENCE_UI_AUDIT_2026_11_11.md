> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Auth reference implementation - 2026-11-11

Implemented the supplied four-panel sign-in/sign-up reference as working Inertia
pages. The shared account-access layout now has a rounded lavender shell, left
brand/headline/artwork, inset form panel, Back to Home link and theme control.
Mobile shows the brand and form without the promotional scene. Registration
details use the same shell with a wider panel for existing fields and uploads.

Sign-in retains email/password validation, autocomplete, remember-me, password
visibility, recovery, Google authentication and request feedback. Added optional
leading icons to the existing AuthInput/Password components; other forms retain
their existing behavior. Sign-up uses native radio rows for Buyer, Seller, Rider
and Logistics with the existing role URLs and RegistrationForm. Required fields,
private uploads, consent, email verification and approval rules are unchanged.

Auth styling is isolated in `resources/css/auth-reference.css`. Semantic brand
and theme tokens drive surfaces, borders and text. The dark action gradient uses
the existing primary hue with adjusted saturation/lightness for the supplied
reference. Recovery pages retain their existing layout.

## Validation and evidence

- Targeted ESLint, Prettier, TypeScript and production build passed.
- 65 relevant authentication, registration, PDF-requirement, password-reset and
  Google-auth tests passed, with 456 assertions.
- The existing browser harness supports `LUBOSMART_BROWSER_AUTH_ONLY=1`.
  It checks 1440px, 768px, 320px, 360px and 844x390 landscape layouts, image
  loading, heading count, overflow, role selection, malformed-email feedback,
  password visibility and keyboard skip-link/radio navigation. It also checks
  all four roles' personal fields and theme persistence across auth navigation.
  The auth-only run copies built assets and public images into its temporary
  stage and serves them through a stage-local copy of the fixture router. This
  prevents concurrent production builds from deleting assets during the run;
  customer uploads are excluded from that copy.
- Light/dark desktop and mobile screenshots and results are saved under
  `storage/app/auth-reference-ui-check/`. Production build output is in
  `storage/app/auth-reference-build.log`.
- Desktop, mobile, tablet registration and dark screenshots were inspected.
  Actual 200%/400% browser zoom, screen readers, real touch devices, measured
  contrast, production performance, real Google OAuth and full registration
  submission were not manually reverified. These checks are not a WCAG
  certification. Assets are approximately 2 MB each; production delivery
  performance remains unmeasured.

Existing work was preserved. No branch switch, commit, push or deployment was
performed. An initial build encountered a newly referenced home stylesheet that
was still being created by other workspace activity; subsequent production
builds passed once that file became available. Auth work did not replace that
homepage work.
Two later browser attempts were also interrupted when concurrent builds removed
the manifest. The harness was then isolated as described above; the final run
passed all five browser check groups, including all four roles and theme persistence.

## Generated artwork

Used the built-in **imagegen** tool, with the user's screenshot as the visual
reference. Final project assets:

- `public/images/brand/auth-signin-scene-v1.png`
- `public/images/brand/auth-signup-scene-v1.png`

Both are transparent PNG files copied into the project from the built-in output;
originals were retained. The composition is recreated artwork, so it is not an
identical extraction of the reference photo.

Sign-in prompt:

> Create ONE standalone transparent-background web illustration asset, NOT a UI screenshot. Use the attached four-panel LubosMart UI image only as the visual reference for the SIGN IN laptop/tabletop scene at the TOP LEFT. Photorealistic polished 3D product photography: open dark laptop with a pale lavender screen and a simple purple shopping-cart symbol (no words), kraft shipping boxes, a purple paper shopping bag with orange handles, small leafy green plants behind. Composition is a wide low still life, all objects fully visible and grounded, laptop centered behind bag and boxes, soft shadows, subtle warm tabletop base fading to transparency at its edges. No interface, no headings, no text, no letters, no watermark, no surrounding panel. Neutral lighting that fits both lavender and dark purple backgrounds. Wide 3:2 composition, scene fills lower 80%; premium realistic materials and restrained purple/orange brand palette. Save the generated image as an accessible local file for use in the project if supported.

Sign-up prompt:

> Create ONE standalone transparent-background web illustration asset, NOT a UI screenshot. Reference images: four-panel LubosMart auth screenshot is the composition reference, especially its BOTTOM LEFT phone scene; the recent standalone laptop image is a style reference for matching material, plants, shadows and framing. New subject: a large upright black-edged smartphone, slightly leaning back and turned subtly to the left, lavender screen with a purple striped storefront awning at the top and purple shopping-cart symbol, NO text. Kraft delivery boxes on the lower left and a purple paper shopping bag with orange handles in front, green leafy plants behind. Premium realistic 3D product photography, warm neutral lighting, restrained purple/orange palette. Wide 3:2 composition, whole scene fully visible, all objects clustered on a subtle warm tabletop base fading to transparent edges, transparent background. Scene fits in the lower 80%, tall phone at right, parcels and bag to left. No words, headings, UI panels, letters or watermark. Designed to sit at the bottom of a sign-up panel over light lavender OR dark purple CSS backgrounds.
