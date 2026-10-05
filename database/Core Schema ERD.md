# Core marketplace database

This schema supports a multi-seller ecommerce MVP. A buyer can check out a cart containing products from multiple stores. The checkout is one parent order, split into one seller order and one delivery per store.

Laravel also creates framework-support tables such as `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, and `migrations`. Those are not marketplace tables.

## Order lifecycle

```text
buyer
  └── order (one checkout; shipping address is snapshotted)
       ├── seller order (one per store)
       │    ├── order items (product name and price are snapshotted)
       │    └── delivery (one per seller order)
       └── seller order ...
```

The unique constraint on `(order_id, store_id)` prevents duplicate seller orders for the same store in one checkout. A unique `deliveries.seller_order_id` enforces the MVP rule of one package per seller order. These can be relaxed later if the product needs split packages.

## Tables

### users

All account roles share Laravel's `users` table.

- `id` primary key
- `role`: `buyer`, `seller`, `admin`, `logistics`, or `rider`
- `name` (160), unique `email` (160), hashed `password`
- `phone` (30), nullable
- `status`: `active`, `pending`, or `suspended`
- Laravel authentication fields: `email_verified_at`, `remember_token`, timestamps

### stores

One storefront per seller account.

- `user_id` is a unique FK to `users`
- `name` (160), nullable `description`, `status`: `pending`, `approved`, or `rejected`
- timestamps

The database does not enforce that `user_id` belongs to a user whose role is `seller`; the application must enforce that.

### categories

Flat taxonomy for the MVP: unique `name` (100), timestamps.

### carts

One cart per buyer, created as needed. `user_id` is a unique FK to `users`.

### addresses

Saved buyer delivery addresses:

- `user_id` FK, `label`, `recipient_name`, and `phone`
- `line1`, optional `line2`, `barangay`, `city`, `province`, `region`, and `zip`
- `is_default` and timestamps

The database cannot guarantee that `is_default` is true for at most one address per user with a portable simple constraint; address-management logic must maintain that rule.

### products

Each product belongs to one store and one category.

- FKs: `store_id`, `category_id`
- `name`, nullable `description`, `price` (`decimal(10,2)`), unsigned `stock`
- nullable `image_path`, `status`: `active` or `hidden`
- indexes for category/store product listings by status; timestamps

Hide products rather than hard-delete them once they have been ordered. The order item FK intentionally protects historical references.

### cart_items

- FKs: `cart_id`, `product_id`
- unsigned `quantity`
- unique `(cart_id, product_id)`: adding the same product updates quantity instead of creating a duplicate row

### orders

One row per buyer checkout:

- `buyer_id` FK to `users`
- nullable `address_id` FK to `addresses` with `nullOnDelete`
- immutable shipping snapshot: recipient name/phone and address lines, barangay, city, province, region, and zip
- `payment_method`: `cod` for the MVP
- `subtotal`, `shipping_total`, and `total` (`decimal(10,2)`)
- aggregate `status`: `pending`, `processing`, `completed`, or `cancelled`
- timestamps and an index on `(buyer_id, created_at)`

The snapshot is authoritative for fulfillment. Editing or deleting a saved address must not alter an old order. The nullable FK only identifies the source address while it still exists.

`orders.status` is the buyer-facing summary of its seller orders; application logic must keep it consistent with the child records.

### seller_orders

One row per store participating in a checkout:

- `order_id` FK to `orders`, `store_id` FK to `stores`
- unique `(order_id, store_id)`
- snapshotted `subtotal` and `shipping_fee` (`decimal(10,2)`)
- seller fulfillment `status`: `pending`, `processing`, `shipped`, `completed`, or `cancelled`
- timestamps and an index on `(store_id, status)`

This is the seller's fulfillment boundary. Different stores in the same checkout can progress independently.

### order_items

Line items belong to a seller order, not directly to the parent checkout:

- `seller_order_id` FK to `seller_orders`
- `product_id` FK to `products`
- `product_name` and `price_each` snapshots
- unsigned `quantity`
- unique `(seller_order_id, product_id)`

The application must verify that each product belongs to the store on its seller order. `price_each` is the checkout-time price; later product price changes do not affect completed orders.

### deliveries

One delivery per seller order for the MVP:

- unique `seller_order_id` FK to `seller_orders`
- nullable `rider_id` FK to `users`
- `status`: `unassigned`, `assigned`, `picked_up`, `in_transit`, `delivered`, or `failed`
- nullable `proof_photo_path`, `picked_up_at`, `delivered_at`, and timestamps

The application must verify that the assigned account has the `rider` role. The delivery status tracks transport; the seller order status tracks seller fulfillment.

### commerce_settings

The singleton row with `id = 1` stores `shipping_fee_per_seller_order`. It is seeded to `50.00` and can be updated by an authorized admin operation; the browser must never supply the amount used by checkout.

## Checkout integrity rules

`CreateOrderFromCart` runs checkout in one database transaction. It reloads and locks the buyer account, cart, product rows in ascending product ID order, and participating stores in ascending ID order. It validates that the buyer owns the address and the products are active and from approved stores, checks available stock, and conditionally decrements each stock quantity. A failure rolls back the order, seller orders, order items, deliveries, stock changes, and cart clearing together.

The parent order subtotal is the sum of all checkout-time item prices times quantities. Each seller order stores its own item subtotal and the current configured flat shipping fee. `orders.shipping_total` is that fee multiplied by the number of stores represented in the cart; `orders.total` is subtotal plus shipping total. All calculations use integer cents to avoid floating-point rounding errors. After a successful checkout, cart items are removed; the cart itself remains available for reuse.

## Migration workflow

The user/support migration creates `users` before any table references it. The marketplace migration then creates tables in foreign-key dependency order.

For an empty, disposable local database, rebuild the schema with:

```sh
php artisan migrate:fresh
```

This command drops every table in the selected database. Never run it against a database containing data to keep or against production. Use `php artisan migrate` for normal additive changes and production deployments.

The initial checkout uses COD only. Payment gateways, reviews, promotions, and notifications remain out of scope for this MVP. The shipping fee setting is persisted now; an admin settings screen and authorization policy still need to be implemented before an admin can change it through the website.
