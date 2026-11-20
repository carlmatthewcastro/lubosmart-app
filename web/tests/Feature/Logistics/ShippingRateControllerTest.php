<?php

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

function shippingRateFixture(): array
{
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    $operator = $center->users()->where('role', 'logistics')->firstOrFail();
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([
            ['code' => '043404001', 'name' => 'First Barangay'], ['code' => '043404002', 'name' => 'Second Barangay'], ['code' => '043404003', 'name' => 'Third Barangay'],
        ]),
    ]);
    $payload = ['logistics_center_id' => $center->id, 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_codes' => ['043404001', '043404002'], 'base_fee' => '38.00', 'included_weight_grams' => 1000, 'extra_kg_fee' => '12.50', 'max_weight_grams' => 20000, 'is_active' => false];

    return compact('operator', 'center', 'rider', 'payload');
}

test('bulk creation stores independent barangay rates and does not assign riders', function (bool $published) {
    $f = shippingRateFixture();

    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', [...$f['payload'], 'is_active' => $published])->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('status', '2 shipping rates saved. Existing orders keep their original fee.');

    $this->assertDatabaseCount('shipping_rates', 2);
    $this->assertDatabaseCount('service_areas', 2);
    $this->assertDatabaseCount('rider_service_area', 0);
    foreach (['043404001', '043404002'] as $code) {
        $area = DB::table('service_areas')->where('barangay_code', $code)->sole();
        expect($area->logistics_center_id)->toBe($f['center']->id);
        $this->assertDatabaseHas('shipping_rates', ['service_area_id' => $area->id, 'base_fee_cents' => 3800, 'extra_kg_fee_cents' => 1250, 'included_weight_grams' => 1000, 'max_weight_grams' => 20000, 'is_active' => $published]);
    }
    $this->assertDatabaseCount('audit_events', 2);
    $this->assertDatabaseHas('commerce_settings', ['id' => 1, 'logistics_shipping_enabled' => $published]);
})->with(['draft' => false, 'published' => true]);

test('single barangay creation still accepts the original geographic field', function () {
    $f = shippingRateFixture();
    $payload = $f['payload'];
    unset($payload['barangay_codes']);

    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', $payload + ['barangay_code' => '043404001'])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseCount('shipping_rates', 1);
    $this->assertDatabaseHas('shipping_rates', ['base_fee_cents' => 3800]);
});

test('a database failure during a later rate rolls back every record in the batch', function () {
    $f = shippingRateFixture();
    DB::unprepared("CREATE TRIGGER fail_second_rate BEFORE INSERT ON shipping_rates WHEN (SELECT barangay_code FROM service_areas WHERE id = NEW.service_area_id) = '043404002' BEGIN SELECT RAISE(ABORT, 'Simulated rate storage failure'); END");
    $this->actingAs($f['operator'])->withoutExceptionHandling();

    expect(fn () => $this->post('/logistics/shipping-rates', [...$f['payload'], 'is_active' => true]))->toThrow(QueryException::class);

    $this->assertDatabaseCount('shipping_rates', 0);
    $this->assertDatabaseCount('service_areas', 0);
    $this->assertDatabaseCount('audit_events', 0);
    $this->assertDatabaseHas('commerce_settings', ['id' => 1, 'logistics_shipping_enabled' => false]);
});

test('a duplicate rejects the whole batch and names conflicts without overwriting rates', function () {
    $f = shippingRateFixture();
    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', $f['payload'])->assertSessionHasNoErrors();

    $this->post('/logistics/shipping-rates', [...$f['payload'], 'barangay_codes' => ['043404003', '043404001'], 'base_fee' => 45, 'is_active' => true])->assertSessionHasErrors(['barangay_codes' => 'Rates already exist for: First Barangay. Deselect these barangays or edit their existing rates.']);

    $this->assertDatabaseCount('shipping_rates', 2);
    $this->assertDatabaseMissing('service_areas', ['barangay_code' => '043404003']);
    $this->assertDatabaseMissing('shipping_rates', ['base_fee_cents' => 4500]);
    $this->assertDatabaseCount('audit_events', 2);
    $this->assertDatabaseHas('commerce_settings', ['id' => 1, 'logistics_shipping_enabled' => false]);
});

