<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\LogisticsRemittance;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\RiderPayment;
use App\Models\SellerCost;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\StoreVoucher;
use App\Models\User;
use App\Models\WeeklyRiderPayment;
use App\Services\Admin\AuditLogger;
use App\Services\LubosCoins;
use App\Services\ParcelFinance;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function settlementScenario(): array
{
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $logistics = User::factory()->create(['role' => 'logistics']);
    $rider = User::factory()->create(['role' => 'rider']);
    $admin = User::factory()->create(['role' => 'admin']);
    $center = LogisticsCenter::query()->create(['code' => 'LEDGER-'.$logistics->id, 'name' => 'Ledger center '.$logistics->id, 'address' => 'Test']);
    $center->forceFill(['company_user_id' => $logistics->id])->save();
    foreach ([$logistics, $rider] as $user) {
        $user->logisticsCenters()->attach($center->id, ['granted_by' => $logistics->id]);
    }
    $rider->forceFill(['logistics_center_id' => $center->id])->save();
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Ledger store '.$seller->id, 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Test clothes']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Cotton shirt', 'price' => 100, 'stock' => 8, 'status' => 'active']);
    $variant = ProductVariant::query()->create(['product_id' => $product->id, 'name' => 'Large / Purple', 'stock' => 8]);
    $order = Order::query()->create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Test buyer', 'shipping_phone' => '09123456789', 'shipping_line1' => '10 Test street', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 200, 'shipping_total' => 50, 'total' => 250, 'status' => 'completed', 'payment_method' => 'cod']);
    $parcel = SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => 200, 'shipping_fee' => 50, 'commission_basis_points' => 1000, 'commission_amount' => 20, 'seller_proceeds' => 180, 'status' => 'completed']);
    OrderItem::query()->create(['seller_order_id' => $parcel->id, 'product_id' => $product->id, 'product_name' => $product->name, 'product_variant_id' => $variant->id, 'variant_key' => (string) $variant->id, 'variant_name' => $variant->name, 'quantity' => 2, 'price_each' => 100]);
    $delivery = Delivery::query()->create(['seller_order_id' => $parcel->id, 'rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'status' => 'delivered', 'delivered_at' => now()]);
    DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'reference' => (string) Str::uuid(), 'amount' => 250, 'received_amount' => 250, 'handover_reference' => 'CASH-'.$delivery->id, 'status' => 'reconciled', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    LogisticsRemittance::query()->create(['seller_order_id' => $parcel->id, 'logistics_center_id' => $center->id, 'recorded_by' => $admin->id, 'amount_cents' => 20000, 'reference' => 'PRODUCT-CASH-'.$parcel->id, 'received_on' => '2026-10-25', 'notes' => 'Synthetic actual platform receipt evidence; shipping retained by Logistics.']);
    foreach (['picked_up', 'delivered'] as $type) {
        DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $center->id, 'actor_id' => $rider->id, 'type' => $type, 'reference' => (string) Str::uuid(), 'notes' => '{}', 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }

    return compact('buyer', 'seller', 'logistics', 'rider', 'admin', 'center', 'store', 'product', 'variant', 'parcel', 'delivery');
}

test('logistics submits fixed product cash and admin separately reconciles and confirms actual receipt', function () {
    $f = settlementScenario();
    DB::table('logistics_remittances')->delete();
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['status' => 'handed_over']);
    $url = '/logistics-settlements/'.$f['parcel']->id.'/handover';
    $this->actingAs($f['logistics'])->get('/logistics-settlements')->assertInertia(fn (Assert $page) => $page
        ->where('can_submit', true)->where('entries.data.0.can_submit', true)->where('entries.data.0.product_remittance_cents', 20000));

    $this->post($url, ['amount' => '1.00', 'reference' => 'ALTERED'])->assertRedirect()->assertSessionHasNoErrors();
    $this->post($url)->assertSessionHasNoErrors();
    $events = DB::table('parcel_events')->where('delivery_id', $f['delivery']->id)->where('type', 'submit_platform_handover')->get();
    expect($events)->toHaveCount(1);
    $submission = json_decode($events->first()->notes, true)['evidence'];
    expect($submission['amount_cents'])->toBe(20000);
    expect($submission['reference'])->toStartWith('LMHO-');
    $this->assertDatabaseCount('logistics_remittances', 0);
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $f['delivery']->id, 'status' => 'handed_over']);
    expect($f['admin']->notifications()->where('data->event', 'remittance.submitted')->count())->toBe(1);
    $this->get('/logistics-settlements')->assertInertia(fn (Assert $page) => $page
        ->where('entries.data.0.can_submit', false)->where('entries.data.0.handover.reference', $submission['reference']));

    $this->withSession(['password_hash_web' => $f['admin']->password])->actingAs($f['admin'])->post($url)->assertForbidden();
    $receiptUrl = '/logistics-settlements/'.$f['parcel']->id;
    $payload = ['amount' => '200.00', 'received_on' => now('Asia/Manila')->toDateString(), 'notes' => 'Physically received product cash from Logistics.'];
    $this->post($receiptUrl, $payload)->assertConflict();
    $this->get('/logistics-settlements')->assertInertia(fn (Assert $page) => $page
        ->where('can_reconcile', true)->where('entries.data.0.can_reconcile', true)->where('entries.data.0.can_record', false));
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'reconcile_cod'])->assertSessionHasNoErrors();
    $this->post($receiptUrl, [...$payload, 'external_reference' => 'ALTERED'])->assertSessionHasErrors('external_reference');
    $this->post($receiptUrl, $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('logistics_remittances', ['seller_order_id' => $f['parcel']->id, 'amount_cents' => 20000, 'external_reference' => $submission['reference'], 'recorded_by' => $f['admin']->id]);
});

test('logistics cannot submit another company cash or unverified rider receipts', function () {
    $f = settlementScenario();
    DB::table('logistics_remittances')->delete();
    $url = '/logistics-settlements/'.$f['parcel']->id.'/handover';
    $other = User::factory()->create(['role' => 'logistics']);
    $this->actingAs($other)->post($url)->assertForbidden();
    $this->withSession(['password_hash_web' => $f['rider']->password])->actingAs($f['rider'])->post($url)->assertForbidden();
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['status' => 'collected', 'received_amount' => 200, 'discrepancy_reason' => 'Short cash']);
    $this->withSession(['password_hash_web' => $f['logistics']->password])->actingAs($f['logistics'])->post($url)->assertConflict();
    $this->assertDatabaseMissing('parcel_events', ['type' => 'submit_platform_handover']);
    $this->assertDatabaseCount('logistics_remittances', 0);
});

test('seller preparation rejects financial and external fulfillment overrides without changing the parcel', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['status' => 'pending']);
    $this->actingAs($shop['seller'])->patchJson('/orders/'.$shop['parcel']->id, [
        'status' => 'processing', 'commission_amount' => 0, 'external_courier' => 'Outside carrier',
    ])->assertUnprocessable()->assertJsonValidationErrors(['commission_amount', 'external_courier']);
    expect($shop['parcel']->fresh()->status)->toBe('pending');
    expect($shop['parcel']->fresh()->commission_amount)->toBe('20.00');
    $this->assertDatabaseMissing('audit_events', ['action' => 'seller_preparation_updated']);
});

test('seller preparation records a transition once and rejects replay', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['status' => 'pending']);
    $this->actingAs($shop['seller'])->patch('/orders/'.$shop['parcel']->id, ['status' => 'processing'])->assertSessionHasNoErrors();
    expect($shop['parcel']->fresh()->status)->toBe('processing');
    $this->assertDatabaseHas('audit_events', ['action' => 'seller_preparation_updated', 'subject_id' => $shop['parcel']->id, 'actor_id' => $shop['seller']->id]);
    $this->patch('/orders/'.$shop['parcel']->id, ['status' => 'processing'])->assertConflict();
    expect(DB::table('audit_events')->where('action', 'seller_preparation_updated')->count())->toBe(1);
});

