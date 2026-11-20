<div align="center">

# 🔄 Shop vouchers

**Voucher visibility, selection, validation and usage rules.**

[🛒 Home](../../README.md) · [📚 Documentation](../README.md) · [Finance and returns](FINANCE_AND_RETURNS.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers implemented fixed-peso shop vouchers and checkout behavior. It is for maintainers and reviewers checking eligibility, discount funding and usage rules.

<a id="context"></a>

## 🔄 Context

Sellers manage fixed-peso store vouchers with minimum merchandise spend, expiry and use limits. Presets prefill editable settings; confirmation activates the promotion and generates a code. Existing manual vouchers stay private unless explicitly made public. See the [finance contract](FINANCE_AND_RETURNS.md#shop-vouchers-and-reporting) for the documented preset values and reporting context.

<a id="how-it-works"></a>

## 🔄 How it works

Public vouchers appear on product pages, store-filtered shop pages and cart/checkout. Buyers can select an eligible suggestion, review the recommended eligible discount and remove it. Preview does not consume a use.

<a id="checkout-validation"></a>

## 🧪 Checkout validation

Locked checkout revalidates store eligibility, activation, expiry, minimum spend, capacity and Buyer reuse. There is one voucher per checkout, no stacking and no free-shipping promotion. The discount applies only to its issuing store's merchandise and is capped by that subtotal; shipping is unchanged. Commission uses net merchandise after discount. Opt-in coins are applied afterward and do not count as another voucher discount.

<a id="cancellation-and-returns"></a>

## 🔄 Cancellation and returns

Cancellation releases usage under the supported cancellation rules. A completed return does not automatically restore it. Vouchers are Seller-funded discounts; they are not prepaid balances or gift cards.

Sources: [voucher controller](../../web/app/Http/Controllers/StoreVoucherController.php), [checkout action](../../web/app/Actions/Checkout/CreateOrderFromCart.php).

<a id="related-documentation"></a>

## 📚 Related documentation

[Workflow index](README.md)

---

<div align="center">

**LubosMart** · Shop vouchers · [Back to Documentation](../README.md)

</div>
