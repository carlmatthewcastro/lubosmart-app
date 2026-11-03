<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\RiderPayment;
use App\Models\SellerCost;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use Illuminate\Support\Facades\DB;
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
    $delivery = Delivery::query()->create(['seller_order_id' => $parcel->id, 'rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'status' => 'delivered', 'delivered_at' => '2026-10-25 10:00:00']);
    DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'reference' => (string) Str::uuid(), 'amount' => 250, 'received_amount' => 250, 'handover_reference' => 'CASH-'.$delivery->id, 'status' => 'reconciled', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    foreach (['picked_up', 'delivered'] as $type) {
        DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $center->id, 'actor_id' => $rider->id, 'type' => $type, 'reference' => (string) Str::uuid(), 'notes' => '{}', 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }

    return compact('buyer', 'seller', 'logistics', 'rider', 'admin', 'center', 'store', 'product', 'variant', 'parcel', 'delivery');
}

function requestLedgerReturn($test, array $shop): ParcelReturn
{
    $test->actingAs($shop['buyer'])->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'The whole parcel is not suitable.'])->assertSessionHasNoErrors();

    return ParcelReturn::query()->where('seller_order_id', $shop['parcel']->id)->firstOrFail();
}

function receiveLedgerReturn($test, array $shop, ParcelReturn $return, bool $restock = true): void
{
    $url = '/returns/'.$return->id;
    $test->actingAs($shop['admin'])->patch($url, ['action' => 'approve', 'reason' => 'Return approved after review.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['logistics'])->patch($url, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Assigned to our return rider.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['rider'])->patch($url, ['action' => 'collect', 'tracking_reference' => $shop['delivery']->tracking_reference, 'reason' => 'Physically collected the complete parcel.'])->assertSessionHasNoErrors();
    $test->actingAs($shop['seller'])->patch($url, ['action' => 'receive', 'tracking_reference' => $shop['delivery']->tracking_reference, 'condition' => $restock ? 'intact' : 'damaged', 'restock' => $restock, 'reason' => 'Inspected and physically received the return.'])->assertSessionHasNoErrors();
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
    $this->actingAs($other['logistics'])->post('/rider-payments/'.$payment->id.'/pay', ['payment_reference' => 'FOREIGN-PAY'])->assertForbidden();
    $this->get('/rider-payments')->assertInertia(fn (Assert $page) => $page->has('entries.data', 0));
    $this->actingAs($other['rider'])->get('/rider-payments')->assertInertia(fn (Assert $page) => $page->has('entries.data', 0));
});

test('buyer admin logistics rider seller and refund form a traceable return journey with stock restored once', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return);
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'status' => 'received', 'restocked' => true]);
    expect($shop['product']->fresh()->stock)->toBe(10);
    expect($shop['variant']->fresh()->stock)->toBe(10);
    $this->patch('/returns/'.$return->id, ['action' => 'receive', 'tracking_reference' => $shop['delivery']->tracking_reference, 'condition' => 'intact', 'restock' => true, 'reason' => 'Duplicate receipt'])->assertConflict();
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'REFUND-001', 'reason' => 'Actual approved product refund paid manually.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'status' => 'refunded', 'refund_cents' => 20000, 'seller_debit_cents' => 18000, 'commission_reversal_cents' => 2000]);
    $this->assertDatabaseCount('return_events', 6);
    $this->assertDatabaseHas('audit_events', ['action' => 'manual_refund_recorded']);
    $this->assertDatabaseHas('seller_orders', ['id' => $shop['parcel']->id, 'status' => 'completed', 'subtotal' => 200, 'seller_proceeds' => 180]);
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $shop['delivery']->id, 'status' => 'reconciled', 'amount' => 250]);
    $this->actingAs($shop['seller'])->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.profit', 0)->where('totals.balance', 0));
});

test('returns require ownership delivered state and correct role for each decision', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $this->actingAs($other['buyer'])->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'Not my purchased parcel.'])->assertForbidden();
    $shop['parcel']->update(['status' => 'processing']);
    $this->actingAs($shop['buyer'])->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'This is not delivered yet.'])->assertConflict();
    $shop['parcel']->update(['status' => 'completed']);
    $return = requestLedgerReturn($this, $shop);
    $this->post('/returns', ['seller_order_id' => $shop['parcel']->id, 'reason' => 'Duplicate return request.'])->assertConflict();
    $this->actingAs($shop['seller'])->patch('/returns/'.$return->id, ['action' => 'approve', 'reason' => 'Seller cannot approve.'])->assertForbidden();
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Admin cannot assign riders.'])->assertForbidden();
    foreach (['buyer', 'seller', 'logistics', 'rider'] as $role) {
        $this->actingAs($other[$role])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('returns.data', 0));
    }
});

test('refund cannot precede receipt exceed collected money or repeat and damaged goods cannot restock', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'TOO-EARLY', 'reason' => 'Receipt is required first.'])->assertConflict();
    receiveLedgerReturn($this, $shop, $return, false);
    expect($shop['product']->fresh()->stock)->toBe(8);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 251, 'reference' => 'OVER-REFUND', 'reason' => 'Invalid excessive amount.'])->assertSessionHasErrors('amount');
    $this->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 100, 'reference' => 'PARTIAL-REFUND', 'reason' => 'Agreed actual partial product refund.'])->assertSessionHasNoErrors();
    $this->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 100, 'reference' => 'REPEAT-REFUND', 'reason' => 'Duplicate refund attempt.'])->assertConflict();
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'refund_cents' => 10000, 'seller_debit_cents' => 9000, 'commission_reversal_cents' => 1000]);
});

