<?php

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

test('rider settings show rider registration and private documents without logistics management fields', function () {
    $this->travelTo(Carbon::parse('2026-10-18 12:00:00', 'Asia/Manila'));
    Storage::fake('local');
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);
    DB::table('user_profiles')->insert(['user_id' => $rider->id, 'first_name' => 'Rider', 'last_name' => 'Sample', 'middle_initial' => 'M', 'sex' => 'female', 'birthday' => '1998-04-20', 'created_at' => now(), 'updated_at' => now()]);
    DB::table('rider_profiles')->insert(['user_id' => $rider->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'RID123', 'plate_normalized' => 'RID123', 'created_at' => now(), 'updated_at' => now()]);
    $application = $rider->application()->create(['requested_role' => 'rider', 'status' => 'approved', 'logistics_center_id' => $center->id]);
    Storage::disk('local')->put('rider-settings/private-id.pdf', '%PDF-1.4 synthetic ID');
    $document = $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'rider-settings/private-id.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 25]);
    $other = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($other);
    $other->application()->create(['requested_role' => 'rider', 'status' => 'approved'])->documents()->create(['kind' => 'license', 'disk' => 'local', 'path' => 'other-private.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 10]);

    $this->actingAs($rider)->get('/settings/profile')->assertInertia(fn (Assert $page) => $page
        ->component('settings/rider')->where('companyName', $center->name)->where('plateNumber', 'RID123')
        ->where('personalDetails.Middle initial (optional)', 'M')->where('personalDetails.Age', '28')->where('vehicleType', 'motorcycle')
        ->has('documents', 1)->where('documents.0.id', $document->id)->missing('documents.0.path')->missing('documents.0.url')->missing('logisticsRegistration'));
    $url = URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]);
    $this->get($url)->assertForbidden();
    $this->actingAs($other)->get($url)->assertForbidden();
});

test('rider settings preserve display name updates and protected role affiliation', function () {
    $rider = User::factory()->create(['role' => 'rider']);
    $center = linkRiderToApprovedCenter($rider);

    $this->actingAs($rider)->patch('/settings/profile', ['name' => 'Updated Rider Name', 'email' => $rider->email, 'role' => 'logistics', 'logistics_center_id' => 999])
        ->assertRedirect('/settings/profile')->assertSessionHasNoErrors();

    expect($rider->fresh()->name)->toBe('Updated Rider Name');
    expect($rider->fresh()->role)->toBe('rider');
    expect($rider->fresh()->logistics_center_id)->toBe($center->id);
});

test('rider plate updates still return the account to logistics review', function () {
    $rider = User::factory()->create(['role' => 'rider']);
    linkRiderToApprovedCenter($rider);
    DB::table('rider_profiles')->insert(['user_id' => $rider->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'OLD123', 'plate_normalized' => 'OLD123', 'created_at' => now(), 'updated_at' => now()]);

    $this->actingAs($rider)->patch('/settings/profile', ['name' => $rider->name, 'email' => $rider->email, 'plate_number' => 'NEW123'])
        ->assertRedirect('/application/waiting')->assertSessionHasNoErrors();

    expect($rider->fresh()->status)->toBe('pending');
    $this->assertDatabaseHas('registration_applications', ['user_id' => $rider->id, 'requested_role' => 'rider', 'status' => 'submitted']);
});
