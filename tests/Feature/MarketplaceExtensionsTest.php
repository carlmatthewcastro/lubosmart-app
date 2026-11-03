<?php

use App\Models\Address;
use App\Models\Category;
use App\Models\ChangeRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\StoreVoucher;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function extensionShop(): array
{
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Options store '.$seller->id, 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Clothes']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Cotton shirt', 'price' => 100, 'stock' => 10, 'weight_grams' => 250, 'status' => 'active']);
    $address = Address::query()->create(['user_id' => $buyer->id, 'label' => 'Home', 'recipient_name' => 'Buyer', 'phone' => '09123456789', 'line1' => 'Test street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);

    return compact('buyer', 'seller', 'store', 'product', 'address');
}

function extensionVoucher(Store $store, array $changes = []): StoreVoucher
{
    return StoreVoucher::query()->create([...['store_id' => $store->id, 'code' => 'SAVE-'.$store->id, 'amount_cents' => 2500, 'minimum_cents' => 10000, 'usage_limit' => 10, 'expires_at' => now()->addDay(), 'is_active' => true], ...$changes]);
}

function extensionPurchase($test, array $shop, array $extra = []): SellerOrder
{
    $test->actingAs($shop['buyer'])->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $test->post('/checkout', ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(), ...$extra])->assertRedirect('/orders');

    return SellerOrder::query()->latest('id')->firstOrFail();
}

test('seller creates size color options with independent stocks and only owns its products', function () {
    $shop = extensionShop();
    $other = extensionShop();
    $options = ['variants' => [['id' => null, 'name' => 'Small / Purple', 'stock' => 3, 'is_active' => true], ['id' => null, 'name' => 'Large / Orange', 'stock' => 4, 'is_active' => true]]];

    $this->actingAs($shop['seller'])->put('/inventory/'.$shop['product']->id.'/variants', $options)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('products', ['id' => $shop['product']->id, 'stock' => 7]);
    $this->assertDatabaseHas('product_variants', ['product_id' => $shop['product']->id, 'name' => 'Small / Purple', 'stock' => 3]);
    $this->put('/inventory/'.$other['product']->id.'/variants', $options)->assertForbidden();
    $this->actingAs($shop['buyer'])->put('/inventory/'.$shop['product']->id.'/variants', $options)->assertForbidden();
});

test('variant validation rejects duplicate names foreign identifiers and invalid stock', function () {
    $shop = extensionShop();
    $other = extensionShop();
    $foreign = ProductVariant::query()->create(['product_id' => $other['product']->id, 'name' => 'Other', 'stock' => 1]);
    $this->actingAs($shop['seller']);
    $this->put('/inventory/'.$shop['product']->id.'/variants', ['variants' => [['id' => $foreign->id, 'name' => 'Other', 'stock' => 2, 'is_active' => true]]])->assertSessionHasErrors('variants');
    $this->put('/inventory/'.$shop['product']->id.'/variants', ['variants' => [['name' => 'Small', 'stock' => 1, 'is_active' => true], ['name' => ' small ', 'stock' => 1, 'is_active' => true]]])->assertSessionHasErrors('variants');
    $this->put('/inventory/'.$shop['product']->id.'/variants', ['variants' => [['name' => 'Small', 'stock' => -1, 'is_active' => true]]])->assertSessionHasErrors('variants.0.stock');
    $this->assertDatabaseMissing('product_variants', ['product_id' => $shop['product']->id]);
});

test('two options of one product remain separate through checkout and cancellation restores each stock exactly once', function () {
    $shop = extensionShop();
    $small = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Small', 'stock' => 3]);
    $large = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Large', 'stock' => 7]);
    $this->actingAs($shop['buyer']);
    foreach ([$small, $large] as $variant) {
        $this->put('/cart/'.$shop['product']->id, ['quantity' => 2, 'product_variant_id' => $variant->id])->assertSessionHasNoErrors();
    }
    $this->post('/checkout', ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid()])->assertRedirect('/orders');
    $parcel = SellerOrder::query()->firstOrFail();
    expect($parcel->items)->toHaveCount(2);
    $this->assertDatabaseHas('order_items', ['seller_order_id' => $parcel->id, 'variant_name' => 'Small', 'quantity' => 2]);
    expect($small->fresh()->stock)->toBe(1);
    expect($large->fresh()->stock)->toBe(5);
    expect($parcel->subtotal)->toBe('400.00');
    $this->post('/purchases/'.$parcel->order_id.'/cancel')->assertSessionHasNoErrors();
    $this->post('/purchases/'.$parcel->order_id.'/cancel')->assertStatus(409);
    expect($small->fresh()->stock)->toBe(3);
    expect($large->fresh()->stock)->toBe(7);
    expect($shop['product']->fresh()->stock)->toBe(10);
});

