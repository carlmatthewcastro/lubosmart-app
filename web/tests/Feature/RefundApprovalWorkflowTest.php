<?php

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ParcelReturn;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\LubosCoins;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

require_once __DIR__.'/../Support/RefundScenario.php';

function requestRefund($test, array $f, int $quantity = 1, string $amount = '100.00'): ParcelReturn
{
    $test->actingAs($f['buyer'])->post('/returns', ['seller_order_id' => $f['parcel']->id, 'reason_kind' => 'other',
        'reason' => 'The requested item does not match the listing.', 'shipping_amount' => '0.00',
        'items' => [['order_item_id' => $f['parcel']->items()->sole()->id, 'quantity' => $quantity, 'amount' => $amount]],
    ])->assertRedirect()->assertSessionHasNoErrors();

    return ParcelReturn::query()->latest('id')->firstOrFail();
}

function approvalData(ParcelReturn $case, bool $physical = true): array
{
    return ['action' => 'approve', 'items' => $case->requestedItems->map(fn ($item) => ['order_item_id' => $item->order_item_id,
        'quantity' => $item->quantity, 'amount' => number_format($item->requested_cents / 100, 2, '.', '')])->all(),
        'shipping_amount' => '0.00', 'responsibility' => 'seller', 'return_shipping_responsibility' => $physical ? 'platform' : 'not_required',
        'physical_return_required' => $physical, 'reason' => 'Reviewed purchase snapshots and submitted evidence.'];
}

test('approval immediately credits spendable coins and completes return without another credit', function () {
    Storage::fake('local');
    $f = refundScenario();
    $case = requestRefund($this, $f);
    $url = '/returns/'.$case->id;
    $approval = approvalData($case);
    $this->actingAs($f['admin'])->patch($url, $approval)->assertSessionHasNoErrors();
    $this->patch($url, $approval)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('buyer_wallets', ['buyer_id' => $f['buyer']->id, 'balance_cents' => 10000]);
    $this->assertDatabaseHas('refund_fund_entries', ['parcel_return_id' => $case->id, 'type' => 'coin_refund_liability', 'amount_cents' => 10000]);
    $this->assertDatabaseHas('refund_reserves', ['id' => 1, 'available_cents' => 0]);
    $this->assertDatabaseCount('return_tasks', 1);
    $this->assertDatabaseCount('wallet_transactions', 1);
    expect($f['buyer']->notifications()->where('data->event', 'coins.credit')->count())->toBe(1);
    // Spend the credit through the real checkout boundary before return collection.
    $product = $f['product']->replicate();
    $product->price = '50.00';
    $product->save();
    $address = Address::query()->create(['user_id' => $f['buyer']->id, 'label' => 'Home', 'recipient_name' => 'Buyer', 'phone' => '09171234567',
        'line1' => 'Test street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
    $cart = Cart::query()->create(['user_id' => $f['buyer']->id]);
    CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);
    $this->actingAs($f['buyer'])->post('/checkout', ['address_id' => $address->id, 'checkout_key' => (string) Str::uuid(), 'coins_to_redeem_cents' => 5000])->assertRedirect('/orders')->assertSessionHasNoErrors();
    $this->assertDatabaseHas('buyer_wallets', ['buyer_id' => $f['buyer']->id, 'balance_cents' => 5000]);
    $this->actingAs($f['logistics'])->get('/returns')->assertInertia(fn (Assert $page) => $page->where('returns.data.0.task.status', 'approved'));
    $this->post($url, ['_method' => 'patch', 'action' => 'assign', 'rider_id' => $f['rider']->id, 'reason' => 'Assign both legs.', 'proof' => ''])->assertSessionHasNoErrors();
    $this->actingAs($f['seller'])->patch($url, ['action' => 'receive', 'condition' => 'intact', 'restock' => false, 'reason' => 'Too early.'])->assertConflict();
    $this->actingAs($f['rider'])->patch($url, ['action' => 'collect', 'reason' => 'Actual handover.', 'recipient_name' => 'Buyer'])->assertSessionHasErrors('proof');
    $this->patch($url, ['action' => 'collect', 'reason' => 'Actual handover.', 'recipient_name' => 'Buyer', 'proof' => UploadedFile::fake()->createWithContent('pickup.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII='))])->assertSessionHasNoErrors();
    $this->actingAs($f['logistics'])->patch($url, ['action' => 'facility_receive', 'reason' => 'Physically received at facility.'])->assertSessionHasNoErrors();
    expect($case->fresh()->task->status)->toBe('seller_assigned');
    $this->actingAs($f['rider'])->patch($url, ['action' => 'accept_seller_dispatch', 'reason' => 'Physically accepted for seller delivery.'])->assertSessionHasNoErrors();
    $this->patch($url, ['action' => 'deliver_seller', 'reason' => 'Seller delivery complete.', 'recipient_name' => 'Seller', 'proof' => UploadedFile::fake()->createWithContent('seller.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII='))])->assertSessionHasNoErrors();
    $this->actingAs($f['seller'])->patch($url, ['action' => 'receive', 'condition' => 'intact', 'restock' => true, 'reason' => 'Received the selected returned item.'])->assertSessionHasNoErrors();
    $this->patch($url, ['action' => 'receive', 'condition' => 'intact', 'restock' => true, 'reason' => 'Duplicate receipt.'])->assertConflict();
    $this->patch($url, ['action' => 'discrepancy', 'reason' => 'Packaging discrepancy requires review.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('return_tasks', ['parcel_return_id' => $case->id, 'status' => 'received', 'confirmed_by' => $f['seller']->id]);
    $this->assertDatabaseCount('return_task_proofs', 2);
    $this->assertDatabaseCount('wallet_transactions', 2);
    expect($f['product']->fresh()->stock)->toBe(9);
    $this->actingAs($f['logistics'])->patch($url, ['action' => 'record_return_fee', 'leg' => 'return', 'amount' => '25.00', 'reason' => 'Agreed actual seller delivery fee.'])->assertSessionHasNoErrors();
    $this->patch($url, ['action' => 'record_return_fee', 'leg' => 'return', 'amount' => '25.00', 'reason' => 'Duplicate fee must fail.'])->assertConflict();
    $this->assertDatabaseHas('refund_fund_entries', ['type' => 'return_shipping_obligation', 'amount_cents' => 2500, 'responsibility' => 'platform', 'logistics_center_id' => $f['center']->id]);
    $this->assertDatabaseHas('rider_payments', ['return_task_id' => $case->fresh()->task->id, 'amount_cents' => 2500, 'paid_at' => null]);
    $this->assertDatabaseHas('buyer_wallets', ['buyer_id' => $f['buyer']->id, 'balance_cents' => 5000]);
});

test('no-return approval makes no task and original wallet history is visible only to its buyer', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f);
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case, false))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('return_tasks', 0);
    $this->actingAs($f['buyer'])->get('/wallet')->assertInertia(fn (Assert $page) => $page->where('balance_cents', 10000)->has('entries.data', 1));
    $this->get('/returns')->assertInertia(fn (Assert $page) => $page->where('returns.data.0.refund_status', 'credited')->has('returns.data.0.wallet_entries', 1));
    $other = User::factory()->create();
    $this->actingAs($other)->get('/returns')->assertInertia(fn (Assert $page) => $page->has('returns.data', 0));
    $this->patch('/returns/'.$case->id, approvalData($case))->assertForbidden();
    $this->actingAs($f['logistics'])->get('/returns')->assertInertia(fn (Assert $page) => $page->has('returns.data', 0));
});

