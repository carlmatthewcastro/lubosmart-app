<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function sellerWorkspaceStore(): Store
{
    $seller = User::factory()->create(['role' => 'seller']);

    return Store::query()->create(['user_id' => $seller->id, 'name' => 'Workspace store '.$seller->id, 'status' => 'approved']);
}

function sellerWorkspaceParcel(Store $store, string $status = 'pending', string $deliveryStatus = 'unassigned', ?string $exception = null): SellerOrder
{
    $order = Order::query()->create([
        'buyer_id' => User::factory()->create()->id, 'shipping_recipient_name' => 'Seller test recipient',
        'shipping_phone' => '09123456789', 'shipping_line1' => 'Test address', 'shipping_barangay' => 'Test barangay',
        'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000',
        'subtotal' => 100, 'shipping_total' => 50, 'total' => 150, 'payment_method' => 'cod', 'status' => 'processing',
    ]);
    $parcel = $order->sellerOrders()->create(['store_id' => $store->id, 'subtotal' => 100, 'shipping_fee' => 50, 'commission_amount' => 10, 'seller_proceeds' => 90, 'status' => $status]);
    Delivery::query()->create(['seller_order_id' => $parcel->id, 'status' => $deliveryStatus, 'exception_status' => $exception]);

    return $parcel;
}

test('seller dashboard and notifications count only owned work and completed proceeds', function () {
    $store = sellerWorkspaceStore();
    sellerWorkspaceParcel($store);
    sellerWorkspaceParcel($store, 'processing');
    sellerWorkspaceParcel($store, 'shipped', 'assigned');
    sellerWorkspaceParcel($store, 'shipped', 'out_for_delivery');
    sellerWorkspaceParcel($store, 'shipped', 'out_for_delivery', 'failed_attempt');
    sellerWorkspaceParcel($store, 'completed', 'delivered');
    sellerWorkspaceParcel($store, 'cancelled');
    sellerWorkspaceParcel(sellerWorkspaceStore(), 'completed', 'delivered');

    $this->actingAs($store->user)->get('/dashboard/seller')->assertInertia(fn (Assert $page) => $page
        ->component('seller/dashboard')->where('queues.all', 7)->where('queues.pending', 1)
        ->where('queues.processing', 1)->where('queues.ready', 1)->where('queues.transit', 1)->where('queues.issues', 1)
        ->where('queues.completed', 1)->where('queues.cancelled', 1)->where('activeCount', 5)
        ->where('completedProceeds', '90')->has('recentOrders', 7)->missing('riders')->missing('applications'));
    $this->get('/seller/notifications')->assertJsonPath('all', 7)->assertJsonPath('issues', 1)->assertHeader('Cache-Control', 'no-store, private');
});

test('seller order queues and searches stay scoped to the store', function () {
    $store = sellerWorkspaceStore();
    $ready = sellerWorkspaceParcel($store, 'shipped', 'assigned');
    sellerWorkspaceParcel($store, 'shipped', 'in_transit');
    $issue = sellerWorkspaceParcel($store, 'shipped', 'out_for_delivery', 'failed_attempt');
    $foreign = sellerWorkspaceParcel(sellerWorkspaceStore(), 'shipped', 'assigned');

    $this->actingAs($store->user)->get('/orders?stage=ready')->assertInertia(fn (Assert $page) => $page
        ->has('orders.data', 1)->where('orders.data.0.id', $ready->id)->where('filters.stage', 'ready'));
    $this->get('/orders?stage=issues')->assertInertia(fn (Assert $page) => $page->has('orders.data', 1)->where('orders.data.0.id', $issue->id));
    $this->get('/orders?search='.$ready->delivery->tracking_reference)->assertInertia(fn (Assert $page) => $page->has('orders.data', 1)->where('orders.data.0.id', $ready->id));
    $this->get('/orders?search='.$foreign->delivery->tracking_reference)->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
    $this->get('/orders?search='.urlencode("' OR 1=1 --"))->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
    $this->get('/orders?search='.$ready->id)->assertInertia(fn (Assert $page) => $page->has('orders.data', 1));
    $this->get('/orders?search=recipient')->assertInertia(fn (Assert $page) => $page->has('orders.data', 3));
});

test('seller preparation updates queue counts and rejects skipped transitions and foreign orders', function () {
    $store = sellerWorkspaceStore();
    $parcel = sellerWorkspaceParcel($store);
    $foreign = sellerWorkspaceParcel(sellerWorkspaceStore());

    $this->actingAs($store->user)->patch('/orders/'.$parcel->id, ['status' => 'shipped'])->assertStatus(409);
    $this->patch('/orders/'.$parcel->id, ['status' => 'processing'])->assertSessionHasNoErrors();
    $this->get('/seller/notifications')->assertJsonPath('pending', 0)->assertJsonPath('processing', 1);
    $this->patch('/orders/'.$parcel->id, ['status' => 'shipped'])->assertSessionHasNoErrors();
    $this->get('/seller/notifications')->assertJsonPath('processing', 0)->assertJsonPath('ready', 1);
    $this->patch('/orders/'.$foreign->id, ['status' => 'processing'])->assertForbidden();
    $this->assertDatabaseHas('seller_orders', ['id' => $parcel->id, 'status' => 'shipped']);
    $this->assertDatabaseHas('seller_orders', ['id' => $foreign->id, 'status' => 'pending']);
    foreach (['/deliveries', '/logistics/scan', '/logistics/notifications', '/rider/notifications'] as $path) {
        $this->get($path)->assertForbidden();
    }
});

