<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function catalogListing(array $changes = []): Product
{
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::create(['user_id' => $seller->id, 'name' => 'Independent store '.$seller->id, 'status' => 'approved']);
    $category = Category::create(['name' => 'Books', 'is_active' => true]);

    return Product::create([...['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Sentient Magazine', 'price' => 150, 'stock' => 4, 'status' => 'active', 'image_path' => 'products/magazine.jpg'], ...$changes]);
}

test('confirmed local samples stay stored but never appear on shopper surfaces', function () {
    $genuine = catalogListing();
    $sample = catalogListing(['name' => 'Sample Everyday Tote', 'description' => 'Synthetic sample listing for local workflow testing.']);
    foreach (['/', '/shop', '/shop?search=Sample', '/shop?category='.$sample->category_id] as $url) {
        $this->get($url)->assertInertia(fn (Assert $page) => $page->where('products'.($url === '/' ? '' : '.data'), fn ($products) => ! collect($products)->contains('id', $sample->id)));
    }
    $this->get('/products/'.$sample->id)->assertNotFound();
    $this->getJson('/api/v1/products')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $genuine->id);
    $this->getJson('/api/v1/products/'.$sample->id)->assertNotFound();
    $this->assertDatabaseHas('products', ['id' => $sample->id, 'status' => 'active']);
    $buyer = User::factory()->create();
    DB::table('product_wishlists')->insert(['user_id' => $buyer->id, 'product_id' => $sample->id, 'created_at' => now(), 'updated_at' => now()]);
    $this->actingAs($buyer)->get('/wishlist')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->put('/cart/'.$sample->id, ['quantity' => 1])->assertSessionHasErrors('quantity');
});

test('ordinary seller listings with sample in their name are preserved', function () {
    $product = catalogListing(['name' => 'Sample pack of magazine prints', 'description' => null]);
    $this->get('/shop')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $product->id));
});

test('price ranges include their boundaries and latest and price sorts are stable', function () {
    $low = catalogListing(['price' => 100]);
    $middle = catalogListing(['price' => 150]);
    $high = catalogListing(['price' => 200]);
    foreach (['latest' => [$high->id, $middle->id, $low->id], 'price_asc' => [$low->id, $middle->id, $high->id], 'price_desc' => [$high->id, $middle->id, $low->id]] as $sort => $expected) {
        $this->get('/shop?sort='.$sort)->assertInertia(fn (Assert $page) => $page->where('products.data', fn ($data) => collect($data)->pluck('id')->all() === $expected));
    }
    $this->get('/shop?min_price=150&max_price=200')->assertInertia(fn (Assert $page) => $page->has('products.data', 2));
    $this->get('/shop?max_price=100')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $low->id));
    $this->get('/shop?min_price=0&max_price=0')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
});

test('availability accounts for inactive and sold out variants', function () {
    $plain = catalogListing();
    $soldOut = catalogListing(['stock' => 0]);
    $options = catalogListing();
    ProductVariant::create(['product_id' => $options->id, 'name' => 'Inactive', 'stock' => 4, 'is_active' => false]);
    $this->get('/shop?availability=in_stock')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $plain->id));
    $this->get('/shop?availability=out_of_stock')->assertInertia(fn (Assert $page) => $page->has('products.data', 2));
    ProductVariant::create(['product_id' => $options->id, 'name' => 'Available', 'stock' => 1, 'is_active' => true]);
    $this->get('/shop?availability=in_stock')->assertInertia(fn (Assert $page) => $page->has('products.data', 2));
    $this->get('/shop?availability=out_of_stock')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $soldOut->id));
});

test('rating filters and sorting use only visible reviews', function () {
    Notification::fake();
    $rated = catalogListing();
    $unrated = catalogListing();
    $buyer = User::factory()->create();
    $order = Order::create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Buyer', 'shipping_phone' => '09000000000', 'shipping_line1' => 'Street', 'shipping_barangay' => 'Area', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 150, 'shipping_total' => 0, 'total' => 150]);
    $parcel = SellerOrder::create(['order_id' => $order->id, 'store_id' => $rated->store_id, 'subtotal' => 150]);
    foreach ([[$rated, 4, true], [$unrated, 5, false]] as [$product, $rating, $visible]) {
        $item = OrderItem::create(['seller_order_id' => $parcel->id, 'product_id' => $product->id, 'product_name' => $product->name, 'quantity' => 1, 'price_each' => 150]);
        ProductReview::create(['order_item_id' => $item->id, 'product_id' => $product->id, 'user_id' => $buyer->id, 'rating' => $rating, 'body' => 'Review', 'is_visible' => $visible]);
    }
    $this->get('/shop?rating=4')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $rated->id));
    $this->get('/shop?rating=5')->assertInertia(fn (Assert $page) => $page->has('products.data', 0));
    $this->get('/shop?sort=rating')->assertInertia(fn (Assert $page) => $page->has('products.data', 2)->where('products.data.0.id', $rated->id));
});

test('catalog rejects invalid filter values', function (array $query, string $field) {
    $this->get('/shop?'.http_build_query($query))->assertSessionHasErrors($field);
})->with([
    [['min_price' => -1], 'min_price'], [['max_price' => -1], 'max_price'],
    [['min_price' => 200, 'max_price' => 100], 'max_price'],
    [['rating' => 6], 'rating'], [['availability' => 'hidden'], 'availability'], [['sort' => 'name; DROP TABLE products'], 'sort'],
]);
