<?php

// Runs only against the disposable SQLite database supplied by the race test.
use App\Http\Requests\Auth\RegisterAccountRequest;
use App\Http\Requests\CreateRiderRequest;
use App\Models\User;
use App\Services\CreateCompanyRider;
use App\Services\RegisterAccount;
use App\Services\RiderInvitations;
use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

require $argv[1].'/vendor/autoload.php';
$app = require $argv[1].'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
config(['app.env' => 'testing', 'database.default' => 'sqlite', 'database.connections.sqlite.database' => $argv[2],
    'database.connections.sqlite.busy_timeout' => 10000, 'hashing.bcrypt.rounds' => 4, 'mail.default' => 'array', 'mail.security_mailer' => 'array']);
DB::purge('sqlite');
config(['filesystems.disks.local.root' => $argv[2].'.uploads']);
$data = ['first_name' => 'Race', 'last_name' => 'Applicant', 'email' => 'race@example.com', 'phone' => '09170000001',
    'birthday' => '1995-01-01', 'role' => 'buyer', 'password' => 'Register@2026', 'password_confirmation' => 'Register@2026', 'policy_accepted' => true];
$data = array_replace($data, ['sex' => 'female', 'region_code' => '130000000', 'province_code' => '130000000', 'city_code' => '137404000', 'barangay_code' => '137404001', 'line1' => 'Synthetic street', 'zip' => '1121']);
Http::preventStrayRequests();
Http::fake([
    'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '130000000', 'name' => 'NCR']]),
    'https://psgc.gitlab.io/api/provinces/' => Http::response([]),
    'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '137404000', 'name' => 'Quezon City', 'regionCode' => '130000000']]),
    'https://psgc.gitlab.io/api/cities-municipalities/137404000/barangays/' => Http::response([['code' => '137404001', 'name' => 'Commonwealth']]),
]);
$data['identity'] = UploadedFile::fake()->create('identity.pdf', 10, 'application/pdf');
if (in_array($argv[5] ?? 'buyer', ['seller', 'sorting_center'], true)) {
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '130000000', 'name' => 'NCR']]),
        'https://psgc.gitlab.io/api/provinces/' => Http::response([]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '137404000', 'name' => 'Quezon City', 'regionCode' => '130000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/137404000/barangays/' => Http::response([['code' => '137404001', 'name' => 'Commonwealth']]),
    ]);
    $data = array_replace($data, ['role' => 'seller', 'business_name' => 'Concurrent shop', 'business_category_id' => 1, 'seller_type' => 'sole_proprietorship', 'tin' => '123-456-789-000',
        'region_code' => '130000000', 'province_code' => '130000000', 'city_code' => '137404000', 'barangay_code' => '137404001', 'line1' => 'Synthetic street', 'zip' => '1121']);
    foreach (['identity', 'business_permit', 'dti_certificate', 'bir_2303'] as $kind) {
        $data[$kind] = UploadedFile::fake()->create($kind.'.pdf', 10, 'application/pdf');
    }
    if ($argv[5] === 'sorting_center') {
        unset($data['business_category_id']);
        $data = array_replace($data, ['role' => 'sorting_center', 'business_name' => 'Concurrent company', 'sec_number' => 'CS202012345', 'tin' => '234-567-890-000', 'position' => 'Manager', 'service_regions' => ['130000000']]);
        foreach (['sec_certificate', 'business_permit'] as $kind) {
            $data[$kind] = UploadedFile::fake()->create($kind.'.pdf', 10, 'application/pdf');
        }
    }
}
if (($argv[5] ?? 'buyer') === 'courier') {
    $data = ['first_name' => 'Pedro Jose', 'last_name' => 'Garcia', 'email' => 'race@example.com', 'phone' => '09170000001', 'birthday' => '1995-01-01', 'license_number' => 'N01-23-456789', 'license_expires_at' => '2030-03-22', 'plate_number' => '123ABC', 'vehicle_type' => 'motorcycle', 'license' => UploadedFile::fake()->create('license.pdf', 10, 'application/pdf'), 'vehicle_registration' => UploadedFile::fake()->create('orcr.pdf', 10, 'application/pdf')];
}
$request = ($argv[5] ?? 'buyer') === 'courier' ? new CreateRiderRequest : new RegisterAccountRequest;
$request->merge($data);
Validator::make($data, $request->rules())->validate();
file_put_contents($argv[4], 'ready');
$deadline = microtime(true) + 10;
while (! is_file($argv[3])) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Race barrier timed out.');
    }
    usleep(10000);
}
try {
    if (($argv[5] ?? 'buyer') === 'courier') {
        $company = User::where('email', 'race.company@example.com')->firstOrFail();
        [$rider,$delivery] = app(CreateCompanyRider::class)->create($company, $data);
        if (! app(RiderInvitations::class)->deliver($delivery)) {
            throw new RuntimeException('Invitation delivery failed');
        }
    } else {
        $user = app(RegisterAccount::class)->create($data);
        event(new Registered($user));
    }
    echo 'created';
} catch (ValidationException) {
    echo 'duplicate';
}