test('partial requests reserve quantities and all financial reports count the original sale once', function () {
    $f = refundScenario();
    $first = requestRefund($this, $f);
    $second = requestRefund($this, $f);
    $this->post('/returns', ['seller_order_id' => $f['parcel']->id, 'reason_kind' => 'other', 'reason' => 'Excess request must fail.', 'shipping_amount' => '0.00',
        'items' => [['order_item_id' => $f['parcel']->items()->sole()->id, 'quantity' => 1, 'amount' => '100.00']]])->assertSessionHasErrors('items.0.quantity');
    foreach ([$first, $second] as $case) {
        $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case, false))->assertSessionHasNoErrors();
    }
    $this->assertDatabaseHas('buyer_wallets', ['buyer_id' => $f['buyer']->id, 'balance_cents' => 20000]);
    $this->get('/finance')->assertInertia(fn (Assert $page) => $page->where('amounts.Net product sales', 20000)->where('amounts.Approved refund value', 20000)->has('transactions.data', 1));
    $this->get('/settlements')->assertInertia(fn (Assert $page) => $page->where('parcels.data.0.amount_cents', 0));
});

test('over-refunds and approval beyond the request fail without a wallet entry', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f);
    $data = approvalData($case);
    $data['items'][0]['amount'] = '100.01';
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, $data)->assertSessionHasErrors('items.0.amount');
    $data = approvalData($case);
    $data['shipping_amount'] = '0.01';
    $this->patch('/returns/'.$case->id, $data)->assertSessionHasErrors('shipping_amount');
    $this->assertDatabaseCount('wallet_transactions', 0);
    expect($case->fresh()->refund_status)->toBe('pending');
});

