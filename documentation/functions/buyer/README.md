# Buyer Functions

Buyers discover products and place COD orders. Email/password Buyer registration requires a valid government ID (JPG, PNG or PDF, maximum 5 MB), stored privately with the application, and activates after email verification. Legacy/Google onboarding requires an ID application and Admin review. Cart/checkout and operational features require a verified approved account.

| Function | Current behavior |
| --- | --- |
| Browse | Search/filter products by category and view listing details |
| Cart | Add products, adjust quantities and remove items |
| Addresses | Manage saved delivery addresses |
| Checkout | Review server-calculated shipping and place COD orders split by seller |
| Orders | View fulfillment/delivery status and authorized proof of delivery |
| Cancellation | Cancel while all seller orders are pending; stock is restored |
| Support | Use order conversations and support/complaint threads |

Buyers communicate with sellers and receive rider/center status updates. They can select size/color options, apply one store voucher at checkout, search/filter their parcels and rate delivered items. Product pages show visible verified-purchase reviews. Whole-parcel returns now follow Admin approval, Logistics assignment, Rider collection, Seller receipt and recorded manual refund; original tracking/COD history stays intact. Automated bank/provider refunds and item-by-item partial returns are not implemented. See [finance and returns](../../FINANCE_AND_RETURNS.md) and [seller/buyer completion](../../SELLER_BUYER_COMPLETION.md).

Sources: `MarketplaceController`, `OrderController`, `SupportCaseController`, `CreateOrderFromCart`, `resources/views/pages/marketplace/`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
