# Buyer and Seller logic verification

Date: 2026-11-01, Asia/Manila. Follow-up to the role audit, using the current local
working tree. Existing uncommitted work was preserved. No deployment, commit,
push, configured-database migration or actual money transfer was performed.

## Defects corrected

| Trigger | Previous behavior | Corrected behavior |
| --- | --- | --- |
| A product category/department becomes inactive, or the product falls outside its store's registered department | Category-ineligible products could be added directly to the cart; department mismatches could also appear in discovery even though checkout rejected them | Catalog, details, wishlist and cart additions share the product availability rule; existing cart lines report availability and can still be removed |
| A Buyer checks out after a flat delivery fee changes | The browser omitted its reviewed shipping amount in flat-fee mode | Flat-fee and provider-based checkout both send the reviewed shipping amount; a mismatch rejects checkout before orders/stock changes |
| A Buyer purchases while a Seller has a stock editor open | Saving the older form could replace reduced stock with an outdated quantity | Product and size/color forms send their original product/option quantities; the server compares them under locks and rejects stale edits with instructions to reopen the editor |
| Stock drops below a Buyer's cart quantity by more than one unit | Minus could repeatedly submit a quantity still above available stock and be rejected | Minus reduces directly to the available quantity, or asks for removal when none remains |

Stock snapshot fields are additive and optional for compatibility with existing
callers. The application inventory forms always send them. They protect stale
forms; Sellers retain their existing authority to deliberately restock their own
products after reviewing current quantities. No stock reservation was added to
the cart, and checkout remains the authoritative stock deduction boundary.

## Coverage and results

`tests/Feature/BuyerSellerIntegrityTest.php` adds **12 passing cases, 163 assertions**.
Seven of its first ten cases failed before the corrections and passed afterward.
The two additional last-unit cases exercise both base products and variants:
two Buyers hold a cart line, the first purchases, the second is refused without
losing the cart, cancellation releases stock once, and the second can retry
without an idempotent replay deducting stock again. These are interleaved
requests, not a claim of concurrent MySQL load testing.

| Function group | Verification evidence |
| --- | --- |
| Discovery, departments, details, wishlist | MarketplaceFlowTest, WishlistTest, HomepageProductsTest, BuyerSellerIntegrityTest; browser product/review and saved-product evidence from the earlier role audit |
| Cart quantities, ownership and option stock | MarketplaceFlowTest, MarketplaceExtensionsTest, BuyerSellerIntegrityTest; browser separate-option cart and live stock behavior |
| Addresses and protected settings | Settings/AddressControllerTest, Settings/ProfileSecurityTest, SellerWorkspaceTest; existing browser address selection and settings journey |
| Shipping, COD totals, price changes and checkout retry | Checkout/CreateOrderFromCartTest, Logistics/LogisticsWorkspaceTest, MarketplaceFlowTest, BuyerSellerIntegrityTest; browser request payload and voucher checkout |
| Vouchers, expiry, capacity, store scope and cancellation reuse | MarketplaceExtensionsTest; browser Seller voucher creation and Buyer discount checkout |
| Product edits, images, variants and stock | MarketplaceFlowTest, SellerWorkspaceTest, MarketplaceExtensionsTest, BuyerSellerIntegrityTest; browser inventory restock/options and stale edit after a separate Buyer purchase |
| Preparation, pickup connection, waybills and tracking | SellerWorkspaceTest, BuyerWorkspaceTest, MarketplaceFlowTest, Logistics/LogisticsWorkspaceTest; browser preparation, barcode and print-request journey |
| Cancellation and restored stock | MarketplaceFlowTest, MarketplaceExtensionsTest, SettlementAndReturnsTest, BuyerSellerIntegrityTest; state/replay/variant coverage |
| Purchase reviews and moderation | MarketplaceExtensionsTest; browser verified review, Admin moderation and public rating removal |
| Messages and updates | BuyerWorkspaceTest, AdminManagementTest, WorkspaceStatusTest; separate Seller session updates Buyer page while preserving a draft |
| Sales reports, CSV, costs, proceeds and payouts | AdminManagementTest, SettlementAndReturnsTest; browser reports/settings and finance journey |
| Returns, received goods, restock and refunds | SettlementAndReturnsTest; browser Buyer request, Admin decision, Logistics assignment, Rider collection, Seller receipt and manual refund |

Backend validation after the fixes:

- The focused Buyer/Seller suite passed **139 tests / 1,696 assertions** before
  adding the last two last-unit cases. The final full run includes all 12 new cases.
- Full suite: **1,086 passed, 3 failed, 3 skipped; 8,766 assertions**.
- The three failures are unchanged from the preceding audit: Logistics metric
  count expectation and two legacy Logistics profile-mutation expectations.
  See [role audit](ROLE_FEATURE_AUDIT_2026_11_01.md). There are no new backend failures.
- TypeScript, targeted ESLint, Prettier, PHP Pint and production build passed.

The final browser suite passed **17 scenarios**, including the actual outgoing
inventory and checkout payloads, stale stock rejection/recovery after a separate
Buyer session purchases, and the cart minus control after stock falls. Results
and screenshots are stored under `storage/app/seller-workspace-ui-check/`.
The run also checks mobile/light/dark reflow and the connected manual
payout/payment/return/refund journey. No browser runtime exceptions or console
errors were reported in the final run. The harness overwrites its previous
`results.json` and screenshots. An earlier attempt stopped during the finance
journey while assets were being rebuilt; the final run used a completed,
unchanging production build and passed the entire journey.

## Verification limits

This verifies local source behavior with disposable SQLite fixtures and synthetic
accounts. Real transactional email, Google OAuth, physical scanner/printer and
delivery-proof devices, production MySQL contention, recovery/backup restoration,
full accessibility and deployed acceptance still need their own checks. A passing
suite is evidence for the covered paths, not a guarantee for every environment or
every possible failure. COD payouts/refunds remain manually recorded transfers.