test('seller preparation audit failure rolls back parcel and parent order changes', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['status' => 'pending']);
    $this->mock(AuditLogger::class)->shouldReceive('record')->once()->andThrow(new RuntimeException('Synthetic audit failure'));
    $this->actingAs($shop['seller'])->patch('/orders/'.$shop['parcel']->id, ['status' => 'processing'])->assertServerError();
    expect($shop['parcel']->fresh()->status)->toBe('pending');
    expect($shop['parcel']->order()->first()->status)->toBe('completed');
});

test('fulfillment concern requires an authorized parcel and records evidence without creating money', function () {
    $shop = settlementScenario();
    $payload = ['kind' => 'complaint', 'subject' => 'Suspected external fulfillment', 'body' => 'Please investigate the parcel custody evidence.',
        'seller_order_id' => $shop['parcel']->id, 'fulfillment_concern' => 'external_fulfillment'];
    $this->actingAs(User::factory()->create())->postJson('/support', $payload)->assertForbidden();
    $this->assertDatabaseCount('support_cases', 0);
    $this->actingAs($shop['buyer'])->post('/support', $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('support_cases', ['seller_order_id' => $shop['parcel']->id, 'fulfillment_concern' => 'external_fulfillment', 'status' => 'open']);
    $this->assertDatabaseHas('audit_events', ['action' => 'fulfillment_concern_reported', 'actor_id' => $shop['buyer']->id]);
    expect($shop['parcel']->fresh()->commission_amount)->toBe('20.00');
    expect($shop['parcel']->fresh()->status)->toBe('completed');
    expect(LogisticsRemittance::query()->count())->toBe(1);
    $this->assertDatabaseCount('seller_payouts', 0);
});

test('structured fulfillment concerns cannot be submitted without a parcel or as an ordinary message', function () {
    $shop = settlementScenario();
    $payload = ['kind' => 'complaint', 'subject' => 'Parcel concern', 'body' => 'Please review.', 'fulfillment_concern' => 'false_delivery'];
    $this->actingAs($shop['buyer'])->postJson('/support', $payload)->assertUnprocessable()->assertJsonValidationErrors('seller_order_id');
    $this->postJson('/support', [...$payload, 'kind' => 'message', 'seller_order_id' => $shop['parcel']->id])->assertUnprocessable()->assertJsonValidationErrors('fulfillment_concern');
    $this->assertDatabaseCount('support_cases', 0);
});

test('buyer and seller return cards receive product photos without the full product record', function (?string $imagePath) {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    $shop['product']->update(['image_path' => $imagePath]);

    $response = $this->get('/returns');

    $response->assertInertia(fn (Assert $page) => $page
        ->component('finance/returns')
        ->has('returns.data', 1)
        ->where('returns.data.0.id', $return->id)
        ->where('returns.data.0.seller_order.items.0.product_name', 'Cotton shirt')
        ->where('returns.data.0.seller_order.items.0.product_image_url', $imagePath ? Storage::disk('public')->url($imagePath) : null)
        ->missing('returns.data.0.seller_order.items.0.product'));

    $this->actingAs($shop['seller'])->get('/returns')->assertInertia(fn (Assert $page) => $page
        ->has('returns.data', 1)
        ->where('returns.data.0.id', $return->id)
        ->where('returns.data.0.seller_order.items.0.product_image_url', $imagePath ? Storage::disk('public')->url($imagePath) : null)
        ->missing('returns.data.0.seller_order.items.0.product'));
})->with(['photo' => 'products/returned-shirt.jpg', 'no photo' => null]);

function requestLedgerReturn($test, array $shop): ParcelReturn
{
    $test->actingAs($shop['buyer'])->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'The whole parcel is not suitable.'])->assertSessionHasNoErrors();

    return ParcelReturn::query()->where('seller_order_id', $shop['parcel']->id)->latest('id')->firstOrFail();
}

function ledgerApproval(ParcelReturn $return, ?string $amount = null, bool $physical = false, string $responsibility = 'seller'): array
{
    return ['action' => 'approve', 'items' => $return->requestedItems()->get()->map(fn ($item) => ['order_item_id' => $item->order_item_id, 'quantity' => $item->quantity, 'amount' => $amount ?? ParcelFinance::decimal($item->requested_cents)])->all(),
        'shipping_amount' => '0.00', 'physical_return_required' => $physical, 'responsibility' => $responsibility,
        'return_shipping_responsibility' => $physical ? 'platform' : 'not_required', 'reason' => 'Reviewed actual purchase and evidence; approved refund.'];
}

function approveLedgerRefund($test, array $shop, ParcelReturn $return, ?string $amount = null, string $responsibility = 'seller'): void
{
    $test->actingAs($shop['admin'])->patch('/returns/'.$return->id, ledgerApproval($return, $amount, false, $responsibility))->assertSessionHasNoErrors();
}

function receiveLedgerReturn($test, array $shop, ParcelReturn $return, bool $restock = true): void
{
    $shop['parcel']->update(['shipping_quote' => ['pickup_address' => ['province' => 'Metro Manila', 'city' => 'Manila', 'barangay' => 'Test', 'line1' => 'Seller street']]]);
    $area = DB::table('service_areas')->insertGetId(['logistics_center_id' => $shop['center']->id, 'code' => 'LEDGER-RETURN-'.$return->id, 'name' => 'Return test area', 'province_code' => '130000000', 'city_code' => '133900000', 'barangay_code' => '133900001', 'province_name' => 'Metro Manila', 'city_name' => 'Manila', 'barangay_name' => 'Test', 'is_active' => true]);
    DB::table('rider_service_area')->insert(['rider_id' => $shop['rider']->id, 'service_area_id' => $area]);
    $photo = fn () => UploadedFile::fake()->createWithContent('handover.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII='));
    $url = '/returns/'.$return->id;
    $test->actingAs($shop['admin'])->patch($url, ledgerApproval($return, null, true))->assertSessionHasNoErrors();
    $test->actingAs($shop['logistics'])->patch($url, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Assigned to our return rider.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['rider'])->patch($url, ['action' => 'collect', 'proof' => $photo(), 'recipient_name' => 'Buyer', 'reason' => 'Collected the returned goods.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['logistics'])->patch($url, ['action' => 'facility_receive', 'reason' => 'Actual facility receipt.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['rider'])->patch($url, ['action' => 'accept_seller_dispatch', 'reason' => 'Accepted actual seller dispatch.'])->assertSessionHasNoErrors();
    $test->patch($url, ['action' => 'deliver_seller', 'proof' => $photo(), 'recipient_name' => 'Seller', 'reason' => 'Delivered to seller.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['seller'])->patch($url, ['action' => 'receive', 'condition' => $restock ? 'intact' : 'damaged', 'restock' => $restock, 'reason' => 'Inspected and received returned goods.'])->assertSessionHasNoErrors();
}

test('only admin records a seller payout after reconciliation and cannot record it twice', function () {
    $shop = settlementScenario();
    $payload = ['amount' => '180.00', 'reference' => 'SELLER-PAY-001', 'notes' => 'Actual bank payment'];
    foreach (['seller', 'logistics', 'rider', 'buyer'] as $role) {
        $this->actingAs($shop[$role])->post('/settlements/'.$shop['parcel']->id, $payload)->assertForbidden();
    }
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 181, 'reference' => 'WRONG-AMOUNT'])->assertSessionHasErrors('amount');
    $this->post('/settlements/'.$shop['parcel']->id, $payload)->assertSessionHasNoErrors();
    $this->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'SECOND-PAYMENT'])->assertConflict();
    $this->assertDatabaseCount('seller_payouts', 1);
    $this->assertDatabaseHas('seller_payouts', ['seller_order_id' => $shop['parcel']->id, 'amount_cents' => 18000]);
    $this->assertDatabaseHas('audit_events', ['action' => 'seller_payout_recorded']);
});

