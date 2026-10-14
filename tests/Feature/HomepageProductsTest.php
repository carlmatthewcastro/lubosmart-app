<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seller = User::factory()->create(['role' => 'seller', 'status' => 'approved']);
    $this->category = Category::query()->create(['name' => 'Sample category', 'is_active' => true]);
    $this->store = Store::query()->create(['user_id' => $this->seller->id, 'name' => 'Sample seller', 'status' => 'approved', 'business_category_id' => $this->category->id]);
    $this->product = Product::query()->create(['store_id' => $this->store->id, 'category_id' => $this->category->id, 'name' => 'Visible product', 'price' => 150, 'stock' => 10, 'status' => 'active', 'image_path' => 'products/sample.jpg']);
});

test('homepage uses visible seller products with prices and public photos', function () {
    $this->get('/')->assertInertia(fn (Assert $page) => $page->component('public/home')->has('products', 1)
        ->where('products.0.name', 'Visible product')->where('products.0.price', '150.00')
        ->where('products.0.store.name', 'Sample seller')->where('products.0.image_url', fn ($url) => str_ends_with($url, '/products/sample.jpg')));
});

test('homepage does not advertise unavailable or unapproved products', function (string $condition) {
    match ($condition) {
        'inactive product' => $this->product->update(['status' => 'hidden']),
        'out of stock' => $this->product->update(['stock' => 0]),
        'missing photo' => $this->product->update(['image_path' => null]),
        'unapproved store' => $this->store->update(['status' => 'pending']),
        'restricted seller' => $this->seller->forceFill(['status' => 'suspended'])->save(),
        'unverified seller' => $this->seller->forceFill(['email_verified_at' => null])->save(),
        'inactive category' => $this->category->update(['is_active' => false]),
    };
    $this->get('/')->assertInertia(fn (Assert $page) => $page->has('products', 0));
})->with(['inactive product', 'out of stock', 'missing photo', 'unapproved store', 'restricted seller', 'unverified seller', 'inactive category']);
