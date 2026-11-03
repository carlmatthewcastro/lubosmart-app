<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function workspaceStatusProduct(): Product
{
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Status store', 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Status goods', 'is_active' => true]);

    return Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Status product', 'price' => 100, 'stock' => 10, 'status' => 'active']);
}

function workspaceStatusDelivery(Product $product, User $buyer, ?User $rider = null): Delivery
{
    $order = Order::query()->create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Synthetic recipient', 'shipping_phone' => '09123456789', 'shipping_line1' => 'Test street', 'shipping_barangay' => 'Test barangay', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150, 'payment_method' => 'cod', 'status' => 'pending']);
    $parcel = $order->sellerOrders()->create(['store_id' => $product->store_id, 'subtotal' => 100, 'shipping_fee' => 50, 'commission_amount' => 10, 'seller_proceeds' => 90, 'status' => 'pending']);

    return Delivery::query()->create(['seller_order_id' => $parcel->id, 'rider_id' => $rider?->id, 'logistics_center_id' => $rider?->logistics_center_id, 'status' => $rider ? 'assigned' : 'unassigned']);
}

test('workspace status requires an approved verified non admin account', function () {
    $this->getJson('/workspace/status')->assertUnauthorized();
    $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/workspace/status')->assertForbidden();
    $this->actingAs(User::factory()->create(['status' => 'suspended']))->getJson('/workspace/status')->assertForbidden();
    $this->actingAs(User::factory()->unverified()->create())->getJson('/workspace/status')->assertRedirect('/verify-email');
});

test('buyer cart counts persist without deducting stock and status exposes no private records', function () {
    $product = workspaceStatusProduct();
    $buyer = User::factory()->create();
    $this->actingAs($buyer)->put('/cart/'.$product->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $first = $this->getJson('/workspace/status')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('cartQuantity', 2)->assertJsonPath('queues.orders', 0);
    expect($product->fresh()->stock)->toBe(10);
    $this->put('/cart/'.$product->id, ['quantity' => 1, 'add' => true])->assertSessionHasNoErrors();
    $next = $this->getJson('/workspace/status')->assertOk()->assertJsonPath('cartQuantity', 3);
    expect($next->json('revisions.cart'))->not->toBe($first->json('revisions.cart'));
    $this->actingAs(User::factory()->create())->getJson('/workspace/status')->assertOk()->assertJsonPath('cartQuantity', 0);
    expect(array_keys($next->json()))->toBe(['cartQuantity', 'queues', 'revisions']);
});

test('stock and order changes reach the buyer and seller with stable unchanged indicators', function () {
    $product = workspaceStatusProduct();
    $buyer = User::factory()->create();
    $delivery = workspaceStatusDelivery($product, $buyer);
    $this->actingAs($buyer);
    $first = $this->getJson('/workspace/status')->assertOk()->assertJsonPath('queues.orders', 1)->json();
    $this->getJson('/workspace/status')->assertExactJson($first);
    $product->update(['stock' => 7]);
    $delivery->sellerOrder->update(['status' => 'processing']);
    $second = $this->getJson('/workspace/status')->assertOk()->json();
    expect($second['revisions']['catalog'])->not->toBe($first['revisions']['catalog']);
    expect($second['revisions']['orders'])->not->toBe($first['revisions']['orders']);
    $this->actingAs($product->store->user)->getJson('/workspace/status')->assertOk()->assertJsonPath('queues.orders', 1);
});

test('unrelated purchases do not change another buyers order or delivery indicators', function () {
    $product = workspaceStatusProduct();
    $buyer = User::factory()->create();
    $this->actingAs($buyer);
    $first = $this->getJson('/workspace/status')->assertOk()->json();
    workspaceStatusDelivery($product, User::factory()->create());
    $this->getJson('/workspace/status')->assertExactJson($first);
});

test('rider and logistics indicators remain scoped to assigned work and operational centers', function () {
    $product = workspaceStatusProduct();
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    $delivery = workspaceStatusDelivery($product, User::factory()->create(), $rider);
    $other = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($other);
    workspaceStatusDelivery($product, User::factory()->create(), $other);
    $this->actingAs($rider);
    $first = $this->getJson('/workspace/status')->assertOk()->assertJsonPath('queues.deliveries', 1)->json();
    $delivery->update(['status' => 'picked_up']);
    $second = $this->getJson('/workspace/status')->assertOk()->json();
    expect($second['revisions']['deliveries'])->not->toBe($first['revisions']['deliveries']);
    $this->actingAs($operator)->getJson('/workspace/status')->assertOk()->assertJsonPath('queues.deliveries', 1);
});

test('new order messages update only participating accounts indicators', function () {
    $product = workspaceStatusProduct();
    $buyer = User::factory()->create();
    $delivery = workspaceStatusDelivery($product, $buyer);
    $this->actingAs($buyer);
    $first = $this->getJson('/workspace/status')->assertOk()->json('revisions.orders');
    DB::table('order_messages')->insert(['seller_order_id' => $delivery->seller_order_id, 'user_id' => $product->store->user_id, 'body' => 'Your parcel is being prepared.', 'created_at' => now(), 'updated_at' => now()]);
    expect($this->getJson('/workspace/status')->assertOk()->json('revisions.orders'))->not->toBe($first);
});

test('status polling does not consume the sellers voucher action limit', function () {
    $product = workspaceStatusProduct();
    $this->actingAs($product->store->user);
    for ($i = 0; $i < 25; $i++) {
        $this->getJson('/workspace/status')->assertOk();
    }
    $this->post('/seller/vouchers', ['code' => 'POLLING-10', 'amount' => '10', 'minimum' => '0', 'usage_limit' => 10, 'expires_at' => now()->addDay()->toIso8601String()])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('store_vouchers', ['store_id' => $product->store_id, 'code' => 'POLLING-10', 'amount_cents' => 1000]);
});

test('private buyer seller messages do not change a riders workspace indicators', function () {
    $product = workspaceStatusProduct();
    $rider = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($rider);
    $delivery = workspaceStatusDelivery($product, User::factory()->create(), $rider);
    $this->actingAs($rider);
    $first = $this->getJson('/workspace/status')->assertOk()->json();
    DB::table('order_messages')->insert(['seller_order_id' => $delivery->seller_order_id, 'user_id' => $product->store->user_id, 'body' => 'Private shopping conversation.', 'created_at' => now(), 'updated_at' => now()]);
    $this->getJson('/workspace/status')->assertExactJson($first);
});
