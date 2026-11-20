<?php

use App\Models\Delivery;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\SupportCase;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function protectionParcel(): array
{
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $admin = User::factory()->create(['role' => 'admin']);
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Protection store '.$seller->id, 'status' => 'approved']);
    $order = Order::query()->create(['buyer_id' => $buyer->id, 'payment_method' => 'cod', 'status' => 'pending',
        'shipping_recipient_name' => 'Synthetic buyer', 'shipping_phone' => '09123456789', 'shipping_line1' => 'Private synthetic street',
        'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR',
        'shipping_zip' => '1000', 'subtotal' => 1000, 'shipping_total' => 80, 'total' => 1080]);
    $parcel = SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => 900,
        'shipping_fee' => 80, 'discount_amount' => 100, 'commission_basis_points' => 1000, 'status' => 'pending']);
    $delivery = Delivery::query()->create(['seller_order_id' => $parcel->id, 'status' => 'unassigned']);

    return compact('buyer', 'seller', 'admin', 'store', 'order', 'parcel', 'delivery');
}

function protectionClient(User $user)
{
    app('auth')->forgetGuards();

    return test()->withToken($user->createToken('Protection test', ['api:v1', 'role:'.$user->role])->plainTextToken);
}

test('seller preparation rejects delivery cash and settlement status changes without financial effects', function (string $status) {
    $shop = protectionParcel();
    $this->actingAs($shop['seller'])->patch('/orders/'.$shop['parcel']->id, ['status' => $status])->assertSessionHasErrors('status');
    expect($shop['parcel']->fresh()->status)->toBe('pending');
    expect($shop['delivery']->fresh()->status)->toBe('unassigned');
    $this->assertDatabaseCount('cod_collections', 0);
    $this->assertDatabaseCount('seller_payouts', 0);
})->with(['delivered', 'collected', 'reconciled', 'settled']);

test('seller financial courier and tracking overrides return 422 on the mobile preparation endpoint', function (string $field) {
    $shop = protectionParcel();
    protectionClient($shop['seller'])->patchJson('/api/v1/seller/orders/'.$shop['parcel']->id, ['status' => 'processing', $field => '1'])
        ->assertUnprocessable()->assertJsonValidationErrors($field);
    expect($shop['parcel']->fresh()->only(['status', 'subtotal', 'shipping_fee', 'commission_basis_points']))
        ->toBe(['status' => 'pending', 'subtotal' => '900.00', 'shipping_fee' => '80.00', 'commission_basis_points' => 1000]);
    expect($shop['delivery']->fresh()->tracking_reference)->toBe($shop['delivery']->tracking_reference);
    $this->assertDatabaseMissing('audit_events', ['action' => 'seller_preparation_updated']);
})->with(['subtotal', 'shipping_fee', 'commission_basis_points', 'commission_amount', 'seller_proceeds', 'logistics_center_id', 'rider_id', 'tracking_reference', 'external_courier', 'cod_status', 'settlement_status']);

test('seller cannot call rider logistics reconciliation or settlement mutations through web or scoped api', function () {
    $shop = protectionParcel();
    $this->actingAs($shop['seller']);
    foreach (['claim', 'approve_pickup', 'assign', 'delivered', 'receive_cod', 'reconcile_cod'] as $action) {
        $this->post('/deliveries/'.$shop['delivery']->id, ['action' => $action])->assertForbidden();
    }
    $this->post('/settlements/'.$shop['parcel']->id, ['amount' => 810, 'reference' => 'SELLER-FORGED'])->assertForbidden();
    $this->post('/logistics-settlements/'.$shop['parcel']->id, ['amount' => 900, 'reference' => 'SELLER-FORGED'])->assertForbidden();
    protectionClient($shop['seller'])->postJson('/api/v1/deliveries/'.$shop['delivery']->id.'/events', ['action' => 'reconcile_cod', 'request_key' => (string) Str::uuid()])->assertForbidden();
    $this->assertDatabaseCount('cod_collections', 0);
    $this->assertDatabaseCount('seller_payouts', 0);
    $this->assertDatabaseCount('logistics_remittances', 0);
    expect($shop['delivery']->fresh()->status)->toBe('unassigned');
});

test('preparation is scoped sequenced and audited while waybill printing does not establish custody', function () {
    $shop = protectionParcel();
    $other = protectionParcel();
    $url = '/orders/'.$shop['parcel']->id;
    $this->actingAs($other['seller'])->patch($url, ['status' => 'processing'])->assertForbidden();
    $this->actingAs($shop['seller'])->patch($url, ['status' => 'shipped'])->assertConflict();
    $this->patch($url, ['status' => 'processing'])->assertSessionHasNoErrors();
    $this->patch($url, ['status' => 'shipped'])->assertSessionHasNoErrors();
    $this->patch($url, ['status' => 'shipped'])->assertConflict();
    expect(DB::table('audit_events')->where('action', 'seller_preparation_updated')->count())->toBe(2);
    $this->assertDatabaseHas('audit_events', ['actor_id' => $shop['seller']->id, 'module' => 'operations', 'subject_id' => $shop['parcel']->id]);
    $this->post($url.'/waybill', ['packages' => 1, 'request_key' => (string) Str::uuid()])->assertSessionHasNoErrors();
    expect($shop['delivery']->fresh()->only(['status', 'picked_up_at', 'delivered_at']))->toBe(['status' => 'unassigned', 'picked_up_at' => null, 'delivered_at' => null]);
    $this->assertDatabaseCount('cod_collections', 0);
});