test('cart rejects missing foreign retired and oversold options while allowing retired lines to be removed', function () {
    $shop = extensionShop();
    $other = extensionShop();
    $variant = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Small', 'stock' => 1]);
    $foreign = ProductVariant::query()->create(['product_id' => $other['product']->id, 'name' => 'Other', 'stock' => 4]);
    $this->actingAs($shop['buyer']);
    foreach ([['quantity' => 1], ['quantity' => 1, 'product_variant_id' => $foreign->id], ['quantity' => 2, 'product_variant_id' => $variant->id]] as $payload) {
        $this->put('/cart/'.$shop['product']->id, $payload)->assertSessionHasErrors('quantity');
    }
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 1, 'product_variant_id' => $variant->id])->assertSessionHasNoErrors();
    $variant->update(['is_active' => false]);
    $this->post('/checkout', ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid()])->assertSessionHasErrors('cart');
    $this->assertDatabaseCount('orders', 0);
    expect($variant->fresh()->stock)->toBe(1);
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 0, 'product_variant_id' => $variant->id])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('cart_items', 0);
});

test('seller voucher management normalizes codes and rejects other stores and buyers', function () {
    $shop = extensionShop();
    $other = extensionShop();
    $this->actingAs($shop['seller'])->post('/seller/vouchers', ['code' => 'welcome-25', 'amount' => '25', 'minimum' => '100', 'usage_limit' => 5, 'expires_at' => now()->addDay()->toIso8601String()])->assertSessionHasNoErrors();
    $voucher = StoreVoucher::query()->firstOrFail();
    $this->assertDatabaseHas('store_vouchers', ['id' => $voucher->id, 'code' => 'WELCOME-25', 'store_id' => $shop['store']->id, 'amount_cents' => 2500]);
    $this->actingAs($other['seller'])->patch('/seller/vouchers/'.$voucher->id, ['is_active' => false])->assertForbidden();
    $this->actingAs($shop['buyer'])->post('/seller/vouchers', [])->assertForbidden();
    $this->actingAs($shop['seller'])->patch('/seller/vouchers/'.$voucher->id, ['is_active' => false])->assertSessionHasNoErrors();
    expect($voucher->fresh()->is_active)->toBeFalse();
});

test('voucher is previewed and snapshotted once and idempotent checkout cannot consume a second use', function () {
    $shop = extensionShop();
    $voucher = extensionVoucher($shop['store']);
    $key = (string) Str::uuid();
    $this->actingAs($shop['buyer'])->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $this->postJson('/cart/voucher', ['voucher_code' => strtolower($voucher->code)])->assertJsonPath('discount_cents', 2500)->assertHeader('Cache-Control', 'no-store, private');
    $data = ['address_id' => $shop['address']->id, 'checkout_key' => $key, 'voucher_code' => $voucher->code, 'expected_discount_total' => '25.00'];
    $this->post('/checkout', $data)->assertRedirect('/orders');
    $this->post('/checkout', $data)->assertRedirect('/orders');
    $this->assertDatabaseCount('orders', 1);
    $this->assertDatabaseHas('seller_orders', ['store_voucher_id' => $voucher->id, 'discount_amount' => 25, 'subtotal' => 175, 'shipping_fee' => 50]);
    $this->assertDatabaseHas('orders', ['buyer_id' => $shop['buyer']->id, 'total' => 225]);
    expect($shop['product']->fresh()->stock)->toBe(8);
});

test('voucher discount cannot spill into other stores or shipping', function () {
    $shop = extensionShop();
    $other = extensionShop();
    $voucher = extensionVoucher($shop['store'], ['amount_cents' => 99900]);
    $this->actingAs($shop['buyer']);
    foreach ([$shop['product'], $other['product']] as $product) {
        $this->put('/cart/'.$product->id, ['quantity' => 1])->assertSessionHasNoErrors();
    }
    $this->post('/checkout', ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(), 'voucher_code' => $voucher->code, 'expected_discount_total' => '100'])->assertRedirect('/orders');
    $this->assertDatabaseHas('seller_orders', ['store_id' => $shop['store']->id, 'subtotal' => 0, 'discount_amount' => 100, 'shipping_fee' => 50]);
    $this->assertDatabaseHas('seller_orders', ['store_id' => $other['store']->id, 'subtotal' => 100, 'discount_amount' => 0, 'shipping_fee' => 50]);
    expect(Order::query()->firstOrFail()->total)->toBe('200.00');
});