test('unreconciled or short cash and open returns hold seller payout', function () {
    $shop = settlementScenario();
    $this->actingAs($shop['admin']);
    foreach ([['status' => 'handed_over', 'received_amount' => 250], ['status' => 'reconciled', 'received_amount' => 200]] as $change) {
        DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update($change);
        $this->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'PENDING-CASH'])->assertConflict();
    }
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['status' => 'reconciled', 'received_amount' => 250]);
    requestLedgerReturn($this, $shop);
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'RETURN-HOLD'])->assertConflict();
    $this->assertDatabaseCount('seller_payouts', 0);
});

test('seller settlements and cost data are scoped to the owning store', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $this->actingAs($shop['seller'])->get('/settlements')->assertInertia(fn (Assert $page) => $page->has('parcels.data', 1)->where('parcels.data.0.id', $shop['parcel']->id)->where('parcels.data.0.can_pay', true));
    $this->post('/seller/costs', ['incurred_on' => '2026-10-25', 'category' => 'packaging', 'description' => 'Packaging materials', 'amount' => 20])->assertSessionHasNoErrors();
    $cost = SellerCost::query()->firstOrFail();
    $this->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.profit', 16000)->where('totals.costs', 2000)->has('costs.data', 1));
    $this->actingAs($other['seller'])->post('/seller/costs/'.$cost->id.'/void', ['reason' => 'Unauthorized correction'])->assertForbidden();
    $this->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->has('costs.data', 0));
    $this->actingAs($shop['seller'])->post('/seller/costs/'.$cost->id.'/void', ['reason' => 'Duplicate entry correction'])->assertSessionHasNoErrors();
    $this->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.profit', 18000)->where('totals.costs', 0));
    $this->post('/seller/costs/'.$cost->id.'/void', ['reason' => 'Repeated correction'])->assertConflict();
});

test('rider fees and payments belong exclusively to logistics and own rider history', function () {
    $shop = settlementScenario();
    $payload = ['delivery_id' => $shop['delivery']->id, 'rider_id' => $shop['rider']->id, 'leg' => 'delivery', 'amount' => 45, 'notes' => 'Agreed completed delivery fee'];
    foreach (['admin', 'seller', 'buyer', 'rider'] as $role) {
        $this->actingAs($shop[$role])->post('/rider-payments', $payload)->assertForbidden();
    }
    $this->actingAs($shop['admin'])->get('/rider-payments')->assertForbidden();
    $this->actingAs($shop['logistics'])->post('/rider-payments', $payload)->assertSessionHasNoErrors();
    $payment = RiderPayment::query()->firstOrFail();
    $this->post('/rider-payments', $payload)->assertConflict();
    $this->post('/rider-payments/'.$payment->id.'/pay', ['payment_reference' => 'RIDER-PAY-001'])->assertSessionHasNoErrors();
    $this->post('/rider-payments/'.$payment->id.'/pay', ['payment_reference' => 'RIDER-PAY-002'])->assertConflict();
    $this->actingAs($shop['rider'])->get('/rider-payments')->assertInertia(fn (Assert $page) => $page->has('entries.data', 1)->where('totals.fees', 4500)->where('totals.paid', 4500)->where('work', null));
    $this->assertDatabaseCount('rider_payments', 1);
    $this->assertDatabaseHas('rider_payments', ['paid_by' => $shop['logistics']->id, 'amount_cents' => 4500]);
});

test('foreign logistics and riders cannot see or pay another company fees and missing work is rejected', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $payload = ['delivery_id' => $shop['delivery']->id, 'rider_id' => $shop['rider']->id, 'leg' => 'delivery', 'amount' => 45, 'notes' => 'Agreed delivery fee'];
    $this->actingAs($other['logistics'])->post('/rider-payments', $payload)->assertForbidden();
    DB::table('parcel_events')->where('delivery_id', $shop['delivery']->id)->where('type', 'delivered')->delete();
    $this->actingAs($shop['logistics'])->post('/rider-payments', $payload)->assertConflict();
    $payload['leg'] = 'pickup';
    $this->post('/rider-payments', $payload)->assertSessionHasNoErrors();
    $payment = RiderPayment::query()->firstOrFail();
    $this->get('/rider-payments')->assertInertia(fn (Assert $page) => $page
        ->component('finance/rider-payments')->has('work.data', 1)
        ->where('work.data.0.id', $shop['delivery']->id)
        ->where('work.data.0.tracking_reference', $shop['delivery']->tracking_reference)
        ->missing('work.data.0.fulfillment_status'));
    $this->actingAs($other['logistics'])->post('/rider-payments/'.$payment->id.'/pay', ['payment_reference' => 'FOREIGN-PAY'])->assertForbidden();
    $this->get('/rider-payments')->assertInertia(fn (Assert $page) => $page->has('entries.data', 0));
    $this->actingAs($other['rider'])->get('/rider-payments')->assertInertia(fn (Assert $page) => $page->has('entries.data', 0));
});

test('buyer admin logistics rider seller and refund form a traceable return journey with stock restored once', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return);
    $this->assertDatabaseHas('return_tasks', ['parcel_return_id' => $return->id, 'status' => 'received', 'confirmed_by' => $shop['seller']->id]);
    expect($shop['product']->fresh()->stock)->toBe(10);
    expect($shop['variant']->fresh()->stock)->toBe(10);
    $this->patch('/returns/'.$return->id, ['action' => 'receive', 'condition' => 'intact', 'restock' => true, 'reason' => 'Duplicate receipt'])->assertConflict();
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'refund_status' => 'credited', 'refund_cents' => 20000, 'seller_debit_cents' => 18000, 'commission_reversal_cents' => 2000]);
    $this->assertDatabaseCount('wallet_transactions', 1);
    $this->assertDatabaseHas('seller_orders', ['id' => $shop['parcel']->id, 'status' => 'completed', 'subtotal' => 200, 'seller_proceeds' => 180]);
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $shop['delivery']->id, 'status' => 'reconciled', 'amount' => 250]);
    $this->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.profit', 0)->where('totals.balance', 0));
});

test('returns require ownership delivered state and correct role for each decision', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $this->actingAs($other['buyer'])->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'Not my purchased parcel.'])->assertForbidden();
    $shop['parcel']->update(['status' => 'processing']);
    $this->actingAs($shop['buyer'])->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'This is not delivered yet.'])->assertConflict();
    $shop['parcel']->update(['status' => 'completed']);
    $return = requestLedgerReturn($this, $shop);
    $this->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'Duplicate return request.'])->assertSessionHasErrors('items');
    $this->actingAs($shop['seller'])->patch('/returns/'.$return->id, ['action' => 'approve', 'reason' => 'Seller cannot approve.'])->assertForbidden();
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Admin cannot assign riders.'])->assertForbidden();
    foreach (['buyer', 'seller', 'logistics', 'rider'] as $role) {
        $this->actingAs($other[$role])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('returns.data', 0));
    }
});

