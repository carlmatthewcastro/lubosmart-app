# Logistics workspace

Logistics/sorting center accounts own shipping rates and parcel coordination. Riders handle pickup, delivery status, proof photos and COD collection; they cannot edit fees. Admin approves logistics businesses and retains authority over account restrictions.

## Registration and access

The existing registration workflow collects first and last name, optional middle initial, sex, birthday (age calculated), email, contact number, API-backed province/city/barangay, manual street details, business name, identity document and business/DTI permit. Admin review results are emailed. Approved logistics accounts access their dashboard at `/dashboard/sorting_center` and see only their operational centers.

## Daily workflow

1. Review rider applications in Registrations. Use Rider Management to deactivate an approved rider or restore a rider you previously deactivated. Logistics cannot undo admin suspensions/deactivations or bypass application review.
2. Add barangay rates in Shipping Rates & Coverage. Create drafts first, verify coverage and packed product weights, then publish. Publish both seller pickup and buyer destination barangays.
3. Assign barangays to approved riders using Parcel Operations → Rider Coverage.
4. Seller marks the parcel ready for pickup. Logistics reviews and approves the pickup request, then assigns a pickup rider.
5. Rider confirms pickup. Logistics confirms center receipt and sorting. Logistics may assign another eligible rider for dispatch; riders complete the subsequent delivery steps.
6. Rider uploads proof and confirms delivered/COD collected. Logistics confirms cash handover; admin retains final COD reconciliation.
7. Review completed deliveries in Delivery Reports and export the applied date range as CSV. Shipping totals are order snapshots, not rider earnings or confirmed payouts.

New quoted orders are allocated to the provider chosen by the buyer. Legacy unallocated orders remain available for center acceptance. Center actions and rider transitions are recorded in parcel events, with duplicate/out-of-order transitions rejected.

## Shipping basis

Each seller sends a separate parcel. Its fee is:

`destination base fee + ceil(max(0, packed weight − included weight) / 1,000 grams) × extra kilogram fee`

For example, a ₱50 base covering 1 kg plus ₱15 per extra kg gives ₱65 for 1.5 kg and ₱80 for 2.25 kg. These are examples, not automatically published business rates. Logistics enters its actual fees, included weight and maximum parcel weight. Weight is the sum of seller-entered packed item weights times quantity. Sellers enter grams through Inventory.

Both pickup and destination must match published barangay coverage. Missing weights, over-limit parcels, paused coverage and inactive centers cannot receive a quote. No kilometer-distance, dimensional/volumetric or island surcharges are calculated in this version. Rates can reflect the cost of serving different barangays without claiming measured road distance.

Draft setup leaves the existing flat-fee checkout available. Publishing the first rate enables logistics quotes permanently; pausing all rates thereafter blocks unsupported checkout rather than silently returning to legacy pricing. Plan coverage and seller weights before first publication.

Checkout recalculates fees on the server and rejects a stale displayed total. It snapshots provider, pickup address, packed weight, rate components and shipping fee. Later rate/product edits do not alter existing orders. Admin commission remains separate.

## Messaging and frontend organization

The floating inbox supports logistics accounts. New conversations offer approved admins, own riders, and buyers/sellers involved in own-center parcels. Other centers' contacts and parcels are excluded. Messages continue to use participant-based authorization.

Pages live in `resources/js/pages/logistics/`: `dashboard.tsx`, `parcels.tsx`, `shipping-rates.tsx`, and `reports.tsx`. Shared rider registration/account modals remain under management pages. The admin and logistics account controls use an icon; identity and actions appear when opened.

## Deployment

This release includes migration `2026_10_10_000000_add_logistics_shipping_and_parcel_processing`. No new `.env` values or sample-user seeders are required. The local migration has been applied. Merge the feature branch before deploying `main` on the VM.

Follow the backup and maintenance sequence in [admin-release.md](admin-release.md), including `docker compose build app`, recreating the app, `php artisan optimize:clear`, **`php artisan migrate --force`**, caching, restarting the queue and `php artisan up`. Run artisan commands inside the app container on the VM. Test registration email, rider review, quote setup, pickup/receipt/sorting/dispatch, messages and reports before publishing coverage.