test('invalid expired paused minimum and stale discount vouchers fail without changing orders or stock', function () {
    $shop = extensionShop();
    $voucher = extensionVoucher($shop['store']);
    $this->actingAs($shop['buyer'])->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $data = ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(), 'voucher_code' => $voucher->code, 'expected_discount_total' => '1'];
    $this->post('/checkout', $data)->assertSessionHasErrors('voucher_code');
    foreach ([['is_active' => false], ['is_active' => true, 'expires_at' => now()->subDay()], ['expires_at' => now()->addDay(), 'minimum_cents' => 30000]] as $changes) {
        $voucher->update($changes);
        $this->postJson('/cart/voucher', ['voucher_code' => $voucher->code])->assertUnprocessable()->assertJsonValidationErrors('voucher_code');
    }
    $this->postJson('/cart/voucher', ['voucher_code' => 'UNKNOWN'])->assertUnprocessable();
    $this->assertDatabaseCount('orders', 0);
    expect($shop['product']->fresh()->stock)->toBe(10);
});

test('voucher capacity and buyer reuse are enforced and cancellation releases the use', function () {
    $shop = extensionShop();
    $voucher = extensionVoucher($shop['store'], ['usage_limit' => 1]);
    $parcel = extensionPurchase($this, $shop, ['voucher_code' => $voucher->code, 'expected_discount_total' => '25']);
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $this->postJson('/cart/voucher', ['voucher_code' => $voucher->code])->assertUnprocessable();
    $this->post('/purchases/'.$parcel->order_id.'/cancel')->assertSessionHasNoErrors();
    $this->postJson('/cart/voucher', ['voucher_code' => $voucher->code])->assertJsonPath('discount_cents', 2500);
});

test('voucher buyer reuse and global capacity are separate restrictions', function () {
    $shop = extensionShop();
    $voucher = extensionVoucher($shop['store'], ['usage_limit' => 10]);
    extensionPurchase($this, $shop, ['voucher_code' => $voucher->code, 'expected_discount_total' => '25']);
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $this->postJson('/cart/voucher', ['voucher_code' => $voucher->code])->assertUnprocessable();
    $this->actingAs(User::factory()->create())->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $this->postJson('/cart/voucher', ['voucher_code' => $voucher->code])->assertJsonPath('discount_cents', 2500);
    $voucher->update(['usage_limit' => 1]);
    $this->postJson('/cart/voucher', ['voucher_code' => $voucher->code])->assertUnprocessable();
});

test('retired options keep their identity and stock and product edits cannot overwrite option totals', function () {
    $shop = extensionShop();
    $small = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Small', 'stock' => 3]);
    $large = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Large', 'stock' => 7]);
    $this->actingAs($shop['seller'])->put('/inventory/'.$shop['product']->id.'/variants', ['variants' => [['id' => $small->id, 'name' => 'Small', 'stock' => 4, 'is_active' => true]]])->assertSessionHasNoErrors();
    expect($large->fresh()->is_active)->toBeFalse();
    expect($large->fresh()->stock)->toBe(7);
    $this->put('/inventory/'.$shop['product']->id, ['name' => 'Edited shirt', 'price' => 100, 'category_id' => $shop['product']->category_id, 'stock' => 999, 'status' => 'active'])->assertSessionHasNoErrors();
    expect($shop['product']->fresh()->stock)->toBe(11);
    $this->put('/inventory/'.$shop['product']->id.'/variants', ['variants' => [['id' => $small->id, 'name' => 'Small', 'stock' => 1000000, 'is_active' => true]]])->assertSessionHasErrors('variants');
    expect($small->fresh()->stock)->toBe(4);
});

