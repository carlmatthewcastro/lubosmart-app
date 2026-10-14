<?php

use App\Models\Category;
use App\Models\SortingCenter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function linkRiderToApprovedCenter(User $rider): SortingCenter
{
    $operator = User::factory()->create(['role' => 'sorting_center']);
    $center = SortingCenter::query()->create(['code' => 'TEST-'.$rider->id, 'name' => 'Test center', 'address' => 'Synthetic address']);
    $operator->sortingCenters()->attach($center->id, ['granted_by' => $operator->id]);
    $rider->sortingCenters()->attach($center->id, ['granted_by' => $operator->id]);
    $rider->forceFill(['sorting_center_id' => $center->id])->save();

    return $center;
}

function sharedRegistrationData(array $changes = []): array
{
    if (($changes['role'] ?? 'buyer') === 'buyer') {
        Http::preventStrayRequests();
        Http::fake([
            'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '040000000', 'name' => 'CALABARZON']]),
            'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna', 'regionCode' => '040000000']]),
            'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
            'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
        ]);
    }

    return array_replace([
        'first_name' => 'Test', 'last_name' => 'User', 'email' => 'shared@example.com',
        'phone' => '09170000001', 'birthday' => '1995-01-01', 'role' => 'buyer',
        'sex' => 'female',
        ...(($changes['role'] ?? 'buyer') === 'buyer' ? ['region_code' => '040000000', 'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => '14 Synthetic Street', 'zip' => '4000'] : []),
        'password' => 'Register@2026', 'password_confirmation' => 'Register@2026', 'policy_accepted' => true,
        ...(($changes['role'] ?? 'buyer') === 'buyer' ? ['identity' => UploadedFile::fake()->create('identity.pdf', 10, 'application/pdf')] : []),
    ], $changes);
}

function riderRegistrationData(array $changes = []): array
{
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043404000', 'name' => 'Test City', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043404000/barangays/' => Http::response([['code' => '043404001', 'name' => 'Test Barangay']]),
    ]);
    if (! isset($changes['sorting_center_id'])) {
        $company = User::factory()->create(['role' => 'sorting_center']);
        $center = SortingCenter::create(['code' => 'SIGNUP-'.$company->id, 'name' => 'Test company', 'address' => 'Synthetic address']);
        $center->forceFill(['company_user_id' => $company->id])->save();
        $company->sortingCenters()->attach($center->id, ['granted_by' => $company->id]);
    }

    return sharedRegistrationData(array_replace([
        'role' => 'courier', 'sex' => 'female', 'sorting_center_id' => $changes['sorting_center_id'] ?? $center->id,
        'province_code' => '043400000', 'city_code' => '043404000', 'barangay_code' => '043404001', 'line1' => 'Synthetic street', 'zip' => '4000',
        'vehicle_type' => 'motorcycle', 'plate_number' => 'SELF123',
        'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'),
        'license' => UploadedFile::fake()->create('license.pdf', 10, 'application/pdf'),
        'vehicle_registration' => UploadedFile::fake()->create('or-cr.pdf', 10, 'application/pdf'),
    ], $changes));
}

function sellerRegistrationData(array $changes = []): array
{
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '130000000', 'name' => 'NCR'], ['code' => '070000000', 'name' => 'Central Visayas']]),
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '072200000', 'name' => 'Cebu', 'regionCode' => '070000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '137404000', 'name' => 'Quezon City', 'regionCode' => '130000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/137404000/barangays/' => Http::response([['code' => '137404001', 'name' => 'Commonwealth']]),
    ]);
    $category = Category::firstOrCreate(['slug' => 'home-living'], ['name' => 'Home & Living']);

    return sharedRegistrationData(array_replace([
        'role' => 'seller', 'business_name' => 'Maria Clara Handicrafts', 'business_category_id' => $category->id,
        'seller_type' => 'sole_proprietorship', 'tin' => '123-456-789-000',
        'region_code' => '130000000', 'province_code' => '130000000', 'city_code' => '137404000', 'barangay_code' => '137404001',
        'line1' => 'Blk 12 Lot 8 Sampaguita St.', 'zip' => '1121',
        'business_permit' => UploadedFile::fake()->create('business-permit.pdf', 10, 'application/pdf'),
        'identity' => UploadedFile::fake()->create('id.pdf', 10, 'application/pdf'),
        'dti_certificate' => UploadedFile::fake()->create('dti.pdf', 10, 'application/pdf'),
        'bir_2303' => UploadedFile::fake()->create('bir.pdf', 10, 'application/pdf'),
    ], $changes));
}