test('wallet and required accounting failures roll back the whole approval', function (string $failure) {
    $f = refundScenario();
    $case = requestRefund($this, $f);
    if ($failure === 'wallet') {
        $this->mock(LubosCoins::class)->shouldReceive('refund')->once()->andThrow(new RuntimeException('Synthetic wallet failure'));
    } elseif ($failure === 'ledger_write') {
        DB::unprepared("CREATE TRIGGER reject_refund_liability BEFORE INSERT ON refund_fund_entries BEGIN SELECT RAISE(ABORT, 'Synthetic ledger write failure'); END");
    } else {
        $this->mock(AuditLogger::class)->shouldReceive('record')->once()->andThrow(new RuntimeException('Synthetic accounting audit failure'));
    }
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case))->assertSessionHasErrors('operation');
    expect($case->fresh()->refund_status)->toBe('pending');
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->assertDatabaseCount('return_tasks', 0);
    $this->assertDatabaseMissing('refund_fund_entries', ['type' => 'coin_refund_liability']);
})->with(['wallet', 'ledger_write', 'audit']);

test('partial approval preserves the original request and releases unapproved quantities', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f, 2, '200.00');
    $data = approvalData($case);
    $data['items'][0]['quantity'] = 1;
    $data['items'][0]['amount'] = '100.00';
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, $data)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('return_items', ['parcel_return_id' => $case->id, 'quantity' => 2, 'requested_cents' => 20000, 'approved_quantity' => 1, 'approved_cents' => 10000]);
    $this->actingAs($f['logistics'])->get('/returns')->assertInertia(fn (Assert $page) => $page->where('returns.data.0.items.0.quantity', 1));
    requestRefund($this, $f);
    $this->assertDatabaseCount('parcel_returns', 2);
});

test('rejection releases quantity reservations without creating financial or transport records', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f, 2, '200.00');
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, ['action' => 'reject', 'reason' => 'Evidence does not establish the requested issue.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('audit_events', ['action' => 'return_reject', 'subject_id' => $case->id, 'actor_id' => $f['admin']->id]);
    requestRefund($this, $f, 2, '200.00');
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->assertDatabaseCount('return_tasks', 0);
});

test('discounted unit and commission remainders balance across repeated partial refunds', function () {
    $f = refundScenario();
    $f['parcel']->items()->update(['quantity' => 3, 'price_each' => '0.05']);
    $f['parcel']->update(['subtotal' => '0.10', 'discount_amount' => '0.05', 'commission_amount' => '0.01', 'seller_proceeds' => '0.09']);
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['amount' => '50.10', 'received_amount' => '50.10']);
    foreach (['0.04', '0.03', '0.03'] as $amount) {
        $case = requestRefund($this, $f, 1, $amount);
        $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case, false))->assertSessionHasNoErrors();
    }
    expect((int) ParcelReturn::query()->sum('refund_cents'))->toBe(10);
    expect((int) ParcelReturn::query()->sum('commission_reversal_cents'))->toBe(1);
    expect((int) ParcelReturn::query()->sum('seller_debit_cents'))->toBe(9);
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 10]);
});

test('an assigned rider and authorized company alone can mutate a return task or access its private proof', function () {
    Storage::fake('local');
    $f = refundScenario();
    $other = refundScenario();
    $case = requestRefund($this, $f);
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case))->assertSessionHasNoErrors();
    $this->actingAs($other['logistics'])->patch('/returns/'.$case->id, ['action' => 'assign', 'rider_id' => $other['rider']->id, 'reason' => 'Wrong company.'])->assertNotFound();
    $this->actingAs($f['logistics'])->patch('/returns/'.$case->id, ['action' => 'assign', 'rider_id' => $f['rider']->id, 'reason' => 'Valid assignment.'])->assertSessionHasNoErrors();
    $this->actingAs($other['rider'])->patch('/returns/'.$case->id, ['action' => 'collect', 'reason' => 'Unassigned rider.'])->assertNotFound();
    $this->actingAs($f['rider'])->patch('/returns/'.$case->id, ['action' => 'collect', 'reason' => 'Actual pickup.', 'recipient_name' => 'Buyer',
        'proof' => UploadedFile::fake()->createWithContent('pickup.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII='))])->assertSessionHasNoErrors();
    $proof = DB::table('return_task_proofs')->sole();
    $this->get('/returns/'.$case->id.'/proof/'.$proof->id)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    $this->actingAs($other['buyer'])->get('/returns/'.$case->id.'/proof/'.$proof->id)->assertNotFound();
});

