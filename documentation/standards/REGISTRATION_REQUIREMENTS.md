<div align="center">

# Registration field coverage

**Supplied reference fields and current enrollment boundaries.**

[Home](../../README.md) · [Documentation](../README.md) · [Website](https://lubosmart.app)

</div>

## Scope

This maps the registration fields from `ERP-Components.pdf`, supplied October 14, 2026, to the website and stored data. The original PDF is not included in this documentation set. It is a field reference, not an identified official SRS or authorization to expand marketplace/payment features.

<a id="registration-requirements"></a>

## Registration requirements

| Reference requirement                    | Website and stored data                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| First/last name, optional middle initial | All role forms; validated `user_profiles` fields                                       |
| Sex                                      | Required across role forms and application submission                                  |
| Email and contact number                 | Normalized uniqueness checks                                                           |
| Birthday and age                         | Birthday required; age calculated for display, never trusted from the request          |
| Province, municipality/city, barangay    | Dependent location selections and server hierarchy validation                          |
| Street, house/unit number                | Combined address line with separately saved components                                 |
| Buyer ID                                 | Private upload attached to the application; Admin review                               |
| Seller name/category                     | Shop metadata and registered category; Admin review                                    |
| Seller documents                         | ID and business permit; DTI/SEC/BIR requirements vary by Seller type                   |
| Rider details/documents                  | Vehicle, plate, affiliated center, ID/license and OR/CR; owning Logistics approval     |
| Logistics details/documents              | Company name, ID, business permit and existing SEC/BIR/TIN/service-region requirements |
| Verification and decisions               | Six-digit email code, pending-review state and approval/rejection notifications        |

All forms retain the same Personal information fields, including Sex and the optional middle initial. Age remains calculated/read-only. Rider vehicle, affiliation and document fields belong to the next signup step. Account details and registration review use the same role-specific records and private documents.

### Approval boundary

New complete Buyer, Seller and Logistics registrations require Admin review after email verification; Riders require affiliated Logistics review. Verification confirms email control and does not grant operational access. Rejected applications may be corrected and resubmitted. Legacy accounts and company invitations retain their applicable lifecycle.

Sources: [registration service](../../web/app/Services/RegisterAccount.php), [verification lifecycle](../../web/app/Services/AccountVerificationLifecycle.php), [registration test definitions](../../web/tests/Feature/Auth/BuyerSellerRegistrationTest.php). See [Workspaces](../WORKSPACES.md#registration-and-access) for access boundaries.

<a id="google-registration"></a>

## Google registration

Web and native enrollment intentionally use different password handling. Both preserve required role details, documents, policy consent, server validation and approval rules.

| Flow             | Behavior                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website          | Unknown Google identities choose a role; trusted name/email prefill the form. The pending provider identity stays in the session for 30 minutes. Enrollment collects a password and uploads, then uses the existing email-code verification.               |
| Native API       | Google sign-in returns `registration_required` for an unknown identity. Multipart enrollment supplies `google_access_token`; password fields are prohibited. The server rechecks verified provider email and stores no local password for this enrollment. |
| Existing account | Sign-in/linking preserves the established role and account-state checks. Native Google cannot silently link an existing email.                                                                                                                             |

Public Rider signup uses email/password; supported existing Google sign-in/linking and company invitation activation remain compatible. Do not infer that Google prefill completes a Rider application.

Sources: [web registration controller](../../web/app/Http/Controllers/Auth/RegisteredUserController.php), [Google session service](../../web/app/Services/GoogleRegistration.php), [native request](../../web/app/Http/Requests/Api/MobileRegisterRequest.php), [native controller](../../web/app/Http/Controllers/Api/V1/MobileAuthController.php).

[Documentation](../README.md)
