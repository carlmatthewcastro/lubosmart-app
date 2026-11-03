<?php

use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

it('creates five scoped demo queues and preserves progress on reruns', function () {
    Storage::fake('local');
    $owner = User::factory()->create(['role' => 'logistics']);
    $center = LogisticsCenter::query()->create(['code' => 'DEMO-TEST', 'name' => 'Test Center', 'address' => 'Synthetic']);
    $center->forceFill(['company_user_id' => $owner->id])->save();
    $owner->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
    $this->artisan('lubosmart:logistics-demo', ['account' => $owner->id])->assertSuccessful();
    expect(Order::query()->count())->toBe(5);
    expect(Delivery::query()->where('logistics_center_id', $center->id)->count())->toBe(5);
    $this->actingAs($owner)->get('/deliveries?stage=pickups')->assertInertia(fn ($page) => $page->has('deliveries.data', 1));
    $this->get('/deliveries?stage=incoming')->assertInertia(fn ($page) => $page->has('deliveries.data', 1));
    $this->get('/deliveries?stage=sorting')->assertInertia(fn ($page) => $page->has('deliveries.data', 1));
    $this->get('/deliveries?stage=dispatch')->assertInertia(fn ($page) => $page->has('deliveries.data', 1));
    $this->get('/deliveries?stage=monitoring')->assertInertia(fn ($page) => $page->has('deliveries.data', 1));
    $pickup = Delivery::query()->where('status', 'unassigned')->firstOrFail();
    $this->post('/deliveries/'.$pickup->id, ['action' => 'approve_pickup'])->assertSessionHasNoErrors();
    $this->artisan('lubosmart:logistics-demo', ['account' => $owner->id])->assertSuccessful();
    expect(Order::query()->count())->toBe(5);
    expect($pickup->fresh()->pickup_approved_at)->not->toBeNull();
    Storage::disk('local')->assertExists('demo/logistics-'.$owner->id.'-credentials.json');
});

it('refuses demo creation in production without creating orders', function () {
    app()->detectEnvironment(fn () => 'production');
    $this->artisan('lubosmart:logistics-demo', ['account' => 1])->assertFailed();
    $this->assertDatabaseCount('orders', 0);
});

it('refuses unapproved owners and foreign centers without creating orders', function () {
    $owner = User::factory()->create(['role' => 'logistics', 'status' => 'pending']);
    $this->artisan('lubosmart:logistics-demo', ['account' => $owner->id])->assertFailed();
    $owner->forceFill(['status' => 'approved'])->save();
    $this->artisan('lubosmart:logistics-demo', ['account' => $owner->id, '--center' => 999])->assertFailed();
    $this->assertDatabaseCount('orders', 0);
});

it('can prepare local samples without bypassing the owners pending email verification', function () {
    Storage::fake('local');
    $owner = User::factory()->unverified()->create(['role' => 'logistics', 'status' => 'approved']);
    $center = LogisticsCenter::query()->create(['code' => 'DEMO-UNVERIFIED', 'name' => 'Test Center', 'address' => 'Synthetic']);
    $center->forceFill(['company_user_id' => $owner->id])->save();
    $owner->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
    $this->artisan('lubosmart:logistics-demo', ['account' => $owner->id])->assertSuccessful();
    expect($owner->fresh()->email_verified_at)->toBeNull();
    $this->actingAs($owner)->get('/deliveries')->assertRedirect(route('verification.notice'));
});

it('allows the monitoring sample to complete the rider to logistics return handover', function () {
    Storage::fake('local');
    $owner = User::factory()->create(['role' => 'logistics']);
    $center = LogisticsCenter::query()->create(['code' => 'DEMO-RETURN', 'name' => 'Test Center', 'address' => 'Synthetic']);
    $center->forceFill(['company_user_id' => $owner->id])->save();
    $owner->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
    $this->artisan('lubosmart:logistics-demo', ['account' => $owner->id])->assertSuccessful();
    $parcel = Delivery::query()->where('status', 'out_for_delivery')->sole();
    $rider = $parcel->rider;

    $this->actingAs($rider)->post('/deliveries/'.$parcel->id, ['action' => 'failed_attempt', 'reason' => 'DEMO recipient unavailable'])->assertRedirect()->assertSessionHasNoErrors();
    $this->withSession(['password_hash_web' => $owner->password])->actingAs($owner)->post('/deliveries/'.$parcel->id, ['action' => 'return_to_center', 'reason' => 'DEMO rider returning parcel'])->assertRedirect()->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$parcel->id, ['action' => 'receive_return', 'reason' => 'DEMO return physically checked', 'tracking_reference' => $parcel->tracking_reference, 'capture_method' => 'scanner', 'receipt_condition' => 'intact'])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('deliveries', ['id' => $parcel->id, 'exception_status' => 'returned_to_center', 'dispatch_accepted_at' => null]);
    $this->assertDatabaseHas('parcel_events', ['delivery_id' => $parcel->id, 'type' => 'receive_return', 'actor_id' => $owner->id]);
    $this->assertDatabaseCount('cod_collections', 0);
});
