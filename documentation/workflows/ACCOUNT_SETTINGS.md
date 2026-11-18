# Logistics account settings

The logistics owner page is `/settings/account`; `/settings/profile` renders the
same feature for approved logistics accounts. Administrators review requests at
`/admin/change-requests`, linked from the registration review queue.

## Data and approval rules

`registration_applications`, `user_profiles`, the application's linked address,
and its private registration documents remain the approved source of truth.
Settings reads those records rather than maintaining an editable profile copy.
`registration_snapshots` captures the initial approval baseline and each approved
company re-verification. Snapshots reject Eloquent updates/deletes. Database
credentials with direct SQL access must still be restricted operationally.

Address and re-verification proposals never replace approved values before
approval. All mutations and decisions serialize on the owner account row.
Approvals apply values, record the decision, and write an audit entry in one
transaction. A failed audit rolls the approval back. Duplicate/replayed reviews
return 409. Re-verification also checks document availability and company/SEC/TIN
uniqueness again on approval. TINs are masked in responses and audit summaries;
document storage paths never appear in API responses.

Service regions are a fixed nine-digit code list matching this application's
registration contract. The address region cannot be removed. Removed regions
take effect immediately; re-adding an original registration region is immediate.
Other additions await approval. Editing the selection while a request is pending
updates that proposal, so approval cannot restore a removed region. Withdrawing
all proposed additions closes the request as rejected with an owner-withdrawal
reason. An approved address automatically includes its new region. An older
service proposal that omits that region must be revised or rejected.

## Setup

Run these during the normal release process; no configured application database
was migrated as part of implementation:

```powershell
composer install
npm.cmd ci
php artisan migrate
php artisan account:backfill-snapshots
php artisan account:import-locations C:\data\validated-psgc-postal.csv
npm.cmd run build
```

The importer expects this exact CSV header:

```csv
region_code,region_name,province_code,province_name,city_code,city_name,barangay_code,barangay_name,postal_code
```

Supply a vetted hierarchy joined to an authoritative postal-code crosswalk.
No production dataset or postal crosswalk was supplied. The feature deliberately
ships no invented location rows. Address changes are unavailable until imported,
and unknown hierarchy/postal combinations return 422. Multiple postal codes per
barangay can be imported; the UI fills the first available code. NCR uses the
existing registration convention of a synthetic Metro Manila province code
`130000000`. This application uses legacy nine-digit codes; normalize modern
ten-digit PSGC exports to the established registration codes before importing.

PSGC source: [Philippine Statistics Authority](https://psa.gov.ph/classification/psgc/).
Region labels include the [Negros Island Region](https://psa.gov.ph/content/second-quarter-2024-psgc-updates-creation-negros-island-region-and-correction-names-two).

## Authentication and private files

The `/api/account/*` and `/api/admin/change-requests*` routes use `auth:sanctum`
within the existing web session/CSRF boundary. This is a same-origin Inertia SPA;
personal access token issuance is outside this feature. Sanctum's session
middleware is used on these routes to preserve password-session invalidation.
See [Sanctum's first-party authentication guidance](https://laravel.com/framework/docs/12.x/sanctum).

Only an owner or an authorized registration administrator can download submitted
documents, even if another user obtains a signed URL. URLs expire after five
minutes. Documents and proposed replacement uploads use the existing private
`local` disk. Owners obtain signed URLs from settings; administrators obtain
signed proposed-document URLs from the review queue. Expired URLs can be renewed
by refreshing the relevant page. Never expose `storage/app/private` publicly.

## Assumptions

- “Account” maps to `users`; this feature applies to the `logistics`
  logistics-company role. Existing buyer/seller/rider settings remain intact.
- OTP authorizes contact changes using the project's existing registered-email
  code service. Tokens expire after ten minutes and are consumed once. A new
  email additionally requires the existing destination verification link.
  There is no installed SMS provider; this does **not** verify possession of a
  replacement phone number through SMS.
- Pending re-verification blocks operational access under the existing approved
  account rule. Settings stay accessible. Rejection preserves the previous
  approved registration and restores approved status, displaying the reason.
- Replacement company verification requires all four new documents. The same
  registration format, uniqueness, MIME, extension and 5 MB upload rules apply.
- Notification preferences are persisted; mandatory security/compliance mail is
  unchanged. No SMS delivery provider is introduced.
- Existing approved accounts can only be snapshotted from the registration data
  available now; historical values altered before this feature cannot be recovered.

## Validation

Feature tests cover locked fields, initial approval snapshots, named regions,
masked/revealed TIN, hierarchy/postal validation, immediate removals and pending
additions, mandatory-region checks at approval time, re-verification, owner-only
documents, admin decisions, OTP consumption, and transaction rollback on audit
failure. Relevant existing registration/settings tests are also run.

Browser artifacts are under `storage/app/account-settings-ui-check/`. Checks use
an isolated temporary SQLite database with synthetic owners/admins and fake mail.
They cover 320/768/1440 pixel reflow, cascading selects/postcode fill, TIN reveal,
CSRF-protected proposals, pending comparisons, keyboard focus, and admin approval.
Screenshots include light and dark states. These checks do not certify WCAG
compliance; screen-reader testing and comprehensive zoom/contrast checks remain.

Run the browser check with `node tests/Frontend/account-settings-browser-check.cjs`.