test('supported logistics reverification blocks affiliated rider work and approval preserves the center connection', function () {
    Notification::fake();
    Storage::fake('local');
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    $center->forceFill(['company_user_id' => $operator->id])->save();
    $operator->application()->create(['requested_role' => 'logistics', 'status' => 'approved', 'business_name' => $center->name, 'sec_number' => 'CS202012345', 'tin' => '123-456-789-115']);
    $data = ['company_name' => 'Updated Logistics Company', 'sec_registration_number' => 'CS202099999', 'tin' => '987-654-321-115'];
    foreach (['identity', 'sec_certificate', 'bir_2303', 'business_permit'] as $kind) {
        $data[$kind] = UploadedFile::fake()->create($kind.'.pdf', 10, 'application/pdf');
    }
    $this->actingAs($operator)->postJson('/api/account/reverification', $data)->assertCreated();
    expect($operator->fresh()->status)->toBe('pending_reverification');
    $this->actingAs($rider, 'web')->get('/deliveries')->assertForbidden();
    $request = ChangeRequest::query()->where('account_id', $operator->id)->where('field', 'reverification')->firstOrFail();
    Auth::forgetGuards();
    $this->actingAs(User::factory()->create(['role' => 'admin']), 'web')->postJson('/api/admin/change-requests/'.$request->id.'/approve')->assertOk();
    expect($center->fresh()->name)->toBe('Updated Logistics Company');
    expect($rider->fresh()->logistics_center_id)->toBe($center->id);
    Auth::forgetGuards();
    $this->actingAs($rider->fresh(), 'web')->get('/deliveries')->assertOk();
    $this->assertDatabaseCount('logistics_centers', 1);
});

test('only the purchasing buyer can rate a delivered item and edits retain one review', function () {
    $shop = extensionShop();
    $parcel = extensionPurchase($this, $shop);
    $item = $parcel->items->first();
    $data = ['rating' => 4, 'body' => 'Good quality cotton.'];
    $this->post('/order-items/'.$item->id.'/review', $data)->assertStatus(409);
    $parcel->update(['status' => 'completed']);
    $parcel->delivery->update(['status' => 'delivered']);
    $this->actingAs(User::factory()->create())->post('/order-items/'.$item->id.'/review', $data)->assertForbidden();
    $this->actingAs($shop['seller'])->post('/order-items/'.$item->id.'/review', $data)->assertForbidden();
    $this->actingAs($shop['buyer'])->post('/order-items/'.$item->id.'/review', $data)->assertSessionHasNoErrors();
    $this->post('/order-items/'.$item->id.'/review', ['rating' => 5, 'body' => 'Still happy with this shirt.'])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('product_reviews', 1);
    $this->assertDatabaseHas('product_reviews', ['order_item_id' => $item->id, 'rating' => 5]);
    $this->get('/products/'.$shop['product']->id)->assertInertia(fn (Assert $page) => $page->where('product.reviews_count', 1)->where('product.reviews_avg_rating', fn ($value) => (float) $value === 5.0)->missing('reviews.data.0.user_id'));
});

test('review validation rejects out of range stars and excessive text', function () {
    $shop = extensionShop();
    $parcel = extensionPurchase($this, $shop);
    $parcel->update(['status' => 'completed']);
    $parcel->delivery->update(['status' => 'delivered']);
    $this->post('/order-items/'.$parcel->items->first()->id.'/review', ['rating' => 6, 'body' => str_repeat('x', 2001)])->assertSessionHasErrors(['rating', 'body']);
    $this->assertDatabaseCount('product_reviews', 0);
});

test('admin moderation hides reviews from public averages and buyer edits cannot bypass moderation', function () {
    $shop = extensionShop();
    $parcel = extensionPurchase($this, $shop);
    $parcel->update(['status' => 'completed']);
    $parcel->delivery->update(['status' => 'delivered']);
    $item = $parcel->items->first();
    $this->post('/order-items/'.$item->id.'/review', ['rating' => 3, 'body' => 'A review for moderation.'])->assertSessionHasNoErrors();
    $review = ProductReview::query()->firstOrFail();
    $this->actingAs($shop['seller'])->patch('/admin/product-reviews/'.$review->id, ['is_visible' => false, 'reason' => 'Test reason'])->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->patch('/admin/product-reviews/'.$review->id, ['is_visible' => false, 'reason' => 'Contains private contact details'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('audit_events', ['subject_id' => $shop['product']->id, 'action' => 'review_moderated']);
    $this->actingAs($shop['buyer'])->post('/order-items/'.$item->id.'/review', ['rating' => 5, 'body' => 'Updated review text.'])->assertSessionHasNoErrors();
    expect($review->fresh()->is_visible)->toBeFalse();
    $this->get('/products/'.$shop['product']->id)->assertInertia(fn (Assert $page) => $page->where('product.reviews_count', 0)->has('reviews.data', 0));
    $shop['product']->update(['status' => 'hidden']);
    $this->get('/products/'.$shop['product']->id)->assertNotFound();
});