test('refund after payout records a seller debt instead of rewriting the historical payment', function () {
    $shop = settlementScenario();
    $this->actingAs($shop['admin'])->post('/settlements/'.$shop['parcel']->id, ['amount' => 180, 'reference' => 'PAID-BEFORE-RETURN'])->assertSessionHasNoErrors();
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 250, 'reference' => 'REFUND-AFTER-PAY', 'reason' => 'Actual full refund including shipping.'])->assertSessionHasNoErrors();
    $this->actingAs($shop['seller'])->get('/seller/costs')->assertInertia(fn (Assert $page) => $page->where('totals.balance', -18000)->where('totals.paid', 18000));
    $this->assertDatabaseCount('seller_payouts', 1);
});

test('seller CSV exports contain only own completed records and preserve delivery date filters', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
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
    receiveLedgerReturn($this, $shop, $return);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'OLD-REFUND', 'reason' => 'Actual product refund paid after settlement.'])->assertSessionHasNoErrors();
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

test('wrong return labels foreign riders and damaged restock attempts leave custody and stock unchanged', function () {
    $shop = settlementScenario();
    $other = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    $url = '/returns/'.$return->id;
    $this->actingAs($shop['admin'])->patch($url, ['action' => 'approve', 'reason' => 'Approved for physical return.'])->assertSessionHasNoErrors();
    $this->actingAs($other['logistics'])->patch($url, ['action' => 'assign', 'rider_id' => $other['rider']->id, 'reason' => 'Wrong company assignment.'])->assertForbidden();
    $this->actingAs($shop['logistics'])->patch($url, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Correct company assignment.'])->assertSessionHasNoErrors();
    $this->actingAs($other['rider'])->patch($url, ['action' => 'collect', 'tracking_reference' => $shop['delivery']->tracking_reference, 'reason' => 'Wrong assigned rider.'])->assertForbidden();
    $this->actingAs($shop['rider'])->patch($url, ['action' => 'collect', 'tracking_reference' => 'LM-WRONG', 'reason' => 'Wrong physical parcel.'])->assertSessionHasErrors('tracking_reference');
    expect($return->fresh()->status)->toBe('assigned');
    $this->patch($url, ['action' => 'collect', 'tracking_reference' => $shop['delivery']->tracking_reference, 'reason' => 'Correct physical collection.'])->assertSessionHasNoErrors();
    $this->actingAs($shop['seller'])->patch($url, ['action' => 'receive', 'tracking_reference' => $shop['delivery']->tracking_reference, 'condition' => 'damaged', 'restock' => true, 'reason' => 'Damaged goods cannot restock.'])->assertSessionHasErrors('restock');
    expect($return->fresh()->status)->toBe('collected');
    expect($shop['product']->fresh()->stock)->toBe(8);
});

test('unreconciled COD holds refunds and non financial roles do not receive refund accounting fields', function () {
    $shop = settlementScenario();
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['status' => 'collected']);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'refund', 'amount' => 200, 'reference' => 'UNFUNDED-REFUND', 'reason' => 'Cash not reconciled yet.'])->assertConflict();
    expect($return->fresh()->refunded_at)->toBeNull();
    $this->actingAs($shop['logistics'])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('returns.data', 1)->missing('returns.data.0.refund_cents')->missing('returns.data.0.seller_debit_cents')->missing('returns.data.0.seller_order.seller_proceeds'));
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

test('admin can close a received zero COD return without inventing a refund', function () {
    $shop = settlementScenario();
    $shop['parcel']->update(['subtotal' => 0, 'shipping_fee' => 0, 'commission_amount' => 0, 'seller_proceeds' => 0]);
    DB::table('cod_collections')->where('delivery_id', $shop['delivery']->id)->update(['amount' => 0, 'received_amount' => 0]);
    $return = requestLedgerReturn($this, $shop);
    receiveLedgerReturn($this, $shop, $return, false);
    $this->actingAs($shop['seller'])->patch('/returns/'.$return->id, ['action' => 'close', 'reason' => 'Seller cannot close Admin case.'])->assertForbidden();
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'close', 'reason' => 'Zero-COD return resolved; no refund is due.'])->assertSessionHasNoErrors();
    $this->patch('/returns/'.$return->id, ['action' => 'close', 'reason' => 'Repeated close attempt.'])->assertConflict();
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'status' => 'closed', 'refund_cents' => null]);
    $this->assertDatabaseHas('audit_events', ['action' => 'return_close']);
});

test('return assignment preserves service area eligibility for quoted parcels', function () {
    $shop = settlementScenario();
    $area = DB::table('service_areas')->insertGetId(['logistics_center_id' => $shop['center']->id, 'code' => 'RETURN-TEST', 'name' => 'Return test area', 'province_code' => '130000000', 'city_code' => '133900000', 'barangay_code' => '133900001', 'province_name' => 'Metro Manila', 'city_name' => 'Manila', 'barangay_name' => 'Test', 'is_active' => true]);
    $shop['delivery']->update(['service_area_id' => $area]);
    $return = requestLedgerReturn($this, $shop);
    $this->actingAs($shop['admin'])->patch('/returns/'.$return->id, ['action' => 'approve', 'reason' => 'Return approved for collection.'])->assertSessionHasNoErrors();
    $this->actingAs($shop['logistics'])->patch('/returns/'.$return->id, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Assign within provider coverage.'])->assertSessionHasErrors('rider_id');
    DB::table('rider_service_area')->insert(['rider_id' => $shop['rider']->id, 'service_area_id' => $area]);
    $this->patch('/returns/'.$return->id, ['action' => 'assign', 'rider_id' => $shop['rider']->id, 'reason' => 'Assign covered operational rider.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('parcel_returns', ['id' => $return->id, 'status' => 'assigned', 'rider_id' => $shop['rider']->id]);
});
