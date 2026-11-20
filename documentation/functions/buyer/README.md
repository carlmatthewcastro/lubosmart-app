<div align="center">

# 👥 Buyer functions

**Buyer shopping, checkout, order and support capabilities.**

[🛒 Home](../../../README.md) · [📚 Documentation](../../README.md) · [Orders](../../workflows/ORDERS.md)

</div>

---

<a id="overview"></a>

## 🛒 Overview

This guide covers the implemented Buyer workspace and account requirements. It is for maintainers and reviewers following shopping, delivery tracking and return behavior.

<a id="how-it-works"></a>

## 🔄 How it works

Buyers discover products and place COD orders. Email/password Buyer registration requires a valid government ID (JPG, PNG or PDF, maximum 5 MB), stored privately with the application, and activates after email verification. Legacy/Google onboarding requires an ID application and Admin review. Cart/checkout and operational features require a verified approved account.

<a id="workspace-functions"></a>

## 👥 Workspace functions

| Function     | Current behavior                                                       |
| ------------ | ---------------------------------------------------------------------- |
| Browse       | Search/filter products by category and view listing details            |
| Cart         | Add products, adjust quantities and remove items                       |
| Addresses    | Manage saved delivery addresses                                        |
| Checkout     | Review server-calculated shipping and place COD orders split by Seller |
| Orders       | View fulfillment/delivery status and authorized proof of delivery      |
| Cancellation | Cancel while all Seller orders are pending; stock is restored          |
| Support      | Use order conversations and support/complaint threads                  |

<a id="orders-and-returns"></a>

## 🔄 Orders and returns

Buyers communicate with Sellers and receive rider/center status updates. They can select size/color options, apply one store voucher at checkout, search/filter their parcels and rate delivered items. Product pages show visible verified-purchase reviews. Current version-3 requests support eligible item quantities and Admin-approved Lubos Coins credits, with a separate physical-return task when required. Original tracking/COD history stays intact. Automatic bank/provider refunds are not implemented. See [finance and returns](../../workflows/FINANCE_AND_RETURNS.md).

<a id="source-references"></a>

## 📚 Source references

Sources: `MarketplaceController`, `OrderController`, `SupportCaseController`, `CreateOrderFromCart`, `resources/views/pages/marketplace/`.

<a id="related-documentation"></a>

## 📚 Related documentation

[Access rules](../../backend/README.md#accounts-and-access) · [Documentation](../../README.md)

---

<div align="center">

**LubosMart** · Buyer functions · [Back to Documentation](../../README.md)

</div>
