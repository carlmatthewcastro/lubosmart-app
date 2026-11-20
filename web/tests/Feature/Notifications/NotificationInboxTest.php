<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\Store;
use App\Models\SupportCase;
use App\Models\User;
use App\Services\Notifications\NotificationInbox;
use App\Services\Notifications\ParcelNotifications;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

function notificationParcel(): array
{
    $buyer = User::factory()->create(['role' => 'buyer']);
    $seller = User::factory()->create(['role' => 'seller']);
    $store = Store::create(['user_id' => $seller->id, 'name' => 'Notification store', 'status' => 'approved']);
    $order = Order::create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Test buyer', 'shipping_phone' => '09170000000', 'shipping_line1' => 'Test street', 'shipping_barangay' => 'Test barangay', 'shipping_city' => 'Test city', 'shipping_province' => 'Test province', 'shipping_region' => 'Test region', 'shipping_zip' => '4000', 'subtotal' => '125.50', 'shipping_total' => '40.00', 'total' => '165.50', 'status' => 'pending']);
    $parcel = SellerOrder::create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => '125.50', 'shipping_fee' => '40.00', 'status' => 'pending']);
    $delivery = Delivery::create(['seller_order_id' => $parcel->id, 'status' => 'unassigned']);

    return compact('buyer', 'seller', 'parcel', 'delivery');
}

test('new parcels notify only their buyer and seller and repeat delivery remains idempotent', function () {
    $other = User::factory()->create();
    $admin = User::factory()->create(['role' => 'admin']);
    extract(notificationParcel());
    $this->actingAs($seller)->getJson('/notifications')->assertOk()->assertJsonPath('unread_count', 1)
        ->assertJsonPath('notifications.data.0.event', 'order.new')->assertJsonPath('notifications.data.0.category', 'action_required')
        ->assertJsonPath('notifications.data.0.related.id', $parcel->id)->assertJsonPath('notifications.data.0.url', '/orders?search='.$parcel->id);
    $this->actingAs($buyer)->getJson('/notifications')->assertJsonPath('notifications.data.0.event', 'order.placed');
    $this->actingAs($other)->getJson('/notifications')->assertJsonCount(0, 'notifications.data');
    $this->actingAs($admin)->getJson('/notifications')->assertJsonCount(0, 'notifications.data');
    app(NotificationInbox::class)->send($seller->id, 'order.new', SellerOrder::class.':'.$parcel->id, 'New order received', 'Duplicate', 'order', $parcel->id, true);
    expect($seller->notifications()->count())->toBe(1);
});

test('read endpoints isolate owners and keep mark-read timestamps stable', function () {
    $this->freezeTime();
    extract(notificationParcel());
    $notification = $seller->notifications()->firstOrFail();
    $this->actingAs($buyer)->patchJson('/notifications/'.$notification->id.'/read')->assertNotFound();
    expect($notification->fresh()->read_at)->toBeNull();
    $this->actingAs($seller)->patchJson('/notifications/'.$notification->id.'/read')->assertOk();
    $readAt = $notification->fresh()->read_at->toIso8601String();
    $this->travel(5)->minutes();
    $this->patchJson('/notifications/'.$notification->id.'/read')->assertOk();
    expect($notification->fresh()->read_at->toIso8601String())->toBe($readAt);
    $this->getJson('/notifications/unread-count')->assertJsonPath('unread_count', 0);
    $this->actingAs($buyer)->patchJson('/notifications/read-all')->assertOk();
    expect($buyer->unreadNotifications()->count())->toBe(0);
});

test('category filtering pagination and invalid inputs preserve the inbox contract', function () {
    $user = User::factory()->create();
    foreach (range(1, 21) as $index) {
        app(NotificationInbox::class)->send($user->id, 'account.test', (string) $index, 'Update', 'Message', 'account', $user->id, $index % 2 === 0);
    }
    $this->actingAs($user)->getJson('/notifications?category=action_required&per_page=5&page=2')
        ->assertOk()->assertJsonCount(5, 'notifications.data')->assertJsonPath('notifications.total', 10)->assertJsonPath('notifications.current_page', 2)->assertJsonPath('unread_count', 21);
    $this->getJson('/notifications?category=updates')->assertJsonPath('notifications.total', 11)->assertHeader('Cache-Control', 'no-store, private');
    $this->getJson('/notifications?category=invalid')->assertUnprocessable()->assertJsonValidationErrors('category');
    $this->getJson('/notifications?per_page=1000')->assertUnprocessable()->assertJsonValidationErrors('per_page');
    $this->getJson('/notifications?page=0')->assertUnprocessable()->assertJsonValidationErrors('page');
});

test('unchanged parcel saves do not notify and completed tasks lose action labels', function () {
    extract(notificationParcel());
    $parcel->update(['status' => 'processing']);
    $parcel->update(['status' => 'processing']);
    expect($buyer->notifications()->where('data->event', 'order.processing')->count())->toBe(1);
    $this->actingAs($seller)->getJson('/notifications')->assertJsonPath('notifications.data.0.action_label', 'View update');
    $parcel->delete();
    $this->getJson('/notifications')->assertJsonPath('notifications.data.0.url', null);
});

