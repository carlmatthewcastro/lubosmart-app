# LubosMart interface and testing guide

The interface uses a soft canvas, purple actions, clear spacing, rounded cards, and a shopping bag/cart logo with warm motion strokes and a swoosh. `public/logo.svg` is the lightweight website/favicon version; `public/logo.png` is the transparent full-resolution branding artwork. Both use the purple and warm-orange website palette. Navigation adapts to the signed-in role. On smaller screens the sidebar becomes a drawer, cards stack, controls wrap, and wide reports scroll inside their card. Forms include validation feedback, disabled submitting states, keyboard focus, and useful empty states. Motion respects the operating system’s reduced-motion preference.

Registration has a responsive page at `/register`, with descriptive role cards, password visibility controls, matching feedback, and role-specific next steps. The homepage signup dialog uses the same form. New buyers can shop after email verification. Partners finish a saved, step-based application for approval; the seller category dropdown appears in that application. Invalid submissions open and focus the relevant step. Google signup retains the selected role.

## Connected screens

| Role | Working screens and actions |
| --- | --- |
| Everyone | Home, public catalog search/category filters, product descriptions, authentication, account settings |
| Buyer | Dashboard, shopping bag quantity/removal controls, saved delivery addresses, COD checkout, order tracking, private delivery proof download, order conversation, cancellation before preparation |
| Seller | Dashboard, inventory creation/editing, optional product photo upload, published/hidden listings, stock/pricing, fulfillment, printable internal waybills, order conversation, completed sales reports |
| Logistics | Dashboard, rider application/account review, ready parcel receipt, approved center rider assignment, delivery monitoring, COD cash receipt, completed parcel reports |
| Rider | Dashboard, assigned pickup confirmation, transit status, private delivery photo upload, COD collection confirmation, completed delivery history |
| Admin | Dashboard, buyer/seller/logistics review, account suspension/reactivation, order/parcel monitoring, COD reconciliation, sales/commission reports, audited delivery fee and commission settings |

Order messages are stored conversation threads, refreshed when the page reloads; they are not live chat. Parcel status is updated by participants; this is not GPS tracking. Reports use saved transaction amounts. COD value is not courier earnings. Seller proceeds are calculated amounts, not a confirmation of seller payout.

## Persistent test logins

Run the setup once on a local database:

```powershell
php artisan migrate
php artisan storage:link
php artisan lubosmart:test-accounts --demo
npm.cmd run build
php artisan serve
```

The private login document is [storage/app/private/local-test-accounts.md](../storage/app/private/local-test-accounts.md), generated locally and ignored by Git. It contains each role’s email and actual password. Email format: `lubosmart-admin@testing.app`, `lubosmart-buyer@testing.app`, `lubosmart-seller@testing.app`, `lubosmart-rider@testing.app`, and `lubosmart-logistics@testing.app`.

Restarting `artisan serve` preserves credentials. Keep the same database. The command also preserves existing accounts, account status, and passwords; it adopts legacy `ROLE@testing.lubosmart.invalid` accounts without duplicating them. If an older password is unknown, run `php artisan lubosmart:test-accounts --reset-passwords` once. This intentionally resets only the reserved synthetic test accounts and updates the private guide. Test provisioning refuses production environments.

`--demo` adds three clearly labeled sample products, one synthetic buyer address, and test rider membership in the test logistics center. Repeat runs do not restore stock, overwrite products, or create sample purchases. All orders you create are actual local records.

The current local database also contains one completed, reconciled synthetic order created during the browser acceptance check. It lets you see populated tracking and reports immediately. A restart preserves this order as well.

## Manual journey

1. Buyer: `/shop` → add an item → `/cart` → select an address → Place COD order.
2. Seller: `/orders` → Start preparing → print waybill → Mark ready for pickup.
3. Logistics: `/deliveries` → receive the ready parcel into the test center → assign Rider Test.
4. Rider: `/deliveries` → Confirm pickup → Start delivery → upload a synthetic photo → confirm delivery and COD collection.
5. Logistics: Confirm cash received. Admin: Reconcile COD.
6. Buyer/seller: open the order conversation and exchange messages. Check completed reports for each operational role.
7. Repeat with an unprepared purchase and cancel it as buyer; stock should restore exactly once. Preparation prevents cancellation.
8. Check all roles on narrow mobile, tablet, and desktop widths. Test sidebar opening/closing, keyboard navigation, empty results, failed validation, and repeated submit clicks.

## Remaining modules

Product variations, vouchers, wishlist, ratings, returns/refunds, disputes, announcements, live chat, GPS routing, service-area automation, courier earnings, and seller payout/settlement remain future work. The current release provides the connected COD journey described above. Complete real provider, mail, deployment, and MySQL concurrency acceptance before live use.

## Registration and account settings

Signup starts with email, password, password confirmation and account role. Display name is edited later in Profile; legal name is entered in the partner application. Login and signup show short warnings under fields instead of native browser pop-ups. Sellers choose a store name and active marketplace department in the later business application step. Phone OTP, Facebook login, and QR login are not implemented.

The homepage uses four generated sample photographs under `public/images/marketplace-*-v2.jpg`, showing local goods on consistent lavender and cream studio backgrounds. These are presentation assets, not actual seller listings or inventory. Optimized local JPEGs total about 270 KB; category images load lazily and reserve their aspect ratio, while the hero has high fetch priority. Decorative dots, badges, the illustrated plant and the footer back-to-top link have been removed. Login and signup email fields use visible labels without sample email placeholders.

Marketplace and workspace pages share a consistent layout for headers, cards, buttons, fields, status messages and empty states. This applies to dashboards, catalog, bag, orders, inventory, deliveries, reports, applications/reviews and account management. Headers omit the repeated slogan, messages use concise text, and empty states use plain headings with useful actions. Fields have associated labels, error descriptions and purple focus styling. Inventory thumbnails use actual product uploads; missing product photos are labelled rather than filled with sample images.

Catalog search shows the product count and applied filters. **Clear filters** resets search and category; an empty filtered result offers **Browse all products**. Search controls stack on smaller screens. The redundant promotional banner and decorative package icons have been removed. Dashboard greetings, stats and workspace shortcuts use the same restrained style, without decorative arrows or unrelated stat icons.

Email signup sends the existing verification link. New buyers can shop after verification without an ID application. Partners complete their application and submit required documents for review; they can save drafts and return later. Google signup accepts only Google-verified email addresses, activates new buyers, and still requires partner application review. Local `MAIL_MAILER=log` writes verification messages to `storage/logs/laravel.log`; configure a delivery mailer for real inbox delivery. See [onboarding implementation decisions](onboarding-design-decisions.md) for the applied document recommendations and test steps.

After signup, Settings → Profile edits name, email, and optional contact phone; changing email clears verification and the user must verify it again. Settings → Password changes the password using the current password. Settings → Addresses adds, edits, removes, and chooses a default delivery address. These settings are available while the application is pending. Registration addresses remain part of the application and cannot be edited or deleted through delivery settings. Existing orders retain their delivery snapshots when saved addresses change. Checkout lists the default address first.
