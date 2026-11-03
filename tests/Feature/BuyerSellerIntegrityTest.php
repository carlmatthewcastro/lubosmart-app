<?php

use App\Models\Address;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function integrityShop(): array
{
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $department = Category::query()->create(['name' => 'Home']);
    $category = Category::query()->create(['name' => 'Bags', 'parent_id' => $department->id]);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Integrity store '.$seller->id, 'status' => 'approved', 'business_category_id' => $department->id]);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Integrity bag', 'price' => '100.25', 'stock' => 10, 'weight_grams' => 250, 'status' => 'active']);
    $address = Address::query()->create(['user_id' => $buyer->id, 'label' => 'Home', 'recipient_name' => 'Test Buyer', 'phone' => '09123456789', 'line1' => '10 Test Street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);

    return compact('buyer', 'seller', 'department', 'category', 'store', 'product', 'address');
}

test('ineligible categories cannot be discovered saved or added to a buyers cart', function (string $change) {
    $shop = integrityShop();
    match ($change) {
        'category' => $shop['category']->update(['is_active' => false]),
        'department' => $shop['department']->update(['is_active' => false]),
        'outside department' => $shop['store']->update(['business_category_id' => Category::query()->create(['name' => 'Food'])->id]),
    };

    $this->actingAs($shop['buyer'])->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->get('/products/'.$shop['product']->id)->assertNotFound();
    $this->post('/wishlist/'.$shop['product']->id, ['saved' => true])->assertNotFound();
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 1])->assertSessionHasErrors(['quantity' => 'This product is no longer available. Remove it or choose another product.']);
    $this->assertDatabaseCount('cart_items', 0);
    $this->assertDatabaseCount('product_wishlists', 0);
    expect($shop['product']->fresh()->stock)->toBe(10);
})->with(['category', 'department', 'outside department']);

test('registered department and child category products remain available to buyers', function (bool $useDepartment) {
    $shop = integrityShop();
    if ($useDepartment) {
        $shop['product']->update(['category_id' => $shop['department']->id]);
    }

    $this->actingAs($shop['buyer'])->get('/shop')->assertInertia(fn (Assert $page) => $page->where('products.data.0.id', $shop['product']->id));
    $this->get('/products/'.$shop['product']->id)->assertOk();
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 1])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('cart_items', ['product_id' => $shop['product']->id, 'quantity' => 1]);
})->with([false, true]);

test('a buyer can remove an existing line after its category becomes unavailable', function () {
    $shop = integrityShop();
    $this->actingAs($shop['buyer'])->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $shop['category']->update(['is_active' => false]);

    $this->get('/cart')->assertInertia(fn (Assert $page) => $page->where('items.0.product.is_available', false));
    $this->put('/cart/'.$shop['product']->id, ['quantity' => 0])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('cart_items', 0);
    expect($shop['product']->fresh()->stock)->toBe(10);
});

test('an outdated seller edit cannot restore stock purchased by a buyer', function () {
    $shop = integrityShop();
    $this->actingAs($shop['buyer'])->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $this->post('/checkout', ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid()])->assertRedirect('/orders');
    $data = ['name' => 'Updated bag', 'category_id' => $shop['category']->id, 'price' => '110.25', 'stock' => 10, 'expected_stock' => 10, 'status' => 'active'];

    $this->actingAs($shop['seller'])->put('/inventory/'.$shop['product']->id, $data)->assertSessionHasErrors(['stock' => 'Stock changed while this form was open. Close and reopen the product editor before saving.']);
    $this->assertDatabaseHas('products', ['id' => $shop['product']->id, 'stock' => 8, 'price' => 100.25, 'name' => 'Integrity bag']);
    $this->assertDatabaseHas('order_items', ['product_id' => $shop['product']->id, 'quantity' => 2, 'price_each' => 100.25]);

    $this->put('/inventory/'.$shop['product']->id, [...$data, 'stock' => 12, 'expected_stock' => 8])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('products', ['id' => $shop['product']->id, 'stock' => 12, 'price' => 110.25]);
});

test('an outdated option edit cannot replace independently changed variant quantities', function () {
    $shop = integrityShop();
    $small = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Small', 'stock' => 3]);
    $large = ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Large', 'stock' => 7]);
    $small->update(['stock' => 2]);
    $large->update(['stock' => 8]);
    $data = ['expected_stock' => 10, 'variants' => [
        ['id' => $small->id, 'name' => 'Small', 'stock' => 5, 'expected_stock' => 3, 'is_active' => true],
        ['id' => $large->id, 'name' => 'Large', 'stock' => 7, 'expected_stock' => 7, 'is_active' => true],
    ]];

    $this->actingAs($shop['seller'])->put('/inventory/'.$shop['product']->id.'/variants', $data)->assertSessionHasErrors('variants');
    expect($small->fresh()->stock)->toBe(2);
    expect($large->fresh()->stock)->toBe(8);
    expect($shop['product']->fresh()->stock)->toBe(10);

    $data['variants'][0]['expected_stock'] = 2;
    $data['variants'][1]['expected_stock'] = 8;
    $this->put('/inventory/'.$shop['product']->id.'/variants', $data)->assertSessionHasNoErrors();
    expect($small->fresh()->stock)->toBe(5);
    expect($shop['product']->fresh()->stock)->toBe(12);
});

