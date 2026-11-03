<?php

use App\Models\Delivery;
use App\Models\User;
use Database\Seeders\RiderDemoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function demoRider(): User
{
    Storage::fake('local');
    test()->seed(RiderDemoSeeder::class);

    return User::query()->where('role', 'rider')->sole();
}

test('rider dashboard and notification queues are scoped to the assigned rider', function () {
    $rider = demoRider();
    $foreign = Delivery::query()->where('status', 'out_for_delivery')->sole();
    $other = User::factory()->create(['role' => 'rider', 'logistics_center_id' => $rider->logistics_center_id]);
    $other->logisticsCenters()->attach($rider->logistics_center_id, ['granted_by' => $rider->logistics_company_id]);
    $foreign->update(['rider_id' => $other->id]);

    $this->actingAs($rider)->get('/dashboard/rider')->assertInertia(fn (Assert $page) => $page
        ->component('rider/dashboard')->where('queues.all', 4)->where('queues.pickups', 2)
        ->where('queues.dispatch', 1)->where('queues.monitoring', 0)->where('pendingCod', '0')
        ->has('recentParcels', 4)->missing('applications')->missing('riders'));
    $this->get('/rider/notifications')->assertOk()->assertJsonPath('all', 4)->assertJsonPath('monitoring', 0)->assertHeader('Cache-Control', 'no-store, private');
    $this->get('/deliveries?stage=monitoring')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 0));
    $this->get('/deliveries?stage=pickups')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 2)->where('deliveries.data.0.rider_id', $rider->id));
    $this->get('/deliveries?search='.$foreign->tracking_reference)->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 0));
    $this->post('/deliveries/'.$foreign->id, ['action' => 'failed_attempt', 'reason' => 'Test'])->assertForbidden();
    foreach (['/logistics/notifications', '/logistics/scan', '/logistics/riders', '/reviews', '/accounts'] as $url) {
        $this->get($url)->assertForbidden();
    }
});

test('rider can accept demo dispatch and complete delivery with real proof and COD validation', function () {
    Notification::fake();
    $rider = demoRider();
    $parcel = Delivery::query()->where('status', 'in_transit')->sole();
    $identity = ['tracking_reference' => $parcel->tracking_reference, 'capture_method' => 'manual', 'reason' => 'Synthetic local test parcel'];

    $this->actingAs($rider)->post('/deliveries/'.$parcel->id, ['action' => 'out_for_delivery'])->assertStatus(409);
    $this->post('/deliveries/'.$parcel->id, ['action' => 'accept_dispatch', ...$identity])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$parcel->id, ['action' => 'out_for_delivery'])->assertSessionHasNoErrors();
    $this->post('/deliveries/'.$parcel->id, ['action' => 'delivered', ...$identity])->assertSessionHasErrors('proof');
    $this->post('/deliveries/'.$parcel->id, ['action' => 'delivered', ...$identity, 'proof' => UploadedFile::fake()->createWithContent('demo-proof.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=')), 'amount' => '150.00', 'recipient_name' => 'DEMO Recipient'])->assertSessionHasNoErrors();

    expect($parcel->fresh()->status)->toBe('delivered');
    Storage::disk('local')->assertExists($parcel->fresh()->proof_photo_path);
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $parcel->id, 'rider_id' => $rider->id, 'amount' => '150.00', 'status' => 'collected']);
    $this->get('/dashboard/rider')->assertInertia(fn (Assert $page) => $page->where('queues.completed', 1)->where('queues.cash', 1)->where('pendingCod', '150'));
    $this->get('/deliveries?stage=cash')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 1)->where('deliveries.data.0.id', $parcel->id));
    $this->post('/deliveries/'.$parcel->id, ['action' => 'receive_cod', 'amount' => '150.00', 'handover_reference' => 'DEMO'])->assertForbidden();
    $owner = User::query()->where('role', 'logistics')->sole();
    $this->withSession(['password_hash_web' => $owner->password])->actingAs($owner)->post('/deliveries/'.$parcel->id, ['action' => 'receive_cod', 'amount' => '150.00', 'handover_reference' => 'DEMO-RECEIPT'])->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseHas('cod_collections', ['delivery_id' => $parcel->id, 'status' => 'handed_over']);
    $this->withSession(['password_hash_web' => $rider->password])->actingAs($rider)->get('/rider/notifications')->assertJsonPath('cash', 0);
});

test('delivery issues require a reason and remain visible to the assigned rider', function () {
    $rider = demoRider();
    $parcel = Delivery::query()->where('status', 'out_for_delivery')->sole();

    $this->actingAs($rider)->post('/deliveries/'.$parcel->id, ['action' => 'failed_attempt'])->assertSessionHasErrors('reason');
    $this->post('/deliveries/'.$parcel->id, ['action' => 'failed_attempt', 'reason' => 'DEMO recipient unavailable'])->assertSessionHasNoErrors();
    $this->get('/deliveries?stage=exceptions')->assertInertia(fn (Assert $page) => $page->has('deliveries.data', 1)->where('deliveries.data.0.exception_status', 'failed_attempt'));
    $this->get('/rider/notifications')->assertJsonPath('exceptions', 1)->assertJsonPath('monitoring', 0);
});

test('empty rider dashboard reports zero actual work without company management data', function () {
    $rider = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($rider);

    $this->actingAs($rider)->get('/dashboard/rider')->assertInertia(fn (Assert $page) => $page
        ->where('queues.all', 0)->where('activeCount', 0)->where('pendingCod', '0')->has('recentParcels', 0)->missing('applications'));
});

test('rider demo reruns preserve passwords progress and private logins', function () {
    $rider = demoRider();
    $password = $rider->password;
    $ownerLogin = Storage::disk('local')->get('demo/logistics-login.json');
    $login = json_decode($ownerLogin, true, 512, JSON_THROW_ON_ERROR);
    expect(Hash::check($login['password'], User::query()->where('role', 'logistics')->sole()->password))->toBeTrue();
    $parcel = Delivery::query()->where('status', 'assigned')->sole();
    $this->actingAs($rider)->post('/deliveries/'.$parcel->id, ['action' => 'picked_up', 'tracking_reference' => $parcel->tracking_reference, 'capture_method' => 'manual', 'reason' => 'Local demo pickup'])->assertSessionHasNoErrors();

    $this->seed(RiderDemoSeeder::class);

    $this->assertDatabaseCount('deliveries', 5);
    expect($parcel->fresh()->status)->toBe('picked_up');
    expect($rider->fresh()->password)->toBe($password);
    expect(Storage::disk('local')->get('demo/logistics-login.json'))->toBe($ownerLogin);
    Storage::disk('local')->assertExists('demo/rider-login.json');
    $this->assertDatabaseCount('cod_collections', 0);
});

test('rider notifications deny other roles and demo seeding refuses production', function () {
    $this->actingAs(User::factory()->create(['role' => 'buyer']))->get('/rider/notifications')->assertForbidden();
    app()->detectEnvironment(fn () => 'production');

    expect(fn () => (new RiderDemoSeeder)->run())->toThrow(RuntimeException::class, 'only available');
    $this->assertDatabaseCount('deliveries', 0);
});
