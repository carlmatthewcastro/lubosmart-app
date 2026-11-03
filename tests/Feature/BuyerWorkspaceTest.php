<?php

use App\Models\Address;
use App\Models\Category;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function buyerWorkspacePurchase($test, User $buyer): SellerOrder
{
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Local weaving store '.$seller->id, 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Handicrafts']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Woven market bag', 'price' => 100, 'stock' => 10, 'status' => 'active']);
    $address = Address::query()->create(['user_id' => $buyer->id, 'label' => 'Home', 'recipient_name' => 'Workspace buyer', 'phone' => '09123456789', 'line1' => 'Test street', 'barangay' => 'Test barangay', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
    $test->actingAs($buyer)->put('/cart/'.$product->id, ['quantity' => 2])->assertSessionHasNoErrors();
    $test->post('/checkout', ['address_id' => $address->id, 'checkout_key' => (string) Str::uuid()])->assertRedirect('/orders');

    return SellerOrder::query()->where('store_id', $store->id)->firstOrFail();
}

test('buyer dashboard links only owned purchases to their parcels', function () {
    $buyer = User::factory()->create();
    $own = buyerWorkspacePurchase($this, $buyer);
    buyerWorkspacePurchase($this, User::factory()->create());

    $this->actingAs($buyer)->get('/dashboard/buyer')->assertInertia(fn (Assert $page) => $page
        ->component('buyer/dashboard')->where('stats.Orders', 1)->where('stats.In progress', 1)
        ->has('records', 1)->where('records.0.href', '/orders?search='.$own->order_id));
});

test('buyer searches tracking product and store without exposing another buyers parcel or conversation', function () {
    $buyer = User::factory()->create();
    $own = buyerWorkspacePurchase($this, $buyer);
    $foreign = buyerWorkspacePurchase($this, User::factory()->create());
    $this->post('/orders/'.$foreign->id.'/messages', ['body' => 'Private foreign conversation'])->assertSessionHasNoErrors();

    $this->actingAs($buyer);
    foreach ([$own->delivery->tracking_reference, 'Woven market bag', 'Local weaving store', (string) $own->order_id] as $search) {
        $this->get('/orders?search='.urlencode($search))->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)->where('orders.data.0.id', $own->id)->missing('messages.'.$foreign->id));
    }
    $this->get('/orders?search='.$foreign->delivery->tracking_reference)->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
    $this->post('/orders/'.$foreign->id.'/messages', ['body' => 'Unauthorized'])->assertForbidden();
    $this->get('/orders?search='.urlencode("' OR 1=1 --"))->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
});

test('buyer queues follow seller preparation delivery issues and completion', function () {
    $buyer = User::factory()->create();
    $parcel = buyerWorkspacePurchase($this, $buyer);
    $this->actingAs($parcel->store->user)->patch('/orders/'.$parcel->id, ['status' => 'processing'])->assertSessionHasNoErrors();
    $this->actingAs($buyer)->get('/orders?stage=processing')->assertInertia(fn (Assert $page) => $page->has('orders.data', 1));
    $this->actingAs($parcel->store->user)->patch('/orders/'.$parcel->id, ['status' => 'shipped'])->assertSessionHasNoErrors();
    $this->actingAs($buyer)->get('/orders?stage=ready')->assertInertia(fn (Assert $page) => $page->has('orders.data', 1));
    $parcel->delivery->update(['status' => 'out_for_delivery', 'picked_up_at' => '2026-10-25 09:00:00']);
    $this->get('/orders?stage=transit')->assertInertia(fn (Assert $page) => $page
        ->has('orders.data', 1)->where('orders.data.0.delivery.status', 'out_for_delivery')
        ->where('orders.data.0.delivery.picked_up_at', '2026-10-25T09:00:00.000000Z'));
    $parcel->delivery->update(['exception_status' => 'failed_attempt']);
    $this->get('/orders?stage=issues')->assertInertia(fn (Assert $page) => $page->has('orders.data', 1));
    $this->get('/orders?stage=transit')->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
    $parcel->update(['status' => 'completed']);
    $this->get('/orders?stage=completed')->assertInertia(fn (Assert $page) => $page->has('orders.data', 1));
    $this->get('/orders?stage=issues')->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
});

test('buyer queue filters reject unsupported values and oversized or structured searches', function () {
    $this->actingAs(User::factory()->create());
    $this->get('/orders?stage=cash')->assertSessionHasErrors('stage');
    $this->get('/orders?search='.str_repeat('x', 101))->assertSessionHasErrors('search');
    $this->get('/orders?search[]=invalid')->assertSessionHasErrors('search');
});

test('buyer filtered pagination retains search and stage', function () {
    $buyer = User::factory()->create();
    $parcel = buyerWorkspacePurchase($this, $buyer);
    for ($index = 0; $index < 10; $index++) {
        $order = $parcel->order->replicate(['checkout_key']);
        $order->save();
        $copy = $parcel->replicate();
        $copy->order_id = $order->id;
        $copy->save();
    }

    $this->get('/orders?stage=pending&search=Local')->assertInertia(fn (Assert $page) => $page
        ->where('orders.total', 11)->has('orders.data', 10)
        ->where('orders.next_page_url', fn ($url) => str_contains($url, 'stage=pending') && str_contains($url, 'search=Local')));
});