test('settled cash is preserved and refund debt is recoverable without charging the rider', function () {
    $f = refundScenario();
    $this->actingAs($f['admin'])->post('/settlements/'.$f['parcel']->id, ['amount' => '180.00', 'reference' => 'ACTUAL-SELLER-PAID'])->assertSessionHasNoErrors();
    $case = requestRefund($this, $f, 2, '200.00');
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case, false))->assertSessionHasNoErrors();
    $this->assertDatabaseHas('seller_payouts', ['seller_order_id' => $f['parcel']->id, 'amount_cents' => 18000]);
    $this->get('/finance')->assertInertia(fn (Assert $page) => $page->where('amounts.Seller recovery balance', 18000)->where('amounts.Cash held by Logistics', 5000));
    $this->assertDatabaseCount('rider_payments', 0);
});

test('reconciliation is dry-run by default and credits a reviewed historical obligation exactly once', function () {
    $f = refundScenario();
    $case = ParcelReturn::query()->create(['seller_order_id' => $f['parcel']->id, 'buyer_id' => $f['buyer']->id, 'status' => 'approved', 'reason' => 'Historical approved obligation.', 'responsibility' => 'seller', 'responsibility_reviewed_at' => now(), 'product_refund_cents' => 10000, 'shipping_refund_cents' => 0, 'refund_cents' => 10000]);
    $case->forceFill(['refund_status' => 'approved_uncredited', 'physical_return_required' => false, 'return_shipping_responsibility' => 'not_required'])->save();
    $this->artisan('returns:reconcile-refund-credits')->assertSuccessful();
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertSuccessful();
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertSuccessful();
    $this->assertDatabaseCount('wallet_transactions', 1);
    $this->assertDatabaseHas('buyer_wallets', ['buyer_id' => $f['buyer']->id, 'balance_cents' => 10000]);
});

test('reconciliation flags incomplete historical approvals instead of guessing an amount', function () {
    $f = refundScenario();
    $case = ParcelReturn::query()->create(['seller_order_id' => $f['parcel']->id, 'buyer_id' => $f['buyer']->id, 'status' => 'approved', 'reason' => 'Missing approval amount.']);
    $case->forceFill(['refund_status' => 'approved_uncredited'])->save();
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertFailed();
    $this->assertDatabaseCount('wallet_transactions', 0);
});

test('reconciliation preserves an existing coin restoration and posts only the missing credit component', function () {
    $f = refundScenario();
    $f['parcel']->update(['coins_redeemed_cents' => 5000, 'merchandise_cash_cents' => 15000, 'cod_due_cents' => 20000]);
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['amount' => '200.00', 'received_amount' => '200.00']);
    DB::table('buyer_wallets')->insert(['buyer_id' => $f['buyer']->id, 'balance_cents' => 5000]);
    DB::transaction(fn () => app(LubosCoins::class)->redeem($f['buyer'], $f['parcel']->order, 5000));
    $case = ParcelReturn::query()->create(['workflow_version' => 2, 'seller_order_id' => $f['parcel']->id, 'buyer_id' => $f['buyer']->id,
        'status' => 'approved', 'reason' => 'Historical partially written coin refund.', 'responsibility' => 'seller', 'responsibility_reviewed_at' => now(),
        'refund_method' => 'coins', 'coins_refunded_cents' => 10000, 'refund_cents' => 10000, 'product_refund_cents' => 10000, 'shipping_refund_cents' => 0]);
    $case->forceFill(['refund_status' => 'approved_uncredited', 'physical_return_required' => false, 'return_shipping_responsibility' => 'not_required'])->save();
    DB::transaction(fn () => app(LubosCoins::class)->refund($case, $f['admin'], 2500, 0));
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertSuccessful();
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertSuccessful();
    $this->assertDatabaseHas('buyer_wallets', ['buyer_id' => $f['buyer']->id, 'balance_cents' => 10000]);
    expect(DB::table('wallet_transactions')->where('type', 'return_restoration')->count())->toBe(1);
    expect(DB::table('wallet_transactions')->where('type', 'approved_refund_credit')->count())->toBe(1);
});