function logisticsRegistrationData(array $changes = []): array
{
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '130000000', 'name' => 'NCR'], ['code' => '030000000', 'name' => 'Central Luzon'], ['code' => '040000000', 'name' => 'CALABARZON'], ['code' => '070000000', 'name' => 'Central Visayas']]),
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '072200000', 'name' => 'Cebu', 'regionCode' => '070000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '137403000', 'name' => 'Pasig City', 'regionCode' => '130000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/137403000/barangays/' => Http::response([['code' => '137403016', 'name' => 'Kapitolyo']]),
    ]);
    $data = sharedRegistrationData(['role' => 'sorting_center', 'first_name' => 'Carlos Antonio', 'last_name' => 'Mendoza', 'email' => 'operations@bilishatid.example.com', 'phone' => '09285551234', 'birthday' => '1990-01-01',
        'password' => 'Hatid@2026', 'password_confirmation' => 'Hatid@2026', 'business_name' => 'Bilis Hatid Express Inc.', 'sec_number' => 'CS202012345', 'tin' => '234-567-890-000', 'position' => 'Operations Manager',
        'region_code' => '130000000', 'province_code' => '130000000', 'city_code' => '137403000', 'barangay_code' => '137403016', 'line1' => 'Unit 5B, 88 West Capitol Drive', 'zip' => '1603', 'service_regions' => ['130000000', '040000000']]);
    foreach (['identity', 'sec_certificate', 'bir_2303', 'business_permit'] as $kind) {
        $data[$kind] = UploadedFile::fake()->create($kind.'.pdf', 10, 'application/pdf');
    }

    return array_replace($data, $changes);
}

function companyRiderData(array $changes = []): array
{
    return array_replace(['first_name' => 'Pedro Jose', 'last_name' => 'Garcia', 'birthday' => '1995-03-22', 'email' => 'pedrojose.garcia@example.com', 'phone' => '09451239876', 'license_number' => 'N01-23-456789', 'license_expires_at' => '2030-03-22', 'vehicle_type' => 'motorcycle', 'plate_number' => '123ABC',
        'license' => UploadedFile::fake()->create('drivers_license.pdf', 700, 'application/pdf'), 'vehicle_registration' => UploadedFile::fake()->create('or_cr.pdf', 900, 'application/pdf')], $changes);
}

function logisticsSecondRegistrationData(): array
{
    $data = logisticsRegistrationData(['first_name' => 'Liza Mae', 'last_name' => 'Fernandez', 'business_name' => 'Agila Cargo Movers Corp.', 'sec_number' => 'CS201998765', 'tin' => '567-890-123-000', 'position' => 'General Manager', 'email' => 'admin@agilacargo.example.com', 'phone' => '09396667890', 'password' => 'Agila#Cargo26', 'password_confirmation' => 'Agila#Cargo26', 'region_code' => '110000000', 'province_code' => '112400000', 'city_code' => '112402000', 'barangay_code' => '112402001', 'line1' => 'Door 3, 210 Sampaguita St.', 'zip' => '8000', 'service_regions' => ['110000000']]);
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake(['https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '110000000', 'name' => 'Davao Region']]), 'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '112400000', 'name' => 'Davao del Sur', 'regionCode' => '110000000']]), 'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '112402000', 'name' => 'Davao City', 'provinceCode' => '112400000', 'regionCode' => '110000000']]), 'https://psgc.gitlab.io/api/cities-municipalities/112402000/barangays/' => Http::response([['code' => '112402001', 'name' => 'Buhangin']])]);

    return $data;
}
