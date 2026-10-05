Day 1 · Matthew's task

# Core schema for the 37-day MVP

Ten marketplace tables cover the whole order lifecycle — buyer orders, seller fulfills, logistics assigns, rider delivers with proof, admin sees it all. Laravel also creates framework-support tables outside this core schema. **No payment gateway, reviews, promotions, or notifications tables** — those are descoped for this timeline. Start migrations in the order below; each tier only depends on tables above it.

## Build-order dependency map

An arrow means “the table it points from must exist first, because the table it points to holds a foreign key back to it.” Work top to bottom and nothing you build will reference a table that doesn't exist yet.

Five build tiers, users at the root. `categories` has no incoming arrow — it depends on nothing, build it any time before products.

foreign key dependency

nullable FK (set later, not at creation)

N build tier (migration order)

## Field reference

Every column in the marketplace tables, grouped the same way as the diagram above. Types are written as Laravel migration shorthand. The Laravel starter kit also creates `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, and `migrations`; these framework-support tables are not part of the marketplace ERD.

### users

tier 1

accounts & roles, shared by all 5 roles

- idbigintPK
- roleenum: buyer, seller, admin, logistics, rider
- namevarchar(160)
- emailvarchar(160), unique
- passwordvarchar, hashed
- phonevarchar(30), nullable
- statusenum: active, pending, suspended
- email_verified_attimestamp, nullable (Laravel authentication)
- remember_tokenvarchar(100), nullable (Laravel authentication)
- created_attimestamp, nullable
- updated_attimestamp, nullable, updated automatically

### stores

tier 2

one storefront per approved seller

- idbigintPK
- user_id→ users, uniqueFK
- namevarchar(160)
- descriptiontext, nullable
- statusenum: pending, approved, rejected
- created_attimestamp, nullable

`user_id` is unique, so each user can own at most one store. The foreign key does not enforce that the user has the `seller` role or that the store is approved; the application must enforce those rules.

### categories

tier 2

flat product taxonomy — no subcategories in the MVP

- idbigintPK
- namevarchar(100), unique

### carts

tier 2

one row per buyer, created on first add-to-cart

- idbigintPK
- user_id→ users, uniqueFK
- created_attimestamp, nullable

The foreign key does not enforce that the user has the `buyer` role; the application must enforce that rule.

### addresses

tier 2

buyer-saved shipping addresses

- idbigintPK
- user_id→ usersFK
- labelvarchar(40), e.g. "Home"
- line1varchar(200)
- cityvarchar(100)
- provincevarchar(100)
- zipvarchar(10)

### products

tier 3

listings owned by one store, one category

- idbigintPK
- store_id→ storesFK
- category_id→ categoriesFK
- namevarchar(160)
- descriptiontext, nullable
- pricedecimal(10,2)
- stockint, unsigned
- image_pathvarchar, nullable
- statusenum: active, hidden
- created_attimestamp, nullable

### cart_items

tier 4

one row per product in a cart

- idbigintPK
- cart_id→ cartsFK
- product_id→ productsFK
- quantityint, unsigned

unique(cart_id, product_id) — re-adding a product updates quantity instead of duplicating the row

### orders

tier 4

one checkout, with total and item prices snapshotted

- idbigintPK
- buyer_id→ usersFK
- address_id→ addressesFK
- payment_methodenum: cod — fixed for MVP
- totaldecimal(10,2)
- statusenum: pending, processing, shipped, completed, cancelled
- created_attimestamp, nullable

`address_id` references the buyer's saved address; it does not snapshot the address values. If orders must retain the shipping address as it was at checkout, add address snapshot columns to `orders`.

### order_items

tier 5

one row per product per order, owned by one seller

- idbigintPK
- order_id→ ordersFK
- product_id→ productsFK
- store_id→ stores, denormalizedFK
- quantityint, unsigned
- price_eachdecimal(10,2), snapshotted
- statusenum: pending, processing, shipped

store_id is copied from the product at order time so the seller's order screen never has to join through products

### deliveries

tier 5

one per order, assigned to a rider by logistics

- idbigintPK
- order_id→ orders, uniqueFK
- rider_id→ users, nullableFK
- statusenum: unassigned, assigned, picked_up, in_transit, delivered, failed
- proof_photo_pathvarchar, nullable
- picked_up_attimestamp, nullable
- delivered_attimestamp, nullable

## Turning this into migrations today

The migrations for the core marketplace tables have been created and run. This document describes the intended marketplace schema; the Laravel framework-support tables listed above are created separately by the starter kit.

Work tier by tier. Within a tier, order doesn't matter — across tiers, it does.

1. **Tier 1** — `php artisan make:migration create_users_table` if you haven't already extended Laravel's default; add the `role`, `phone`, and `status` columns to it.
2. **Tier 2** — `make:migration create_stores_table`, `create_categories_table`, `create_carts_table`, `create_addresses_table`. All four only need `users` to exist first.
3. **Tier 3** — `make:migration create_products_table`, referencing both `stores` and `categories`.
4. **Tier 4** — `make:migration create_cart_items_table` and `create_orders_table`.
5. **Tier 5** — `make:migration create_order_items_table` and `create_deliveries_table`.
6. Run `php artisan migrate` once after each tier, not just at the end — if a tier fails, you'll know exactly which table caused it.

```
Schema::create('order_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('order_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->constrained();
    $table->foreignId('store_id')->constrained();
    $table->unsignedInteger('quantity');
    $table->decimal('price_each', 10, 2);
    $table->enum('status', ['pending','processing','shipped'])->default('pending');
    $table->timestamps();
});
```

cut

**No payments, reviews, promotions, or notifications tables.** Payment is a fixed `cod` value on `orders`, not a separate gateway integration. If any of these come back as stretch goals once the core lifecycle passes UAT, they're additive — none of the ten tables above need to change shape to support them later.