test('missing seller address can be resolved through the saved account address without repeating financial approval', function () {
    $f = refundScenario();
    $f['parcel']->update(['shipping_quote' => []]);
    $case = requestRefund($this, $f);
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case))->assertSessionHasNoErrors();
    $data = ['action' => 'assign', 'rider_id' => $f['rider']->id, 'reason' => 'Collect and return to the seller.'];
    $this->actingAs($f['logistics'])->patch('/returns/'.$case->id, $data)->assertSessionHasErrors('rider_id');
    Address::query()->create(['user_id' => $f['seller']->id, 'label' => 'Return', 'recipient_name' => 'Seller', 'phone' => '09171234567',
        'line1' => 'Seller street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000', 'is_default' => true]);
    $this->patch('/returns/'.$case->id, $data)->assertSessionHasNoErrors();
    expect($case->fresh()->task->seller_address['line1'])->toBe('Seller street');
    $this->assertDatabaseCount('wallet_transactions', 1);
});

test('physical approval cannot create an orphan task under an inactive original provider', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f);
    $f['center']->update(['is_active' => false]);
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case))->assertSessionHasErrors('physical_return_required');
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->assertDatabaseCount('return_tasks', 0);
    $this->patch('/returns/'.$case->id, approvalData($case, false))->assertSessionHasNoErrors();
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 10000]);
});

test('reconciliation never substitutes requested value for a smaller recorded approval', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f, 2, '200.00');
    $case->forceFill(['refund_status' => 'approved_uncredited', 'refund_cents' => 10000, 'product_refund_cents' => 10000, 'shipping_refund_cents' => 0,
        'responsibility' => 'seller', 'responsibility_reviewed_at' => now(), 'physical_return_required' => false, 'return_shipping_responsibility' => 'not_required'])->save();
    $this->artisan('returns:reconcile-refund-credits', ['--apply' => true, '--actor' => $f['admin']->id])->assertFailed();
    $this->assertDatabaseCount('wallet_transactions', 0);
    expect($case->fresh()->refund_cents)->toBe(10000);
});

test('a genuinely free purchased item can be physically returned without inventing coin value', function () {
    $f = refundScenario();
    $f['parcel']->items()->update(['price_each' => '0.00']);
    $f['parcel']->update(['subtotal' => '0.00', 'shipping_fee' => '0.00', 'commission_amount' => '0.00', 'seller_proceeds' => '0.00']);
    DB::table('cod_collections')->where('delivery_id', $f['delivery']->id)->update(['amount' => '0.00', 'received_amount' => '0.00']);
    $case = requestRefund($this, $f, 1, '0.00');
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->assertDatabaseCount('return_tasks', 1);
    expect($case->fresh()->refund_status)->toBe('approved_no_refund');
});

test('explicit corrections preserve the original reserve basis and wallet history', function (bool $legacyAllocation) {
    $f = refundScenario();
    $case = requestRefund($this, $f);
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case, false))->assertSessionHasNoErrors();
    $entry = DB::table('wallet_transactions')->sole();
    if ($legacyAllocation) {
        DB::table('refund_fund_entries')->insert(['type' => 'refund_allocation', 'amount_cents' => -10000, 'parcel_return_id' => $case->id,
            'actor_id' => $f['admin']->id, 'operation_key' => 'refund:'.$case->id, 'reference' => 'HISTORICAL-ALLOCATION', 'notes' => 'Existing historical full reserve allocation retained by reconciliation.', 'created_at' => now()]);
    }
    $this->post('/wallet-adjustments', ['transaction_id' => $entry->id, 'reason' => 'Documented exceptional finance correction.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('refund_reserves', ['id' => 1, 'available_cents' => $legacyAllocation ? 10000 : 0]);
    $debit = DB::table('wallet_transactions')->where('type', 'corrective_debit')->sole();
    $this->post('/wallet-adjustments', ['transaction_id' => $debit->id, 'reason' => 'Reviewed reversal of the exceptional correction.'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('buyer_wallets', ['balance_cents' => 10000]);
    $this->assertDatabaseHas('refund_reserves', ['id' => 1, 'available_cents' => 0]);
    $this->assertDatabaseHas('wallet_transactions', ['id' => $entry->id, 'amount_cents' => 10000]);
    expect(DB::table('refund_fund_entries')->where('type', $legacyAllocation ? 'wallet_correction' : 'coin_liability_correction')->count())->toBe(2);
})->with(['liability-only' => false, 'existing reserve allocation' => true]);

test('a corrupt historical buyer link cannot credit someone other than the original purchaser', function () {
    $f = refundScenario();
    $case = requestRefund($this, $f);
    $case->update(['buyer_id' => User::factory()->create()->id]);
    $this->actingAs($f['admin'])->patch('/returns/'.$case->id, approvalData($case))->assertSessionHasErrors('approval');
    $this->assertDatabaseCount('wallet_transactions', 0);
    $this->assertDatabaseCount('return_tasks', 0);
});