test('adding first options rejects a product stock snapshot taken before checkout', function () {
    $shop = integrityShop();
    $shop['product']->update(['stock' => 8]);

    $this->actingAs($shop['seller'])->put('/inventory/'.$shop['product']->id.'/variants', ['expected_stock' => 10, 'variants' => [['name' => 'Small', 'stock' => 10, 'is_active' => true]]])->assertSessionHasErrors('variants');
    $this->assertDatabaseCount('product_variants', 0);
    expect($shop['product']->fresh()->stock)->toBe(8);
});

test('a changed reviewed flat shipping fee rejects checkout without losing the cart and permits a reviewed retry', function () {
    $shop = integrityShop();
    $this->actingAs($shop['buyer'])->put('/cart/'.$shop['product']->id, ['quantity' => 2])->assertSessionHasNoErrors();
    CommerceSetting::query()->findOrFail(1)->update(['shipping_fee_per_seller_order' => '75.00']);
    $data = ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid(), 'expected_items_subtotal' => '200.50', 'expected_shipping_total' => '50.00'];

    $this->post('/checkout', $data)->assertSessionHasErrors('shipping_fee');
    $this->assertDatabaseCount('orders', 0);
    $this->assertDatabaseHas('cart_items', ['product_id' => $shop['product']->id, 'quantity' => 2]);
    expect($shop['product']->fresh()->stock)->toBe(10);

    $this->post('/checkout', [...$data, 'expected_shipping_total' => '75.00'])->assertRedirect('/orders');
    $this->assertDatabaseHas('orders', ['buyer_id' => $shop['buyer']->id, 'subtotal' => 200.50, 'shipping_total' => 75, 'total' => 275.50]);
    expect($shop['product']->fresh()->stock)->toBe(8);
    expect(SellerOrder::query()->sole()->subtotal)->toBe('200.50');
});

test('two buyers cannot purchase the same last unit and cancellation releases it only once', function (bool $withVariant) {
    $shop = integrityShop();
    $shop['product']->update(['stock' => 1]);
    $variant = $withVariant ? ProductVariant::query()->create(['product_id' => $shop['product']->id, 'name' => 'Last small', 'stock' => 1]) : null;
    $other = User::factory()->create();
    $otherAddress = $shop['address']->replicate();
    $otherAddress->user_id = $other->id;
    $otherAddress->save();
    $line = ['quantity' => 1, 'product_variant_id' => $variant?->id];
    foreach ([$shop['buyer'], $other] as $buyer) {
        $this->actingAs($buyer)->put('/cart/'.$shop['product']->id, $line)->assertSessionHasNoErrors();
    }
    $first = ['address_id' => $shop['address']->id, 'checkout_key' => (string) Str::uuid()];
    $second = ['address_id' => $otherAddress->id, 'checkout_key' => (string) Str::uuid()];

    $this->actingAs($shop['buyer'])->post('/checkout', $first)->assertRedirect('/orders');
    $parcel = SellerOrder::query()->sole();
    $this->actingAs($other)->post('/checkout', $second)->assertSessionHasErrors('cart');
    $this->assertDatabaseCount('orders', 1);
    $this->assertDatabaseCount('cart_items', 1);
    expect($shop['product']->fresh()->stock)->toBe(0);
    if ($variant) {
        expect($variant->fresh()->stock)->toBe(0);
    }
    $this->actingAs($shop['buyer'])->post('/purchases/'.$parcel->order_id.'/cancel')->assertSessionHasNoErrors();
    $this->post('/purchases/'.$parcel->order_id.'/cancel')->assertConflict();
    expect($shop['product']->fresh()->stock)->toBe(1);
    $this->actingAs($other)->post('/checkout', $second)->assertRedirect('/orders');
    $this->post('/checkout', $second)->assertRedirect('/orders');
    $this->assertDatabaseCount('orders', 2);
    $this->assertDatabaseCount('cart_items', 0);
    expect($shop['product']->fresh()->stock)->toBe(0);
    if ($variant) {
        expect($variant->fresh()->stock)->toBe(0);
    }
})->with([false, true]);