test('refund can precede receipt but cannot exceed paid value or change after credit', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    $data = ledgerApproval($return, '250.01');
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, $data)->assertSessionHasErrors('items.0.amount');
    approveLedgerRefund($this, $shop, $return, '100.00');
    $this->patch('/returns/'.$return->id, ledgerApproval($return, '100.00'))->assertSessionHasNoErrors();
    $this->patch('/returns/'.$return->id, ledgerApproval($return, '101.00'))->assertSessionHasErrors('approval');
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'refund_cents' => 10000, 'seller_debit_cents' => 9000, 'commission_reversal_cents' => 1000]);
    $this->assertDatabaseCount('wallet_transactions', 1);
});

test('refund after payout records a seller debt instead of rewriting the historical payment', function () {
    $shop = settlementScenario();
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'PAID-BEFORE-RETURN'])->assertSessionHasNoErrors();
    $return = requestLedgerReturn($this, $shop);
    approveLedgerRefund($this, $shop, $return);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 250, 'reference' => 'REFUND-AFTER-PAY', 'reason' => 'Actual full refund including shipping.'])->assertSessionHasErrors('action');
    $this->actingAs($shop['seller'])->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.balance', -18000)->where('totals.paid', 18000));
    $this->assertDatabaseCount('seller_payouts', 1);
});

test('seller CSV exports contain only own completed records and preserve delivery date filters', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $shop['delivery']->update(['delivered_at' => '2026-10-25 10:00:00']);
    $other['delivery']->update(['delivered_at' => '2026-10-25 10:00:00']);
    $csv = $this->actingAs($shop['seller'])->get('/seller/reports/export?type=commission&from=2026-10-25&to=2026-10-25')->assertDownload()->streamedContent();
    expect($csv)->toContain($shop['store']->name)->not->toContain($other['store']->name);
    expect(substr_count($csv, "\n"))->toBe(2);
    $this->get('/seller/reports/export?type=sales&from=2026-10-26')->assertStreamedContent("Parcel,Store,\"Product sales (PHP)\",\"Shipping (PHP)\"\n");
    $this->actingAs($shop['buyer'])->get('/seller/reports/export?type=sales')->assertForbidden();
});

test('a prior seller refund debt holds later parcel payouts across the same store', function () {
    $shop = settlementScenario();
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'OLD-PAYOUT'])->assertSessionHasNoErrors();
    $return = requestLedgerReturn($this, $shop);
    approveLedgerRefund($this, $shop, $return);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'OLD-REFUND', 'reason' => 'Actual product refund paid after settlement.'])->assertSessionHasErrors('action');
    $order = $shop['parcel']->order->replicate(['checkout_key']);
    $order->save();
    $parcel = $shop['parcel']->replicate();
    $parcel->order_id = $order->id;
    $parcel->save();
    $delivery = $shop['delivery']->replicate(['tracking_reference']);
    $delivery->seller_order_id = $parcel->id;
    $delivery->save();
    DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $shop['rider']->id, 'reference' => (string) Str::uuid(), 'amount' => 250, 'received_amount' => 250, 'status' => 'reconciled', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    $this->post('/settlements/'.$parcel->id, ['amount' => 180, 'reference' => 'UNSAFE-NEW-PAYOUT'])->assertConflict();
    $this->assertDatabaseCount('seller_payouts', 1);
    $this->get('/settlements')->assertInertia(fn (Assert $page) => $page->where('parcels.data.0.can_pay', false));
});

test('foreign riders and repeated damaged receipt leave custody and stock unchanged', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return, false);
    $this->actingAs($other['rider'])->patch('/returns/'.$return->id, ['action' => 'collect', 'reason' => 'Unauthorized action.'])->assertNotFound();
    $this->actingAs($shop['seller'])->patch('/returns/'.$return->id, ['action' => 'receive', 'condition' => 'damaged', 'restock' => true, 'reason' => 'Cannot restock received damaged goods.'])->assertConflict();
    expect($return->fresh()->task->status)->toBe('received');
    expect($shop['product']->fresh()->stock)->toBe(8);
});

test('refund approval does not wait for internal COD reconciliation and operational roles cannot see accounting', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['status' => 'collected']);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ledgerApproval($return, null, true))->assertSessionHasNoErrors();
    $this->actingAs($shop['logistics'])->get('/returns')->assertInertia(fn (Assert $page) => $page
        ->where('returns.data.0.refund_cents', null)->missing('returns.data.0.seller_debit_cents')->missing('returns.data.0.seller_order.seller_proceeds')->has('returns.data.0.wallet_entries', 0));
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 20000]);
});

test('seller payout audit failure rolls back the payment record', function () {
    $shop = settlementScenario();
    $this->mock(AuditLogger::class)->shouldReceive('record')->once()->andThrow(new RuntimeException('Synthetic audit failure'));
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'AUDIT-FAIL-PAYOUT'])->assertServerError();
    $this->assertDatabaseCount('seller_payouts', 0);
});

test('cancelling an original purchase after adding options restores held stock without inventing a size', function () {
    $shop = settlementScenario();
    $shop['parcel']->order->update(['status' => 'pending']);
    $shop['parcel']->update(['status' => 'pending']);
    $shop['parcel']->items()->update(['product_variant_id' => null, 'variant_name' => null, 'variant_key' => 'base']);
    $this->actingAs($shop['buyer'])->post('/purchases/'.$shop['parcel']->order_id.'/cancel')->assertSessionHasNoErrors();
    $this->post('/purchases/'.$shop['parcel']->order_id.'/cancel')->assertConflict();
    expect($shop['product']->fresh()->stock)->toBe(10);
    expect($shop['variant']->fresh()->stock)->toBe(8);
    $held = ProductVariant::query()->where('product_id', $shop['product']->id)->where('is_legacy', true)->firstOrFail();
    expect($held->stock)->toBe(2);
    expect($held->is_active)->toBeFalse();
    $this->actingAs($shop['seller'])->put('/inventory/'.$shop['product']->id.'/variants', ['variants' => [
        ['id' => $shop['variant']->id, 'name' => $shop['variant']->name, 'stock' => 10, 'is_active' => true],
        ['id' => $held->id, 'name' => $held->name, 'stock' => 0, 'is_active' => true],
    ]])->assertSessionHasNoErrors();
    expect($held->fresh()->is_active)->toBeFalse();
    expect($shop['product']->fresh()->stock)->toBe(10);
    expect($shop['variant']->fresh()->stock)->toBe(10);
});

test('zero paid returns preserve physical receipt without inventing a wallet credit', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['subtotal' => 0, 'shipping_fee' => 0, 'commission_amount' => 0, 'seller_proceeds' => 0]);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['amount' => 0, 'received_amount' => 0]);
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return, false);
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'refund_status' => 'approved_no_refund', 'refund_cents' => 0]);
    $this->assertDatabaseCount('wallet_transactions', 0);
    expect($return->fresh()->task->status)->toBe('received');
});

test('return assignment preserves service area eligibility for quoted parcels', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['shipping_quote' => ['pickup_address' => ['line1' => 'Seller street', 'province' => 'Metro Manila', 'city' => 'Manila', 'barangay' => 'Test']]]);
    $area = DB::table('service_areas')->insertGetId(['logistics_center_id' => $shop['center']->id, 'code' => 'RETURN-TEST', 'name' => 'Return test area', 'province_code' => '130000000', 'city_code' => '133900000', 'barangay_code' => '133900001', 'province_name' => 'Metro Manila', 'city_name' => 'Manila', 'barangay_name' => 'Test', 'is_active' => true]);
    $shop['delivery']->update(['service_area_id' => $area]);
    $return = requestLedgerReturn($this, $shop);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ledgerApproval($return, null, true))->assertSessionHasNoErrors();
    $this->actingAs($shop['logistics'])->patch('/returns/'.$return->id, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Assign within provider coverage.'])->assertSessionHasErrors('rider_id');
    DB::table('rider_service_area')->insert(['rider_id' => $shop['rider']->id, 'service_area_id' => $area]);
    $this->patch('/returns/'.$return->id, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Assign covered operational rider.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'status' => 'refunded', 'rider_id' => $shop['rider']->id]);
});