test('audit failure rolls back seller preparation', function () {
    $shop = protectionParcel();
    $this->mock(AuditLogger::class, fn ($mock) => $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit unavailable')));
    $this->actingAs($shop['seller'])->patch('/orders/'.$shop['parcel']->id, ['status' => 'processing'])->assertServerError();
    expect($shop['parcel']->fresh()->status)->toBe('pending');
    expect($shop['order']->fresh()->status)->toBe('pending');
});

test('sensitive waybill reads retain shipping details but exclude unrelated purchase fields and log only access metadata', function () {
    $shop = protectionParcel();
    $other = protectionParcel();
    $url = '/orders/'.$shop['parcel']->id.'/waybill';
    $this->actingAs($other['seller'])->get($url)->assertForbidden();
    $this->assertDatabaseMissing('audit_events', ['action' => 'waybill_accessed']);
    $this->actingAs($shop['seller'])->get('/orders')->assertInertia(fn (Assert $page) => $page
        ->missing('orders.data.0.order.shipping_phone')->missing('orders.data.0.order.total')->missing('orders.data.0.order.buyer_id'));
    $this->get($url)->assertHeader('Cache-Control', 'no-store, private')->assertInertia(fn (Assert $page) => $page
        ->where('order.order.shipping_phone', '09123456789')->where('order.order.shipping_line1', 'Private synthetic street')
        ->missing('order.order.total')->missing('order.order.buyer_id'));
    $event = DB::table('audit_events')->where('action', 'waybill_accessed')->first();
    expect(json_decode($event->changes, true))->toBe(['channel' => 'web', 'delivery_id' => $shop['delivery']->id]);
    protectionClient($other['seller'])->getJson('/api/v1/seller/orders/'.$shop['parcel']->id.'/waybill')->assertNotFound();
    protectionClient($shop['seller'])->getJson('/api/v1/seller/orders/'.$shop['parcel']->id.'/waybill')->assertOk()->assertJsonPath('data.recipient.phone', '09123456789');
    expect(DB::table('audit_events')->where('action', 'waybill_accessed')->count())->toBe(2);
});

test('suspected fulfillment concerns retain evidence and human decision history without changing money or account status', function (string $concern) {
    $shop = protectionParcel();
    $payload = ['kind' => 'complaint', 'subject' => 'Fulfillment protection concern', 'body' => 'Synthetic observed behavior for human review; this does not establish misconduct.',
        'seller_order_id' => $shop['parcel']->id, 'fulfillment_concern' => $concern, 'attachment' => UploadedFile::fake()->create('evidence.pdf', 5, 'application/pdf')];
    $this->actingAs($shop['buyer'])->post('/support', $payload)->assertSessionHasNoErrors();
    $case = SupportCase::query()->firstOrFail();
    expect($case->fulfillment_concern)->toBe($concern);
    expect($case->opened_by)->toBe($shop['buyer']->id);
    $message = $case->messages()->firstOrFail();
    expect(Storage::disk('local')->exists($message->attachment_path))->toBeTrue();
    $this->get('/support/'.$case->id.'/evidence/'.$message->id)->assertDownload()->assertHeader('Cache-Control', 'no-store, private');
    $this->actingAs($shop['seller'])->patch('/support/'.$case->id, ['status' => 'resolved', 'resolution' => 'Seller cannot decide.'])->assertForbidden();
    $this->actingAs($shop['admin'])->patch('/support/'.$case->id, ['status' => 'in_review'])->assertSessionHasNoErrors();
    $this->patch('/support/'.$case->id, ['status' => 'resolved'])->assertSessionHasErrors('resolution');
    $this->patch('/support/'.$case->id, ['status' => 'resolved', 'resolution' => 'Evidence reviewed; no contractual or financial finding is made.'])->assertSessionHasNoErrors();
    expect($case->fresh()->resolved_by)->toBe($shop['admin']->id);
    expect(DB::table('audit_events')->where('subject_type', 'support_case')->where('subject_id', $case->id)->count())->toBe(3);
    foreach (['cod_collections', 'seller_payouts', 'logistics_remittances', 'parcel_returns'] as $table) {
        $this->assertDatabaseCount($table, 0);
    }
    expect($shop['seller']->fresh()->status)->toBe('approved');
    expect($shop['parcel']->fresh()->commission_amount)->toBeNull();
    expect($shop['delivery']->fresh()->status)->toBe('unassigned');
})->with(array_keys(SupportCase::FULFILLMENT_CONCERNS));

test('fulfillment reports reject invalid types missing parcel unrelated parcel and unrelated evidence access', function () {
    $shop = protectionParcel();
    $other = protectionParcel();
    $data = ['kind' => 'complaint', 'subject' => 'Suspected bypass', 'body' => 'Synthetic evidence for Admin review.', 'fulfillment_concern' => 'external_fulfillment'];
    $this->actingAs($shop['buyer'])->postJson('/support', $data)->assertUnprocessable()->assertJsonValidationErrors('seller_order_id');
    $data['seller_order_id'] = $shop['parcel']->id;
    $this->postJson('/support', [...$data, 'fulfillment_concern' => 'invented'])->assertUnprocessable()->assertJsonValidationErrors('fulfillment_concern');
    $this->postJson('/support', [...$data, 'kind' => 'message'])->assertUnprocessable()->assertJsonValidationErrors('fulfillment_concern');
    $this->actingAs($other['buyer'])->postJson('/support', $data)->assertForbidden();
    $this->assertDatabaseCount('support_cases', 0);
    $this->actingAs($shop['buyer'])->post('/support', [...$data, 'attachment' => UploadedFile::fake()->create('private.pdf', 5, 'application/pdf')])->assertSessionHasNoErrors();
    $case = SupportCase::query()->firstOrFail();
    $message = $case->messages()->firstOrFail();
    $this->actingAs($other['seller'])->get('/support/'.$case->id)->assertForbidden();
    $this->get('/support/'.$case->id.'/evidence/'.$message->id)->assertForbidden();
    $this->getJson('/support?fulfillment_concern=external_fulfillment')->assertJsonCount(0, 'cases.data');
});

test('report audit failure rolls back the case and removes uploaded evidence', function () {
    $shop = protectionParcel();
    $this->mock(AuditLogger::class, fn ($mock) => $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit unavailable')));
    $this->actingAs($shop['buyer'])->post('/support', ['kind' => 'complaint', 'subject' => 'Suspected bypass', 'body' => 'Synthetic evidence for review.',
        'fulfillment_concern' => 'custody_bypass', 'seller_order_id' => $shop['parcel']->id,
        'attachment' => UploadedFile::fake()->create('private.pdf', 5, 'application/pdf')])->assertServerError();
    $this->assertDatabaseCount('support_cases', 0);
    $this->assertDatabaseCount('support_case_messages', 0);
    expect(Storage::disk('local')->allFiles('support-evidence'))->toBe([]);
});

test('mobile reports expose their concern through the shared authorized support endpoints', function () {
    $shop = protectionParcel();
    $this->getJson('/api/v1/support/report-options')->assertUnauthorized();
    protectionClient($shop['buyer'])->getJson('/api/v1/support/report-options')->assertOk()->assertJsonPath('fulfillment_concerns.false_delivery', 'False delivery confirmation');
    $this->postJson('/api/v1/support', ['kind' => 'complaint', 'subject' => 'Suspected false delivery', 'body' => 'Please investigate this parcel using recorded evidence.',
        'seller_order_id' => $shop['parcel']->id, 'fulfillment_concern' => 'false_delivery'])->assertCreated();
    $case = SupportCase::query()->firstOrFail();
    $this->getJson('/api/v1/support/'.$case->id)->assertOk()->assertJsonPath('data.case.fulfillment_concern', 'false_delivery');
    $this->getJson('/api/v1/support')->assertOk()->assertJsonPath('data.data.0.fulfillment_concern', 'false_delivery');
});

test('private delivery proof access is authorized audited and not logged when evidence is missing', function () {
    $shop = protectionParcel();
    $other = protectionParcel();
    $path = 'delivery-proofs/protection.png';
    Storage::disk('local')->put($path, 'Synthetic private delivery proof');
    $shop['delivery']->update(['proof_photo_path' => $path]);
    $url = '/deliveries/'.$shop['delivery']->id.'/proof';
    $this->actingAs($other['seller'])->get($url)->assertForbidden();
    $this->assertDatabaseMissing('audit_events', ['action' => 'delivery_proof_accessed']);
    $this->actingAs($shop['buyer'])->get($url)->assertDownload()->assertHeader('Cache-Control', 'no-store, private');
    $event = DB::table('audit_events')->where('action', 'delivery_proof_accessed')->first();
    expect(json_decode($event->changes, true))->toBe(['seller_order_id' => $shop['parcel']->id]);
    Storage::disk('local')->delete($path);
    $this->get($url)->assertNotFound();
    expect(DB::table('audit_events')->where('action', 'delivery_proof_accessed')->count())->toBe(1);
});
