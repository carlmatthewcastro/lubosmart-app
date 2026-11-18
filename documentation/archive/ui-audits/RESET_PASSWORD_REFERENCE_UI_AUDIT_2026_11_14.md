> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# New-password reference — 2026-11-14

Applied the reference card layout with New password, Confirm new password,
full-width reset action and sign-in footer. Shared password controls use eye icons;
sign-in now uses the eye toggle as well. No password examples, generator or
invented strength rating were added. Checklist uses the existing shared
passwordRequirements helper, including its lowercase requirement.

Preserved token/email payload, reset endpoint and server validation. Confirmation
mismatch appears after blur, with shared error feedback. Duplicate submits are
blocked and server validation focuses its first field. Native new-password
autocomplete and paste remain available for password-manager support.

Targeted ESLint, TypeScript and production build passed; 17 password-reset and
email-code tests passed (111 assertions). Existing category-atlas build warning
remains. Visual/mobile/dark, keyboard, screen-reader and zoom verification remains
pending following the previous browser harness failure on registration with a
missing Vite manifest. Automated checks do not certify WCAG compliance.