test('logistics retains shipping while admin records only actual net product remittance once', function () {
    $this->freezeTime();
    $shop = settlementScenario();
    DB::table('logistics_remittances')->delete();
    $url = '/logistics-settlements/'.$shop['parcel']->id;
    $data = ['amount' => '200.00', 'reference' => 'ACTUAL-PRODUCT-RECEIPT', 'received_on' => now('Asia/Manila')->toDateString(), 'notes' => 'Confirmed actual platform receipt; company retains shipping.'];
    foreach (['seller', 'buyer', 'rider', 'logistics'] as $role) {
        $this->actingAs($shop[$role])->post($url, $data)->assertForbidden();
    }
    $this->actingAs($shop['admin'])->post($url, [...$data, 'amount' => '250.00'])->assertSessionHasErrors('amount');
    $this->post($url, [...$data, 'received_on' => now()->addDays(2)->toDateString()])->assertSessionHasErrors('received_on');
    $this->assertDatabaseCount('logistics_remittances', 0);
    $this->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'UNFUNDED'])->assertConflict();
    $this->post($url, $data)->assertSessionHasNoErrors();
    $this->post($url, [...$data, 'reference' => 'REPLAY-NEW-REFERENCE'])->assertConflict();
    $this->assertDatabaseCount('logistics_remittances', 1);
    $this->assertDatabaseHas('logistics_remittances', ['seller_order_id' => $shop['parcel']->id, 'amount_cents' => 20000, 'recorded_by' => $shop['admin']->id]);
    $this->assertDatabaseHas('audit_events', ['action' => 'logistics_remittance_received']);
    $this->get('/logistics-settlements')->assertInertia(fn (Assert $page) => $page->where('cash_model', 'logistics_retains_shipping')->where('totals.retained_cents', 5000)->where('totals.product_remittances_cents', 20000));
    $this->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'FUNDED-SELLER'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('seller_payouts', ['amount_cents' => 18000]);
});

test('shipping ledger isolates company data and never exposes rider compensation or buyer contacts', function () {
    $shop = settlementScenario();
    settlementScenario();
    foreach (['buyer', 'seller', 'rider'] as $role) {
        $this->actingAs($shop[$role])->get('/logistics-settlements')->assertForbidden();
    }
    $this->actingAs($shop['logistics'])->get('/logistics-settlements')->assertInertia(fn (Assert $page) => $page
        ->has('entries.data', 1)->where('entries.data.0.parcel_id', $shop['parcel']->id)->where('can_record', false)
        ->where('totals.allocated_cents', 5000)->missing('entries.data.0.recipient')->missing('entries.data.0.rider_payments'));
    app('auth')->forgetGuards();
    $token = $shop['logistics']->createToken('Ledger phone', ['api:v1', 'role:logistics'])->plainTextToken;
    $this->withToken($token)->getJson('/api/v1/logistics/settlements')->assertOk()
        ->assertJsonCount(1, 'data.entries.data')->assertJsonPath('data.totals.allocated_cents', 5000)
        ->assertJsonPath('data.cash_model', 'logistics_retains_shipping');
});

test('cash discrepancies and altered collection totals block reconciliation and remittance', function () {
    $shop = settlementScenario();
    DB::table('logistics_remittances')->delete();
    $this->actingAs($shop['admin']);
    foreach ([['amount' => 200, 'received_amount' => 200, 'discrepancy_reason' => null], ['amount' => 250, 'received_amount' => 250, 'discrepancy_reason' => 'Unresolved shortage investigation']] as $cash) {
        DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update([...$cash, 'status' => 'handed_over']);
        $this->post('/deliveries/'.$shop['delivery']->id, ['action' => 'reconcile_cod'])->assertConflict();
        $this->post('/logistics-settlements/'.$shop['parcel']->id, ['amount' => 200, 'reference' => 'UNRECONCILED', 'received_on' => '2026-10-25', 'notes' => 'Cannot receive unreconciled product cash.'])->assertConflict();
    }
    $this->assertDatabaseCount('logistics_remittances', 0);
    $this->assertDatabaseCount('seller_payouts', 0);
});

test('duplicate remittance references and audit failure leave no second cash record', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    DB::table('logistics_remittances')->where('seller_order_id', $other['parcel']->id)->delete();
    $data = ['amount' => 200, 'reference' => 'PRODUCT-CASH-'.$shop['parcel']->id, 'received_on' => '2026-10-25', 'notes' => 'Evidence for an actual receipt.'];
    $this->actingAs($shop['admin'])->post('/logistics-settlements/'.$other['parcel']->id, $data)->assertSessionHasErrors('reference');
    $this->mock(AuditLogger::class, fn ($mock) => $mock->shouldReceive('record')->once()->andThrow(new RuntimeException('Audit unavailable')));
    $this->post('/logistics-settlements/'.$other['parcel']->id, [...$data, 'reference' => 'AUDIT-ROLLBACK'])->assertServerError();
    $this->assertDatabaseCount('logistics_remittances', 1);
    $this->assertDatabaseMissing('logistics_remittances', ['reference' => 'AUDIT-ROLLBACK']);
});

test('unreconciled sales cannot mask old refund debt to release a funded seller payout', function () {
    $shop = settlementScenario();
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'ORIGINAL-SELLER-PAY'])->assertSessionHasNoErrors();
    $return = requestLedgerReturn($this, $shop);
    approveLedgerRefund($this, $shop, $return);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'PRODUCT-REFUND-DEBT', 'reason' => 'Actual refund following verified preparation error.'])->assertSessionHasErrors('action');
    $funded = settlementScenario();
    $funded['parcel']->update(['store_id' => $shop['store']->id]);
    $unfunded = settlementScenario();
    $unfunded['parcel']->update(['store_id' => $shop['store']->id]);
    DB::table('cod_collections')->where('delivery_id', $unfunded['delivery']->id)->update(['status' => 'collected', 'received_amount' => null]);
    $this->post('/settlements/'.$funded['parcel']->id, ['amount' => 180, 'reference' => 'DEBT-BYPASS'])->assertConflict();
    $this->assertDatabaseCount('seller_payouts', 1);
    $this->get('/settlements')->assertInertia(fn (Assert $page) => $page->where('parcels.data.1.can_pay', false));
});

test('unreviewed or logistics caused refunds cannot silently charge a seller and finalized classifications are locked', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    $data = ledgerApproval($return, '100.00', false, '');
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, $data)->assertSessionHasErrors('responsibility');
    approveLedgerRefund($this, $shop, $return, '100.00', 'logistics');
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'seller_debit_cents' => 0, 'logistics_debit_cents' => 10000, 'responsibility' => 'logistics']);
    $this->patch('/returns/'.$return->id, ledgerApproval($return, '100.00', false, 'seller'))->assertSessionHasErrors('approval');
    $this->assertDatabaseCount('rider_payments', 0);
});

test('seller regular order responses minimize buyer contacts while authorized waybills retain them', function () {
    $shop = settlementScenario();
    $this->actingAs($shop['seller'])->get('/orders')->assertInertia(fn (Assert $page) => $page
        ->missing('orders.data.0.order.shipping_phone')->missing('orders.data.0.order.shipping_line1')
        ->missing('orders.data.0.order.buyer_id')->where('orders.data.0.order.shipping_city', 'Manila'));
    $this->get('/orders/'.$shop['parcel']->id.'/waybill')->assertInertia(fn (Assert $page) => $page->where('order.order.shipping_phone', '09123456789'));
    app('auth')->forgetGuards();
    $token = $shop['seller']->createToken('Seller phone', ['api:v1', 'role:seller'])->plainTextToken;
    $this->withToken($token)->getJson('/api/v1/seller/orders')->assertOk()->assertJsonMissingPath('data.0.recipient.phone')->assertJsonMissingPath('data.0.recipient.line1');
    app('auth')->forgetGuards();
    $this->getJson('/api/v1/seller/orders/'.$shop['parcel']->id.'/waybill')->assertOk()->assertJsonPath('data.recipient.phone', '09123456789');
});

