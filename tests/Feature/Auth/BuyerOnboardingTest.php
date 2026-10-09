<?php

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;

test('buyers can browse but cannot add to cart or order before approval', function (string $status) {
    $buyer = User::factory()->unverified()->create(['status' => $status]);
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Shop', 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Test', 'slug' => 'test']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Test product', 'price' => 100, 'stock' => 5, 'status' => 'active']);
    $this->actingAs($buyer)->get('/shop')->assertRedirect(route('verification.notice'));
    $this->put('/cart/'.$product->id, ['quantity' => 2])->assertRedirect(route('verification.notice'));
    expect(CartItem::query()->count())->toBe(0);
    $this->post('/checkout', [])->assertRedirect(route('verification.notice'));
    $buyer->markEmailAsVerified();
    $this->actingAs($buyer->fresh())->post('/checkout', [])->assertRedirect($status === 'pending' ? '/application/waiting' : '/application');
    $this->get('/shop')->assertOk();
    $this->assertDatabaseCount('orders', 0);
    expect($product->fresh()->stock)->toBe(5);
})->with(['incomplete', 'pending', 'rejected']);