test('rolled back business transitions leave no notifications', function () {
    extract(notificationParcel());
    $count = DB::table('notifications')->count();
    try {
        DB::transaction(function () use ($parcel) {
            $parcel->update(['status' => 'processing']);
            throw new RuntimeException('Synthetic transaction failure');
        });
    } catch (RuntimeException) {
    }
    expect(DB::table('notifications')->count())->toBe($count);
    expect($parcel->fresh()->status)->toBe('pending');
});

test('assignment notifications use exact stored COD and hide links after reassignment', function () {
    extract(notificationParcel());
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $delivery->update(['rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'dispatch_prepared_at' => now(), 'status' => 'in_transit']);
    $service = app(ParcelNotifications::class);
    $service->record($delivery, 'assign', 'assignment-event', ['rider_id' => null]);
    $service->record($delivery, 'assign', 'assignment-event', ['rider_id' => null]);
    $this->actingAs($rider)->getJson('/notifications')->assertJsonCount(1, 'notifications.data')->assertJsonPath('notifications.data.0.message', 'Parcel #'.$parcel->id.'. Collect COD PHP 165.50.')
        ->assertJsonPath('notifications.data.0.action_label', 'View assignment');
    $delivery->update(['rider_id' => null]);
    $this->getJson('/notifications')->assertJsonPath('notifications.data.0.url', null);
});

test('returns notify responsible reviewers and assigned riders while refunds and payouts notify owners', function () {
    extract(notificationParcel());
    $admin = User::factory()->create(['role' => 'admin']);
    $return = ParcelReturn::create(['seller_order_id' => $parcel->id, 'buyer_id' => $buyer->id, 'reason' => 'Synthetic damaged parcel']);
    $this->actingAs($admin)->getJson('/notifications?category=action_required')->assertJsonPath('notifications.data.0.event', 'return.review');
    $return->update(['status' => 'approved']);
    expect($buyer->notifications()->where('data->event', 'return.approved')->count())->toBe(1);
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $delivery->update(['logistics_center_id' => $center->id]);
    $return->update(['status' => 'assigned', 'rider_id' => $rider->id]);
    $this->actingAs($rider)->getJson('/notifications')->assertJsonPath('notifications.data.0.event', 'return.assignment');
    $return->update(['status' => 'refunded', 'refund_cents' => 16550]);
    expect($buyer->notifications()->where('data->event', 'return.refunded')->count())->toBe(1);
    SellerPayout::create(['seller_order_id' => $parcel->id, 'recorded_by' => $admin->id, 'amount_cents' => 10000, 'reference' => 'SYNTHETIC-PAYOUT']);
    expect($seller->notifications()->where('data->event', 'settlement.recorded')->count())->toBe(1);
});

test('application and complaint alerts go to platform admins and stock alerts only cross thresholds', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    extract(notificationParcel());
    RegistrationApplication::create(['user_id' => $seller->id, 'requested_role' => 'seller', 'status' => 'submitted', 'submitted_at' => now()]);
    SupportCase::create(['opened_by' => $buyer->id, 'kind' => 'complaint', 'subject' => 'Synthetic complaint']);
    expect($admin->notifications()->count())->toBe(2);
    $category = Category::create(['name' => 'Synthetic category']);
    $product = Product::create(['store_id' => $parcel->store_id, 'category_id' => $category->id, 'name' => 'Synthetic product', 'price' => 10, 'stock' => 6]);
    $product->update(['stock' => 5]);
    $product->update(['stock' => 4]);
    $product->update(['stock' => 0]);
    expect($seller->notifications()->where('data->event', 'stock.low')->count())->toBe(1);
    expect($seller->notifications()->where('data->event', 'stock.empty')->count())->toBe(1);
});

test('mobile inbox supports approved role tokens', function (string $role) {
    $user = User::factory()->create(['role' => $role]);
    if ($role === 'rider') {
        linkRiderToApprovedCenter($user);
    }
    app(NotificationInbox::class)->send($user->id, 'account.test', 'mobile', 'Account update', 'Synthetic update', 'account', $user->id);
    $token = $user->createToken('Synthetic mobile', ['api:v1', 'role:'.$role])->plainTextToken;
    $notification = $user->notifications()->firstOrFail();
    $this->withToken($token)->getJson('/api/v1/notifications')->assertOk()->assertJsonPath('unread_count', 1);
    $this->patchJson('/api/v1/notifications/'.$notification->id.'/read')->assertOk();
    $this->getJson('/api/v1/notifications/unread-count')->assertJsonPath('unread_count', 0);
})->with(['buyer', 'seller', 'rider', 'logistics', 'admin']);

test('inbox rejects unauthenticated clients and tokens without the current role', function () {
    $this->getJson('/notifications')->assertUnauthorized();
    $this->getJson('/api/v1/notifications')->assertUnauthorized();
    $buyer = User::factory()->create(['role' => 'buyer']);
    $token = $buyer->createToken('Wrong role', ['api:v1', 'role:seller'])->plainTextToken;
    $this->withToken($token)->getJson('/api/v1/notifications')->assertForbidden();
});

test('failed COD delivery leaves no notification and successful delivery notifies only the scoped recipients', function () {
    extract(notificationParcel());
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $otherOperator = User::factory()->create(['role' => 'logistics']);
    $admin = User::factory()->create(['role' => 'admin']);
    $delivery->update(['rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'status' => 'out_for_delivery', 'picked_up_at' => now(), 'received_at' => now(), 'sorted_at' => now(), 'dispatch_accepted_at' => now()]);
    $count = DB::table('notifications')->count();
    $payload = ['action' => 'delivered', 'note' => 'Received by buyer.', 'cod_confirmed' => true, 'tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner', 'recipient_name' => 'Test buyer', 'amount' => '165.50'];
    $this->actingAs($rider)->postJson('/deliveries/'.$delivery->id, $payload)->assertUnprocessable()->assertJsonValidationErrors('proof');
    expect(DB::table('notifications')->count())->toBe($count);
    expect($delivery->fresh()->status)->toBe('out_for_delivery');
    Storage::fake('local');
    $photo = UploadedFile::fake()->createWithContent('proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII='));
    $this->post('/deliveries/'.$delivery->id, $payload + ['proof' => $photo])->assertRedirect();
    expect($buyer->notifications()->where('data->event', 'delivery.delivered')->count())->toBe(1);
    expect($buyer->notifications()->where('data->event', 'cod.recorded')->first()->data['message'])->toContain('PHP 165.50');
    expect($seller->notifications()->where('data->event', 'delivery.delivered')->count())->toBe(1);
    expect($rider->notifications()->where('data->event', 'cod.pending')->count())->toBe(1);
    expect($otherOperator->notifications()->count())->toBe(0);
    expect($admin->notifications()->count())->toBe(0);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    expect($operator->notifications()->where('data->event', 'logistics.delivered')->count())->toBe(1);
    $count = DB::table('notifications')->count();
    $this->post('/deliveries/'.$delivery->id, $payload + ['proof' => $photo])->assertConflict();
    expect(DB::table('notifications')->count())->toBe($count);
    $discrepancy = ['action' => 'receive_cod', 'amount' => '100.00', 'handover_reference' => 'SYNTHETIC-SHORT', 'reason' => 'Synthetic cash discrepancy'];
    $this->actingAs($operator)->post('/deliveries/'.$delivery->id, $discrepancy)->assertRedirect();
    expect($admin->notifications()->where('data->event', 'cod.cod_discrepancy')->count())->toBe(1);
    $count = DB::table('notifications')->count();
    $this->post('/deliveries/'.$delivery->id, $discrepancy)->assertRedirect();
    expect(DB::table('notifications')->count())->toBe($count);
    $this->actingAs($operator)->post('/deliveries/'.$delivery->id, ['action' => 'receive_cod', 'amount' => '165.50', 'handover_reference' => 'SYNTHETIC-CASH'])->assertRedirect();
    expect($admin->notifications()->where('data->event', 'cod.receive_cod')->count())->toBe(1);
    $this->actingAs($admin)->post('/deliveries/'.$delivery->id, ['action' => 'reconcile_cod'])->assertRedirect();
    expect($rider->notifications()->where('data->event', 'cod.reconcile_cod')->count())->toBe(1);
});

test('repeated unchanged delivery exceptions do not generate more notifications', function () {
    extract(notificationParcel());
    $delivery->update(['exception_status' => 'held']);
    $before = DB::table('notifications')->count();
    app(ParcelNotifications::class)->record($delivery, 'hold', 'repeat-hold', ['exception_status' => 'held']);
    expect(DB::table('notifications')->count())->toBe($before);
});

test('history link authorization loads related records in batches', function () {
    extract(notificationParcel());
    foreach (range(1, 24) as $index) {
        $order = $parcel->order->replicate();
        $order->save();
        SellerOrder::create(['order_id' => $order->id, 'store_id' => $parcel->store_id, 'subtotal' => '125.50', 'shipping_fee' => '40.00', 'status' => 'pending']);
    }
    DB::enableQueryLog();
    $response = $this->actingAs($seller)->getJson('/notifications');
    $queries = collect(DB::getQueryLog());
    DB::disableQueryLog();
    $response->assertOk()->assertJsonCount(15, 'notifications.data')->assertJsonPath('notifications.total', 25);
    $relatedQueries = $queries->filter(fn ($query) => preg_match('/from ["`](seller_orders|orders|stores)["`]/', $query['query']));
    expect($relatedQueries->count())->toBeLessThanOrEqual(3);
});