test('seller voucher history excludes foreign parcels and retains cancelled redemption snapshots', function () {
    $shop = settlementScenario();
    $voucher = StoreVoucher::query()->create(['store_id' => $shop['store']->id, 'code' => 'HISTORY', 'amount_cents' => 1000, 'minimum_cents' => 0, 'usage_limit' => 10, 'expires_at' => now()->addDay()]);
    $shop['parcel']->update(['store_voucher_id' => $voucher->id, 'voucher_code' => 'HISTORY', 'discount_amount' => 10, 'status' => 'cancelled']);
    $other = settlementScenario();
    $this->actingAs($shop['seller'])->get('/seller/vouchers')->assertInertia(fn (Assert $page) => $page->has('history.data', 1)->where('history.data.0.status', 'cancelled')->where('history.data.0.discount_amount', '10.00'));
    $this->actingAs($other['seller'])->get('/seller/vouchers')->assertInertia(fn (Assert $page) => $page->has('history.data', 0));
});

test('finance distinguishes expected recognized reconciled and cash backed commission without exposing wages to admin', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['subtotal' => 900, 'discount_amount' => 100, 'shipping_fee' => 80, 'commission_amount' => 90, 'seller_proceeds' => 810]);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['amount' => 980, 'received_amount' => 980]);
    DB::table('logistics_remittances')->where('seller_order_id', $shop['parcel']->id)->update(['amount_cents' => 90000]);
    $this->actingAs($shop['admin'])->get('/finance')->assertInertia(fn (Assert $page) => $page
        ->where('amounts.Gross product sales', 100000)->where('amounts.Seller voucher discounts', 10000)
        ->where('amounts.Net product sales', 90000)->where('amounts.Expected commission', 9000)
        ->where('amounts.Recognized commission', 9000)->where('amounts.Reconciled commission', 9000)
        ->where('amounts.Commission backed by platform cash receipt', 9000)->where('amounts.Shipping allocations', 8000)
        ->where('amounts.Seller proceeds', 81000)->missing('amounts.Rider fees earned'));
    $this->actingAs($shop['logistics'])->get('/finance')->assertInertia(fn (Assert $page) => $page
        ->missing('amounts.Expected commission')->missing('amounts.Seller proceeds')->where('amounts.Rider fees outstanding', 0));
    $this->actingAs($shop['buyer'])->get('/finance')->assertForbidden();
    $this->actingAs($shop['rider'])->get('/finance')->assertInertia(fn (Assert $page) => $page->missing('amounts.Shipping allocations')->where('amounts.COD collected', 98000));
});

test('refund splits preserve voucher adjusted examples with deterministic centavo rounding', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['subtotal' => 900, 'discount_amount' => 100, 'shipping_fee' => 80, 'commission_amount' => 90, 'seller_proceeds' => 810]);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['amount' => 980, 'received_amount' => 980]);
    $shop['parcel']->items()->update(['price_each' => '500.00']);
    $return = requestLedgerReturn($this, $shop);
    approveLedgerRefund($this, $shop, $return, '300.00');
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 300, 'reference' => 'DISCOUNTED-PARTIAL', 'reason' => 'Confirmed manual product refund after evidence review.'])->assertSessionHasErrors('action');
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'product_refund_cents' => 30000, 'shipping_refund_cents' => 0, 'seller_debit_cents' => 27000, 'commission_reversal_cents' => 3000]);
    expect(ParcelFinance::commission(5, 1000))->toBe(1);
    expect(ParcelFinance::decimal(-1))->toBe('-0.01');
    expect(ParcelFinance::cents('980.01'))->toBe(98001);
    $this->assertDatabaseHas('seller_orders', ['id' => $shop['parcel']->id, 'subtotal' => 900, 'discount_amount' => 100]);
});

test('admin recovery totals do not offset one sellers debt against another sellers proceeds', function () {
    $shop = settlementScenario();
    settlementScenario();
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'DEBT-PAYOUT'])->assertSessionHasNoErrors();
    $return = requestLedgerReturn($this, $shop);
    approveLedgerRefund($this, $shop, $return);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'DEBT-REFUND', 'reason' => 'Actual manual refund for verified seller fault.'])->assertSessionHasErrors('action');
    $this->get('/finance')->assertInertia(fn (Assert $page) => $page->where('amounts.Seller recovery balance', 18000)->where('amounts.Seller payable balances before payout holds', 18000));
});

test('fractional peso cash snapshots remain eligible without floating point equality errors', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['subtotal' => '0.10', 'shipping_fee' => '0.20', 'commission_amount' => '0.01', 'seller_proceeds' => '0.09']);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['amount' => '0.30', 'received_amount' => '0.30']);
    DB::table('logistics_remittances')->where('seller_order_id', $shop['parcel']->id)->update(['amount_cents' => 10]);
    $this->actingAs($shop['admin'])->get('/logistics-settlements')->assertInertia(fn (Assert $page) => $page->where('totals.reconciled_cents', 20));
    $this->get('/settlements')->assertInertia(fn (Assert $page) => $page->where('parcels.data.0.can_pay', true));
    $this->post('/settlements/'.$shop['parcel']->id, ['amount' => '0.09', 'reference' => 'FRACTIONAL-CASH-PAYOUT'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('seller_payouts', ['amount_cents' => 9]);
});

test('weekly compensation belongs to logistics and rejects overlapping periods and duplicate payments', function () {
    $f = settlementScenario();
    $payload = ['rider_id' => $f['rider']->id, 'period_start' => now('Asia/Manila')->addDay()->toDateString(), 'payment_date' => now('Asia/Manila')->addDays(7)->toDateString(), 'amount' => '2500.25'];
    $this->actingAs($f['admin'])->post('/rider-payments/weekly', $payload)->assertForbidden();
    $this->withSession(['password_hash_web' => $f['logistics']->password])->actingAs($f['logistics'])->post('/rider-payments/weekly', $payload)->assertSessionHasNoErrors();
    $payment = WeeklyRiderPayment::query()->sole();
    expect($payment->amount_cents)->toBe(250025);
    $this->post('/rider-payments/weekly', $payload)->assertConflict();
    $this->post('/rider-payments/weekly/'.$payment->id.'/pay', ['payment_reference' => 'WEEKLY-ONE'])->assertSessionHasNoErrors();
    $this->post('/rider-payments/weekly/'.$payment->id.'/pay', ['payment_reference' => 'WEEKLY-TWO'])->assertConflict();
    $this->assertDatabaseCount('weekly_rider_payments', 1);
    $this->withSession(['password_hash_web' => $f['rider']->password])->actingAs($f['rider'])->get('/rider-payments')->assertInertia(fn (Assert $page) => $page->has('weekly.data', 1));
});

test('cash receipt corrections append evidence and preserve the original shortage', function () {
    $f = settlementScenario();
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['status' => 'collected', 'received_amount' => null]);
    $this->actingAs($f['logistics'])->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_cod', 'amount' => '200.00', 'handover_reference' => 'SHORT-1', 'reason' => 'Fifty pesos short.'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$f['delivery']->id, ['action' => 'receive_cod', 'amount' => '250.00', 'handover_reference' => 'FULL-1'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('cod_receipt_entries', ['actual_cents' => 20000, 'discrepancy_cents' => -5000]);
    $this->assertDatabaseHas('cod_receipt_entries', ['actual_cents' => 25000, 'discrepancy_cents' => 0]);
    $this->assertDatabaseCount('cod_receipt_entries', 2);
});

