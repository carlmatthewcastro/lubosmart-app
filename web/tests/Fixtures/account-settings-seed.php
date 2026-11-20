<?php

use App\Models\Address;
use App\Models\LogisticsCenter;
use App\Models\PsgcLocation;
use App\Models\User;
use App\Services\AccountSettings;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Used only by the disposable account settings browser check.
require dirname(__DIR__, 2).'/vendor/autoload.php';
$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
if (! $stage || ! str_starts_with($stage, realpath(sys_get_temp_dir()).DIRECTORY_SEPARATOR)
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('An isolated browser database is required.');
}
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$owner = User::factory()->create(['role' => 'logistics', 'email' => 'settings@example.test', 'password' => 'Browser@2026']);
User::factory()->create(['role' => 'admin', 'email' => 'review@example.test', 'password' => 'Browser@2026']);
$address = Address::query()->create(['user_id' => $owner->id, 'label' => 'Registration', 'recipient_name' => $owner->name, 'phone' => '09170000001', 'line1' => '5 Main Street', 'house_number' => '5', 'street' => 'Main Street', 'barangay' => 'Kapitolyo', 'city' => 'Pasig City', 'province' => 'Metro Manila', 'region' => '130000000', 'zip' => '1603']);
DB::table('user_profiles')->insert(['user_id' => $owner->id, 'first_name' => 'Carla', 'last_name' => 'Santos', 'middle_initial' => 'M', 'sex' => 'female', 'birthday' => '1990-01-01', 'province_code' => '130000000', 'city_code' => '137403000', 'barangay_code' => '137403016']);
$application = $owner->application()->create(['requested_role' => 'logistics', 'status' => 'approved', 'business_name' => 'Synthetic Logistics', 'sec_number' => 'CS202012345', 'tin' => '123-456-789-115', 'region_code' => '130000000', 'service_regions' => ['130000000', '040000000']]);
$application->forceFill(['address_id' => $address->id])->save();
app(AccountSettings::class)->capture($owner);
PsgcLocation::query()->create(['region_code' => '040000000', 'region_name' => 'Region IV-A (CALABARZON)', 'province_code' => '043400000', 'province_name' => 'Laguna', 'city_code' => '043404000', 'city_name' => 'Cabuyao', 'barangay_code' => '043404001', 'barangay_name' => 'Baclaran', 'postal_code' => '4025']);
foreach (['buyer', 'seller', 'logistics'] as $role) {
    $applicant = User::factory()->create(['role' => $role, 'status' => 'pending', 'name' => 'Notification '.$role, 'password' => 'Browser@2026']);
    $applicant->application()->create(['requested_role' => $role, 'status' => 'submitted', 'business_name' => 'Notification '.$role.' business', 'submitted_at' => now()]);
}

if (getenv('LUBOSMART_SHARED_SETTINGS_ONLY') === '1') {
    foreach (['buyer', 'seller', 'rider'] as $role) {
        $user = User::factory()->create(['role' => $role, 'email' => $role.'-settings@example.test', 'name' => 'Johanna Sample', 'password' => 'Browser@2026']);
        if ($role === 'rider') {
            $center = LogisticsCenter::query()->create(['code' => 'SHARED-SETTINGS', 'name' => 'Settings Center', 'is_active' => true, 'region' => '130000000', 'province' => 'Metro Manila', 'city' => 'Pasig City', 'barangay' => 'Kapitolyo', 'address' => '5 Main Street', 'contact_number' => '09170000002']);
            $center->forceFill(['company_user_id' => $owner->id])->save();
            $owner->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
            $user->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
            $user->forceFill(['logistics_center_id' => $center->id, 'logistics_company_id' => $owner->id])->save();
            if (! $user->canOperate()) {
                throw new RuntimeException('Rider fixture must have an operational center.');
            }
        }
        DB::table('user_profiles')->insert(['user_id' => $user->id, 'first_name' => 'Johanna', 'last_name' => 'Sample', 'sex' => 'female', 'birthday' => '2003-02-07']);
        $userAddress = $address->replicate();
        $userAddress->user_id = $user->id;
        $userAddress->save();
        $application = $user->application()->create(['requested_role' => $role, 'status' => 'approved', 'seller_type' => $role === 'seller' ? 'individual' : null, 'logistics_center_id' => $role === 'rider' ? $center->id : null]);
        $application->forceFill(['address_id' => $userAddress->id])->save();
        $directory = $stage.DIRECTORY_SEPARATOR.'uploads'.DIRECTORY_SEPARATOR.'settings';
        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }
        file_put_contents($directory.DIRECTORY_SEPARATOR.$role.'.pdf', '%PDF-1.4 synthetic identity');
        $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => 'settings/'.$role.'.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 27]);
    }
}

echo 'Account settings fixtures complete'.PHP_EOL;
