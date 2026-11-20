<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->buyer = User::factory()->create(['role' => 'buyer']);
    $seller = User::factory()->create(['role' => 'seller']);
    $category = Category::query()->create(['name' => 'Bags', 'is_active' => true]);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Sample seller', 'status' => 'approved', 'business_category_id' => $category->id]);
    $this->product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Bag', 'price' => 150, 'stock' => 5, 'status' => 'active']);
});

test('buyer saves once removes and sees their saved products', function () {
    $this->actingAs($this->buyer)->from('/shop')->post('/wishlist/'.$this->product->id, ['saved' => true])->assertSessionHasNoErrors()->assertRedirect('/shop');
    $this->post('/wishlist/'.$this->product->id, ['saved' => true])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('product_wishlists', 1);
    $this->get('/wishlist')->assertInertia(fn (Assert $page) => $page->where('wishlist', true)->has('products.data', 1)->where('favoriteIds.0', $this->product->id));
    $this->post('/wishlist/'.$this->product->id, ['saved' => false])->assertSessionHasNoErrors();
    $this->assertDatabaseCount('product_wishlists', 0);
});

test('wishlist mutations and reads are isolated to the current buyer', function () {
    $other = User::factory()->create(['role' => 'buyer']);
    DB::table('product_wishlists')->insert(['user_id' => $other->id, 'product_id' => $this->product->id, 'created_at' => now(), 'updated_at' => now()]);
    $this->actingAs($this->buyer)->get('/wishlist')->assertInertia(fn (Assert $page) => $page->has('products.data', 0)->has('favoriteIds', 0));
    $this->post('/wishlist/'.$this->product->id, ['saved' => false])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('product_wishlists', ['user_id' => $other->id, 'product_id' => $this->product->id]);
});

test('guest wishlist actions use the existing sign in flow', function () {
    $this->post('/wishlist/'.$this->product->id, ['saved' => true])->assertRedirect('/login');
    $this->get('/wishlist')->assertRedirect('/login');
});

test('non buyer cannot change a wishlist', function (string $role) {
    $this->actingAs(User::factory()->create(['role' => $role]))->post('/wishlist/'.$this->product->id, ['saved' => true])->assertForbidden();
    $this->assertDatabaseCount('product_wishlists', 0);
})->with(['seller', 'admin']);

test('hidden or blocked products cannot be saved', function (string $condition) {
    $this->product->forceFill($condition === 'hidden' ? ['status' => 'hidden'] : ['blocked_at' => now()])->save();
    $this->actingAs($this->buyer)->post('/wishlist/'.$this->product->id, ['saved' => true])->assertNotFound();
    $this->assertDatabaseCount('product_wishlists', 0);
})->with(['hidden', 'blocked']);
