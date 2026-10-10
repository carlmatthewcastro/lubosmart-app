# Buyer Functions

Buyers discover products and place COD orders. Email verification, ID application and Admin approval are required for cart/checkout and other operational features.

| Function | Current behavior |
| --- | --- |
| Browse | Search/filter products by category and view listing details |
| Cart | Add products, adjust quantities and remove items |
| Addresses | Manage saved delivery addresses |
| Checkout | Review server-calculated shipping and place COD orders split by seller |
| Orders | View fulfillment/delivery status and authorized proof of delivery |
| Cancellation | Cancel while all seller orders are pending; stock is restored |
| Support | Use order conversations and support/complaint threads |

Buyers communicate with sellers and receive courier/center status updates. Variants, vouchers, ratings and complete returns/refunds are not implemented.

Sources: `MarketplaceController`, `OrderController`, `SupportCaseController`, `CreateOrderFromCart`, `resources/js/pages/marketplace/`.

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)
