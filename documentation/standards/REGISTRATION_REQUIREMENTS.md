# Registration field coverage

User-requested registration reference: `ERP-Components.pdf`, supplied on
2026-10-14. This maps its registration fields; it does not expand the task into
the PDF's marketplace, payment or reporting features.

| PDF registration requirement | Website and stored data |
| --- | --- |
| First name, last name | All role forms; validated names in `user_profiles` |
| Optional middle initial | All role forms; nullable `user_profiles.middle_initial` |
| Required sex | All role forms and application submission; stored in profile |
| Email and contact number | All role forms; normalized uniqueness checks |
| Birthday and automatic age | Birthday required for all roles; age calculated for display from birthday, never trusted from request |
| Province, municipality/city, barangay | Dependent Philippine location API selections with server hierarchy validation |
| Street, house/unit number | Manual inputs combined into address line and saved separately |
| Buyer ID | Private upload linked to the registration; Admin review |
| Seller business name and category | Shop metadata and registered category; Admin review |
| Seller ID and business permit | Private uploads for all seller types; existing DTI/SEC/BIR requirements retained by seller type |
| Rider vehicle, plate, OR/CR, ID/license | Rider fields and private documents; only owning Logistics manages Rider approval/access |
| Logistics business name, ID and permit | Company fields and private documents; existing SEC/BIR/TIN/service-area requirements retained |
| Wait for approval and email decision | Signup explanation, email-code verification, pending-review page and approval/rejection email |

Accounts and Registration Review share role-specific details and document lists.
Registration approval and account access remain separate workflows.

Unknown Google sign-in identities first choose a registration role. Google name
and email prefill the selected form; provider ID is retained only in the server
session. Registration still collects required information, password, consent and
uploads and uses the existing six-digit email-code verification. Pending Google
identity expires after 30 minutes. Existing Google accounts continue to sign in
through the established role and account-status checks.

All roles use the same Personal information group, including required Sex.
Rider-specific vehicle, affiliation and document fields belong to the next step.
The age control is labeled Age and remains calculated/read-only.
