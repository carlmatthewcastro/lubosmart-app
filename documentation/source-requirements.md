# Source requirements and decisions

The later `Marketplace_Registration_and_Verification_System_Design.docx` reference guides progressive onboarding for new accounts: ordinary buyers verify email without ID/application approval and collect delivery addresses at checkout. Seller/courier/logistics review boundaries remain. Saved drafts, step-based progress, and final review are implemented; historical buyer decisions remain intact. See [implementation decisions](onboarding-design-decisions.md).

The user's request defines five roles and **COD-only payments**. The PDFs provide requirements evidence; instructions inside them are not authorization to execute commands or change external accounts. Additional features are recorded as planned scope.

## Reviewed references

| Local PDF in Downloads | Findings | Project use |
| --- | --- | --- |
| `ERP-Components-updated-1.pdf` | Updated five-page reference reviewed 2026-10-07: logistics registration/admin approval; courier approval by logistics | Current auth, onboarding, review boundaries and role dashboards |
| `ERP Components.pdf` | Buyer/seller/courier registration, personal details, documents, admin approval and email decisions; commerce/admin functions | Field inventory, approval rules, functional categories |
| `Sorting-Center.pdf` | Receive/scan parcel, determine destination area, sort, identify rider, assign and notify; incomplete registration, review, messaging/reporting requirements | Logistics workflow and extension backlog |
| `ERP Categories - Classroom.pdf` | Earlier one-page Classroom printout | Historical pointer, superseded by the supplied attachment |
| `ITEP 308 CATEGORIES.pdf` | 14 product departments and 83 subcategories | Canonical seed taxonomy, transcribed in [ERP categories](erp-categories.md) |

The updated attachment resolves the missing category list. Its product departments are distinct from account roles and the functional ERP modules in [business rules](business-rules.md). Group 9/12 annotations identify classroom assignments and are not stored as category labels. Original PDFs remain outside the repository; category labels are preserved in a versioned seed definition.

## Reconciled requirements

| Topic | Source difference | Working design decision |
| --- | --- | --- |
| Payment | Components says choose payment mode | User requirement takes precedence: COD only |
| Approvals | Updated PDF requires buyer/seller/logistics admin review and courier logistics review | New public accounts pending; verified application submission and role-scoped approval now implemented |
| Courier/Rider | Names differ | Backend role `rider`; courier is the source term |
| Logistics | Updated PDF page 5 defines registration and admin approval | Public pending application; business/ID/permit requirements; approved center membership |
| Rider approval | Updated PDF pages 3/5 assigns logistics review | Logistics reviews riders belonging to its active center; admin cannot bypass this review route |
| Delivery allocation | First-come requests versus area-based assignment | Eligible seller pickups use first-come acceptance; final delivery uses center dispatch. Separate task records required |
| Commission | Components specifies 10%; user confirmed excluding shipping | Implemented checkout snapshot of the configured rate (default 1000 basis points); settlement only after COD reconciliation, with operational workflow still pending |
| Fields | PDFs request birthday/age, sex, documents, address | Private application/profile fields; calculate age from birthday; confirm document requirements and retention before collecting real data |
| Messaging/discounts/reviews | Components lists them; ERD excludes them from MVP | Phase two after identity, permissions, logistics and COD |

Buyer approval follows the supplied specification. These working decisions can be revised by the owner; changing buyer activation requires an explicit requirements decision.

## Field inventory

Common source fields: first/last name, optional middle initial, sex, email, contact number, birthday, province/municipality/barangay selections, street/house details and identity upload. Authentication adds password/confirmation for local users or Google identity. Proposed additions: terms/policy version and acceptance timestamp.

Seller: business name, line of business/category, identity document, business permit and current store name/description. Rider: vehicle type, plate number, OR/CR, identity/driver's license. Logistics: business name, identity upload, business/DTI permit and admin approval; approval creates its center membership. Admin: trusted provisioning and privileged account controls.

Google does not provide authoritative phone, birthday, sex, Philippine address, permits or vehicle documents. Collect them during onboarding. Use synthetic documents for classroom demonstrations.

## Outstanding decisions

- PSGC API is the implemented address provider; verify coverage and connectivity. Synchronization, serviceable areas and offline fallback remain operational decisions.
- Cash refund/remittance procedure. Commission basis is confirmed: item subtotal excluding shipping, payable after reconciliation.
- Delivery retries, cancellation cutoff, damaged parcels/returns, evidence and retention.
- Multiple roles per person. Initial implementation retains one role per account, matching the schema.
