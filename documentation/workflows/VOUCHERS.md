# Shop vouchers

Sellers manage fixed-peso store vouchers with minimum merchandise spend, expiry and use limits. Presets prefill editable settings; confirmation activates the promotion and generates a code. Existing manual vouchers stay private unless explicitly made public. See the [finance contract](FINANCE_AND_RETURNS.md#shop-vouchers-and-reporting) for the documented preset values and reporting context.

Public vouchers appear on product pages, store-filtered shop pages and cart/checkout. Buyers can select an eligible suggestion, review the recommended eligible discount and remove it. Preview does not consume a use.

Locked checkout revalidates store eligibility, activation, expiry, minimum spend, capacity and buyer reuse. There is one voucher per checkout, no stacking and no free-shipping promotion. The discount applies only to its issuing store's merchandise and is capped by that subtotal; shipping is unchanged. Commission uses net merchandise after discount. Opt-in coins are applied afterward and do not count as another voucher discount.

Cancellation releases usage under the supported cancellation rules. A completed return does not automatically restore it. Vouchers are seller-funded discounts; they are not prepaid balances or gift cards.

Sources: [voucher controller](../../app/Http/Controllers/StoreVoucherController.php), [checkout action](../../app/Actions/Checkout/CreateOrderFromCart.php), and [historical implementation details](../archive/reports/SELLER_BUYER_COMPLETION.md). This guide consolidates the documented contract; it does not claim new acceptance results.

[Workflow index](README.md)
