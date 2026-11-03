# Rider dashboard and local samples

Open `/dashboard/rider` with an approved, verified Rider linked to an operational Logistics company. The dashboard uses the shared Logistics layout, charts, search, live queue menu, account menu and theme controls. All counts, parcel search results and COD totals are restricted to the signed-in Rider. Company management, rate editing, parcel sorting, assignments and application reviews remain Logistics functions.

Run this optional seeder locally:

```powershell
php artisan db:seed --class=RiderDemoSeeder
```

It creates a separate DEMO Logistics company and a demo Rider, Buyer and Seller, with five synthetic parcels: an assigned pickup, two parcels awaiting Logistics processing, a prepared dispatch and an out-for-delivery parcel. The hidden product and fake destination have no published shipping rate. Existing accounts and parcels are preserved. Reruns preserve demo passwords and parcel progress. The seeder refuses production.

Rider login details are saved privately in `storage/app/private/demo/rider-login.json`. Newly created company logins are saved in `storage/app/private/demo/logistics-login.json`; an older company needs its existing credentials and reruns never reset its password. Sign out first or use another browser profile, then open `/dashboard/rider`. These credentials and records are for local testing only. See [the complete Logistics and Rider demo](LOGISTICS_DEMO.md) for the existing Flash Express samples and the function-by-function walkthrough.

Try the assigned pickup with its exact tracking reference. For the prepared dispatch, confirm its tracking reference and accept handover before marking it out for delivery. Delivery completion requires an uploaded JPG/PNG, recipient name and the actual full sample COD of PHP 150. Failed attempts require a reason and appear in Delivery issues. Logistics must resolve holds/returns and confirm cash receipt. Riders cannot confirm their own cash handovers.

No completed deliveries, proof uploads or cash collections are pre-generated. Completed and COD figures start at zero and update through actual test actions. Synthetic parcels and any later test collections appear in local reports. No real shipment or payment is involved.

Verification covers rider isolation, queue/search filtering, notification access, dispatch acceptance, proof/COD validation, cash receipt by Logistics, failed-attempt feedback, zero-data responses and repeatable seeding. The headless dashboard check supports `LUBOSMART_BROWSER_ROLES=rider` and writes screenshots and results under `storage/app/dashboard-ui-check` using a disposable SQLite database.