test('reviewed logistics refund credits immediately and records company liability without cash funding', function () {
    $f = settlementScenario();
    $return = requestLedgerReturn($this, $f);
    approveLedgerRefund($this, $f, $return, '200.00', 'logistics');
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'seller_debit_cents' => 0, 'logistics_debit_cents' => 20000]);
    $this->assertDatabaseHas('refund_reserves', ['available_cents' => 0]);
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 20000]);
    expect($f['delivery']->fresh()->status)->toBe('delivered');
});

test('return window requires a documented admin exception and damage evidence is private', function () {
    $f = settlementScenario();
    $f['delivery']->update(['delivered_at' => now()->subDays(8)]);
    $data = ['seller_order_id' => $f['parcel']->id, 'reason' => 'A rights based eligibility review is requested.'];
    $this->actingAs($f['buyer'])->post('/returns', $data)->assertConflict();
    $this->actingAs($f['admin'])->post('/returns/exception', $data)->assertSessionHasNoErrors();
    $this->actingAs($f['buyer'])->post('/returns', ['reason_kind' => 'damaged'] + $data)->assertSessionHasErrors('evidence');
    $photo = UploadedFile::fake()->createWithContent('issue.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII='));
    $this->post('/returns', ['reason_kind' => 'damaged', 'evidence' => [$photo]] + $data)->assertRedirect()->assertSessionHasNoErrors();
    $return = ParcelReturn::query()->sole();
    Storage::disk('local')->assertExists($return->evidence_paths[0]);
    $this->get('/returns/'.$return->id.'/evidence/0')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    $this->actingAs($f['seller'])->get('/returns/'.$return->id.'/evidence/0')->assertForbidden();
    $this->actingAs(User::factory()->create())->get('/returns/'.$return->id.'/evidence/0')->assertForbidden();
    $this->assertDatabaseCount('parcel_returns', 1);
});

test('coins credit without buyer acceptance or reserve funding and approval retries cannot duplicate credit', function () {
    $f = settlementScenario();
    $return = requestLedgerReturn($this, $f);
    approveLedgerRefund($this, $f, $return);
    $this->patch('/returns/'.$return->id, ledgerApproval($return))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('refund_offers', 0);
    $this->assertDatabaseCount('wallet_transactions', 1);
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 20000]);
});

test('mixed payments settle full proceeds and partial refunds restore original coins plus new coin credit', function () {
    $f = settlementScenario();
    $f['parcel']->update(['coins_redeemed_cents' => 5000, 'merchandise_cash_cents' => 15000, 'cod_due_cents' => 20000]);
    DB::table('buyer_wallets')->insert(['buyer_id' => $f['buyer']->id, 'balance_cents' => 5000]);
    DB::transaction(fn () => app(LubosCoins::class)->redeem($f['buyer'], $f['parcel']->order, 5000));
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['amount' => '200.00', 'received_amount' => '200.00']);
    $f['parcel']->logisticsRemittance->update(['amount_cents' => 15000]);
    $this->actingAs($f['admin'])->post('/settlements/'.$f['parcel']->id, ['amount' => '180.00', 'reference' => 'MIXED-SELLER-PAID'])->assertSessionHasNoErrors();
    $return = requestLedgerReturn($this, $f);
    approveLedgerRefund($this, $f, $return, '100.00');
    $this->assertDatabaseHas('wallet_transactions', ['type' => 'return_restoration', 'amount_cents' => 2500]);
    $this->assertDatabaseHas('wallet_transactions', ['type' => 'approved_refund_credit', 'amount_cents' => 7500]);
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 10000]);
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'coins_refunded_cents' => 10000, 'cash_refunded_cents' => 0, 'seller_debit_cents' => 9000]);
    $this->post('/refund-funding', ['source' => 'seller_recovery', 'parcel_return_id' => $return->id, 'amount' => '90.00', 'reference' => 'SELLER-REPAID', 'notes' => 'Seller physically repaid the approved seller liability.'])->assertSessionHasNoErrors();
    $this->actingAs($f['seller'])->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.balance', 0));
    $this->assertDatabaseCount('seller_payouts', 1);
});

test('wallet corrections preserve history require available balance and move funding exactly once', function () {
    $f = settlementScenario();
    $return = ParcelReturn::query()->create(['workflow_version' => 2, 'seller_order_id' => $f['parcel']->id, 'buyer_id' => $f['buyer']->id, 'status' => 'refunded', 'reason' => 'Synthetic approved obligation.']);
    DB::table('buyer_wallets')->insert(['buyer_id' => $f['buyer']->id, 'balance_cents' => 5000]);
    $entry = DB::table('wallet_transactions')->insertGetId(['buyer_id' => $f['buyer']->id, 'actor_id' => $f['admin']->id, 'parcel_return_id' => $return->id, 'amount_cents' => 5000, 'balance_after_cents' => 5000, 'type' => 'approved_refund_credit', 'reference' => 'SYNTHETIC-CREDIT', 'operation_key' => 'synthetic-credit', 'created_at' => now()]);
    $this->actingAs($f['buyer'])->post('/wallet-adjustments', ['transaction_id' => $entry, 'reason' => 'Unauthorized correction.'])->assertForbidden();
    $this->actingAs($f['admin'])->post('/wallet-adjustments', ['transaction_id' => $entry, 'reason' => 'Approved correction of an erroneous duplicate obligation.'])->assertRedirect()->assertSessionHasNoErrors();
    expect((int) DB::table('buyer_wallets')->value('balance_cents'))->toBe(0);
    expect((int) DB::table('refund_reserves')->value('available_cents'))->toBe(5000);
    $this->post('/wallet-adjustments', ['transaction_id' => $entry, 'reason' => 'Repeat correction must fail.'])->assertConflict();
    $debit = DB::table('wallet_transactions')->where('type', 'corrective_debit')->sole();
    $this->post('/wallet-adjustments', ['transaction_id' => $debit->id, 'reason' => 'Approved reversal of the erroneous correction.'])->assertRedirect()->assertSessionHasNoErrors();
    expect((int) DB::table('buyer_wallets')->value('balance_cents'))->toBe(5000);
    expect((int) DB::table('refund_reserves')->value('available_cents'))->toBe(0);
    $this->assertDatabaseCount('wallet_transactions', 3);
});

test('standard return window is admin controlled and return collection compensation follows actual facility receipt', function () {
    $f = settlementScenario();
    $this->actingAs($f['buyer'])->patch('/return-settings', ['return_window_days' => 14])->assertForbidden();
    $this->actingAs($f['admin'])->patch('/return-settings', ['return_window_days' => 14])->assertRedirect()->assertSessionHasNoErrors();
    // This fixture represents a delivery completed under the new policy.
    $f['delivery']->update(['delivered_at' => now()->subDays(8), 'return_window_days' => 14]);
    $this->actingAs($f['buyer'])->post('/returns', ['seller_order_id' => $f['parcel']->id, 'reason' => 'Eligible in configured fourteen day window.'])->assertRedirect()->assertSessionHasNoErrors();
    $return = ParcelReturn::query()->sole();
    $return->update(['status' => 'collected', 'collection_rider_id' => $f['rider']->id, 'collected_at' => now()]);
    $fee = ['delivery_id' => $f['delivery']->id, 'rider_id' => $f['rider']->id, 'leg' => 'return_collection', 'amount' => '25.00', 'notes' => 'Verified return collection fee agreement.'];
    $this->actingAs($f['logistics'])->post('/rider-payments', $fee)->assertConflict();
    $return->update(['status' => 'facility_received', 'facility_received_at' => now()]);
    $this->post('/rider-payments', $fee)->assertRedirect()->assertSessionHasNoErrors();
    $this->post('/rider-payments', $fee)->assertConflict();
    $this->assertDatabaseHas('rider_payments', ['leg' => 'return_collection', 'amount_cents' => 2500]);
});