test('single creation rejects an existing rate unless its edit identity is supplied', function () {
    $f = shippingRateFixture();
    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', $f['payload'])->assertSessionHasNoErrors();
    $payload = $f['payload'];
    unset($payload['barangay_codes']);

    $this->post('/logistics/shipping-rates', [...$payload, 'barangay_code' => '043404001', 'base_fee' => 99])->assertSessionHasErrors('barangay_code');

    $this->assertDatabaseCount('shipping_rates', 2);
    $this->assertDatabaseMissing('shipping_rates', ['base_fee_cents' => 9900]);
});

test('an explicit individual edit leaves sibling barangay rates unchanged', function () {
    $f = shippingRateFixture();
    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', $f['payload'])->assertSessionHasNoErrors();
    $first = DB::table('shipping_rates')->orderBy('id')->first();
    $second = DB::table('shipping_rates')->orderByDesc('id')->first();
    $payload = $f['payload'];
    unset($payload['barangay_codes']);

    $this->post('/logistics/shipping-rates', [...$payload, 'rate_id' => $first->id, 'barangay_code' => '043404001', 'base_fee' => 45])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('shipping_rates', ['id' => $first->id, 'base_fee_cents' => 4500]);
    $this->assertDatabaseHas('shipping_rates', ['id' => $second->id, 'base_fee_cents' => 3800]);
    $this->assertDatabaseCount('shipping_rates', 2);
});

test('bulk validation rejects invalid geographic selections and rate values without writes', function (array $changes, string $error) {
    $f = shippingRateFixture();

    $this->actingAs($f['operator'])->post('/logistics/shipping-rates', array_replace($f['payload'], $changes))->assertSessionHasErrors($error);

    $this->assertDatabaseCount('shipping_rates', 0);
    $this->assertDatabaseCount('service_areas', 0);
    $this->assertDatabaseCount('audit_events', 0);
})->with([
    'empty selection' => [['barangay_codes' => []], 'barangay_codes'],
    'repeated selection' => [['barangay_codes' => ['043404001', '043404001']], 'barangay_codes.0'],
    'outside municipality' => [['barangay_codes' => ['043404001', '043405001']], 'barangay_codes.1'],
    'wrong province' => [['province_code' => '050000000'], 'barangay_codes.0'],
    'wrong municipality' => [['city_code' => '043405000'], 'barangay_codes.0'],
    'mixed creation and edit' => [['rate_id' => 1], 'barangay_codes'],
    'ambiguous geographic fields' => [['barangay_code' => '043404001'], 'barangay_codes'],
    'negative fee' => [['base_fee' => -1], 'base_fee'],
    'fractional cent' => [['extra_kg_fee' => '1.001'], 'extra_kg_fee'],
    'maximum below included' => [['max_weight_grams' => 500], 'max_weight_grams'],
]);

test('other logistics accounts cannot create or edit rates for this center', function () {
    $f = shippingRateFixture();
    $other = User::factory()->create(['role' => 'logistics']);

    $this->actingAs($other)->post('/logistics/shipping-rates', $f['payload'])->assertForbidden();

    $this->assertDatabaseCount('shipping_rates', 0);
});

test('a rate id from a different center cannot authorize an individual edit', function () {
    $own = shippingRateFixture();
    $other = shippingRateFixture();
    $this->actingAs($other['operator'])->post('/logistics/shipping-rates', $other['payload'])->assertSessionHasNoErrors();
    $foreign = DB::table('shipping_rates')->orderBy('id')->first();
    $payload = $own['payload'];
    unset($payload['barangay_codes']);

    $this->actingAs($own['operator'])->post('/logistics/shipping-rates', [...$payload, 'rate_id' => $foreign->id, 'barangay_code' => '043404001', 'base_fee' => 99])->assertNotFound();

    $this->assertDatabaseCount('shipping_rates', 2);
    $this->assertDatabaseMissing('shipping_rates', ['base_fee_cents' => 9900]);
});
