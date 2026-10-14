<?php

use App\Services\PhilippinePostalCodes;
use Illuminate\Support\Facades\Http;

test('registration city choices include an official postal suggestion and an empty fallback', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([
            ['code' => '043428000', 'name' => 'City of Santa Rosa', 'provinceCode' => '043400000'],
            ['code' => '043499000', 'name' => 'Unknown City', 'provinceCode' => '043400000'],
        ]),
    ]);
    $this->getJson('/registration-options?province=043400000')->assertOk()
        ->assertJsonPath('0.postal_code', '4026')->assertJsonPath('1.postal_code', null);
});

test('postal suggestions normalize city names and stay scoped to the province', function () {
    $codes = app(PhilippinePostalCodes::class);
    expect($codes->forCity('Laguna', 'City of San Pablo'))->toBe('4000')
        ->and($codes->forCity('Laguna', 'Santa Rosa'))->toBe('4026')
        ->and($codes->forCity('Laguna', 'Quezon'))->toBeNull()
        ->and($codes->forCity('Metro Manila (NCR)', 'Quezon City'))->toBeNull();
});