test('admin receipt generates its own reference while preserving external evidence and rejecting replay', function () {
    $this->freezeTime();
    $f = settlementScenario();
    $f['parcel']->logisticsRemittance()->delete();
    $payload = ['amount' => '200.00', 'received_on' => now('Asia/Manila')->toDateString(), 'external_reference' => 'SYNTHETIC-PHYSICAL-RECEIPT', 'notes' => 'Verified actual remittance handed to the Platform.'];
    $url = '/logistics-settlements/'.$f['parcel']->id;
    $this->actingAs($f['admin'])->post($url, [...$payload, 'notes' => ''])->assertSessionHasErrors('notes');
    $this->assertDatabaseCount('logistics_remittances', 0);
    $this->post($url, $payload)->assertRedirect()->assertSessionHasNoErrors();
    $receipt = LogisticsRemittance::query()->sole();
    expect($receipt->reference)->toStartWith('LMRC-');
    expect($receipt->external_reference)->toBe('SYNTHETIC-PHYSICAL-RECEIPT');
    expect($receipt->created_at->toDateTimeString())->toBe(now()->toDateTimeString());
    expect($receipt->recorded_by)->toBe($f['admin']->id);
    $this->post($url, [...$payload, 'external_reference' => null])->assertConflict();
    $this->assertDatabaseCount('logistics_remittances', 1);
    $this->assertDatabaseHas('audit_events', ['action' => 'logistics_remittance_received', 'actor_id' => $f['admin']->id]);
});

test('policy changes preserve existing delivered eligibility and duplicate exceptions preserve the original reason', function () {
    $this->freezeTime();
    $f = settlementScenario();
    $f['delivery']->update(['delivered_at' => now()->subDays(8)]);
    $this->actingAs($f['admin'])->patch('/return-settings', ['return_window_days' => 14])->assertSessionHasNoErrors();
    expect($f['delivery']->fresh()->return_window_days)->toBe(7);
    $this->actingAs($f['buyer'])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('eligible', 0));
    $this->postJson('/returns', ['seller_order_id' => $f['parcel']->id, 'reason' => 'Outside original policy must remain outside.'])->assertConflict();
    $this->actingAs($f['admin'])->get('/returns?exception_search='.urlencode($f['delivery']->tracking_reference))
        ->assertInertia(fn (Assert $page) => $page->has('exceptionParcels', 1)->where('exceptionParcels.0.buyer', $f['buyer']->name)->where('exceptionParcels.0.within_window', false));
    $payload = ['seller_order_id' => $f['parcel']->id, 'reason' => 'Documented support findings authorize an exception.'];
    $this->post('/returns/exception', $payload)->assertSessionHasNoErrors();
    $this->post('/returns/exception', [...$payload, 'reason' => 'A repeat must not overwrite earlier findings.'])->assertConflict();
    $this->assertDatabaseHas('return_window_exceptions', ['seller_order_id' => $f['parcel']->id, 'reason' => $payload['reason']]);
    $this->actingAs($f['buyer'])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('eligible', 1));
    $this->post('/returns', ['seller_order_id' => $f['parcel']->id, 'reason' => 'Documented exception now allows this request.'])->assertSessionHasNoErrors();
});

test('a shortened policy does not revoke an existing delivered return window', function () {
    $this->freezeTime();
    $f = settlementScenario();
    $f['delivery']->update(['delivered_at' => now()->subDays(5)]);
    $this->actingAs($f['admin'])->patch('/return-settings', ['return_window_days' => 2])->assertSessionHasNoErrors();
    $this->actingAs($f['buyer'])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('eligible', 1));
    $this->post('/returns', ['seller_order_id' => $f['parcel']->id, 'reason' => 'Existing delivery retains its original seven day eligibility.'])->assertSessionHasNoErrors();
});

test('transaction history distinguishes pending cancelled and missing COD records without inventing receipt times', function () {
    $f = settlementScenario();
    $f['parcel']->logisticsRemittance()->delete();
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->delete();
    $this->actingAs($f['admin'])->get('/finance')->assertInertia(fn (Assert $page) => $page
        ->where('transactions.data.0.status_label', 'COD record needs review')->where('transactions.data.0.timeline.2.at', null));
    $f['delivery']->update(['status' => 'pending', 'delivered_at' => null]);
    $f['parcel']->update(['status' => 'pending']);
    $this->get('/finance')->assertInertia(fn (Assert $page) => $page->where('transactions.data.0.status_label', 'Awaiting COD collection'));
    $f['parcel']->update(['status' => 'cancelled']);
    $this->get('/finance')->assertInertia(fn (Assert $page) => $page->where('transactions.data.0.status_label', 'Cancelled')->where('amounts.Expected COD', 0));
});

test('finance cash summaries separate Logistics custody from actual product receipts', function () {
    $f = settlementScenario();
    $this->actingAs($f['admin'])->get('/finance')->assertInertia(fn (Assert $page) => $page
        ->where('amounts.Cash held by Logistics', 5000)->where('amounts.Product cash received by Platform', 20000)
        ->where('transactions.data.0.status_label', 'Received by Platform'));
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['received_amount' => '200.00']);
    $this->get('/finance')->assertInertia(fn (Assert $page) => $page->where('transactions.data.0.status_label', 'Cash discrepancy under review'));
});

test('refund details load saved requested and credited records without issuing credit on read', function () {
    $f = settlementScenario();
    $return = requestLedgerReturn($this, $f);
    $this->actingAs($f['admin'])->get('/returns')->assertInertia(fn (Assert $page) => $page->where('returns.data.0.refund_status', 'pending')->has('returns.data.0.wallet_entries', 0));
    $this->assertDatabaseCount('wallet_transactions', 0);
    approveLedgerRefund($this, $f, $return);
    $this->get('/returns')->assertInertia(fn (Assert $page) => $page->where('returns.data.0.refund_status', 'credited')->has('returns.data.0.wallet_entries', 1));
    expect($return->fresh()->refund_reference)->toStartWith('LCRF-');
    $this->get('/refund-funding')->assertInertia(fn (Assert $page) => $page->where('walletEntries.data.0.buyer', $f['buyer']->name));
});

test('historical external refunds retain their evidence and are never converted into additional coins', function () {
    $f = settlementScenario();
    $return = ParcelReturn::query()->create(['seller_order_id' => $f['parcel']->id, 'buyer_id' => $f['buyer']->id, 'status' => 'refunded', 'reason' => 'Historical external refund.', 'refund_cents' => 10000, 'refund_method' => 'manual', 'cash_refunded_cents' => 10000, 'refunded_at' => now(), 'refund_reference' => 'EXTERNAL-HISTORICAL-RECEIPT']);
    $return->forceFill(['refund_status' => 'credited'])->save();
    $this->actingAs($f['admin'])->get('/finance')->assertInertia(fn (Assert $page) => $page->where('amounts.Manual buyer refunds', 10000)->where('amounts.Lubos Coins refunded', 0));
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertSuccessful();
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->assertDatabaseHas('parcel_returns', ['refund_reference' => 'EXTERNAL-HISTORICAL-RECEIPT', 'cash_refunded_cents' => 10000]);
});
