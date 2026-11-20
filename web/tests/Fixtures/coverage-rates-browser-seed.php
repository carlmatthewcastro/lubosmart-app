<?php

use Illuminate\Support\Facades\DB;

// The shared fixture enforces an isolated temporary SQLite database.
require __DIR__.'/logistics-operations-seed.php';

$areaId = DB::table('service_areas')->insertGetId([
    'logistics_center_id' => $center->id, 'code' => 'COVERAGE-BROWSER-RATE',
    'name' => 'Test Barangay, City of Santa Rosa', 'barangay_name' => 'Test Barangay',
    'city_name' => 'City of Santa Rosa', 'province_name' => 'Laguna',
    'province_code' => '043400000', 'city_code' => '043428000', 'barangay_code' => '043428001', 'is_active' => true,
]);
DB::table('shipping_rates')->insert([
    'service_area_id' => $areaId, 'base_fee_cents' => 3800, 'included_weight_grams' => 1000,
    'extra_kg_fee_cents' => 1200, 'max_weight_grams' => 20000, 'is_active' => false,
]);