test('inventory filters expose only owned low stock and missing weights and preserve pagination', function () {
    $store = sellerWorkspaceStore();
    $category = Category::query()->create(['name' => 'Workspace category']);
    $data = ['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Low stock tote', 'price' => 100, 'stock' => 4, 'status' => 'active'];
    $low = Product::query()->create($data);
    Product::query()->create([...$data, 'name' => 'Hidden weighted tote', 'stock' => 5, 'status' => 'hidden', 'weight_grams' => 250]);
    Product::query()->create([...$data, 'store_id' => sellerWorkspaceStore()->id]);

    $this->actingAs($store->user)->get('/inventory?status=low-stock')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $low->id));
    $this->get('/inventory?status=missing-weight')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $low->id));
    $this->get('/inventory?status=hidden&search=weighted')->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.name', 'Hidden weighted tote'));
    $this->get('/seller/notifications')->assertJsonPath('lowStock', 1);
    for ($index = 0; $index < 12; $index++) {
        Product::query()->create($data);
    }
    $this->get('/inventory?status=low-stock&search=tote')->assertInertia(fn (Assert $page) => $page
        ->where('products.total', 13)->where('products.next_page_url', fn ($url) => str_contains($url, 'status=low-stock') && str_contains($url, 'search=tote')));
});

test('seller filters reject invalid queues status and oversized search', function () {
    $this->actingAs(sellerWorkspaceStore()->user)->get('/orders?stage=cash')->assertSessionHasErrors('stage');
    $this->get('/inventory?status=deleted')->assertSessionHasErrors('status');
    $this->get('/orders?search='.str_repeat('a', 101))->assertSessionHasErrors('search');
    $this->get('/inventory?search[]=invalid')->assertSessionHasErrors('search');
});

test('seller notifications require an authenticated approved seller', function () {
    $this->get('/seller/notifications')->assertRedirect('/login');
    $this->actingAs(User::factory()->create(['role' => 'buyer']))->get('/seller/notifications')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => 'seller', 'status' => 'pending']))->get('/seller/notifications')->assertRedirect('/application/waiting');
});

test('seller without a store receives a truthful empty dashboard', function () {
    $this->actingAs(User::factory()->create(['role' => 'seller']))->get('/dashboard/seller')->assertInertia(fn (Assert $page) => $page
        ->component('seller/dashboard')->where('store', null)->where('queues.all', 0)->where('productCount', 0)->where('activeCount', 0)->where('completedProceeds', '0')->has('recentOrders', 0));
});

test('seller settings share the operational profile with own registration and private document metadata', function () {
    $store = sellerWorkspaceStore();
    $store->forceFill(['bank_account' => 'Private seller bank details'])->save();
    DB::table('user_profiles')->insert(['user_id' => $store->user_id, 'first_name' => 'Maria', 'last_name' => 'Santos', 'middle_initial' => 'C', 'sex' => 'female', 'birthday' => '1990-05-10']);
    RegistrationApplication::query()->create(['user_id' => $store->user_id, 'requested_role' => 'seller', 'seller_type' => 'sole_proprietorship']);
    $other = sellerWorkspaceStore();
    DB::table('user_profiles')->insert(['user_id' => $other->user_id, 'first_name' => 'Other', 'last_name' => 'Seller', 'sex' => 'male', 'birthday' => '1990-05-10']);

    $this->actingAs($store->user)->get('/settings/profile')->assertInertia(fn (Assert $page) => $page
        ->component('settings/seller')->where('personalDetails.First name', 'Maria')
        ->where('personalDetails.Middle initial (optional)', 'C')->where('businessName', $store->name)
        ->where('bankAccount', 'Private seller bank details')->where('sellerType', 'sole_proprietorship')
        ->where('requiredDocuments', ['identity', 'business_permit', 'dti_certificate', 'bir_2303'])->has('documents', 0));
});

test('seller store and bank changes require confirmation and trigger admin review', function () {
    $store = sellerWorkspaceStore();
    $user = $store->user;
    $data = ['name' => $user->name, 'email' => $user->email, 'business_name' => 'Updated seller store', 'bank_account' => 'Updated bank details'];

    $this->actingAs($user)->patch('/settings/profile', $data)->assertSessionHasErrors('code');
    $this->assertDatabaseHas('stores', ['id' => $store->id, 'name' => $store->name, 'status' => 'approved']);
    $this->patch('/settings/profile', [...$data, 'current_password' => 'password'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('stores', ['id' => $store->id, 'name' => 'Updated seller store', 'status' => 'pending']);
    expect($store->fresh()->bank_account)->toBe('Updated bank details');
    $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'pending']);
});
