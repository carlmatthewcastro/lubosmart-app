<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\PhilippineLocations;
use App\Services\PhilippinePostalCodes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function __invoke(Request $request, PhilippineLocations $locations): JsonResponse
    {
        $data = $request->validate(['region' => ['nullable', 'regex:/^\d{9}$/'], 'regions' => ['nullable', 'boolean'], 'categories' => ['nullable', 'boolean'], 'province' => ['nullable', 'regex:/^\d{9}$/'], 'city' => ['nullable', 'regex:/^\d{9}$/']]);
        if ($request->boolean('categories')) {
            return response()->json(Category::whereNull('parent_id')->where('is_active', true)->orderBy('name')->get(['id', 'name']));
        }
        $items = $request->boolean('regions') ? $locations->regions() : (isset($data['city']) ? $locations->barangays($data['city']) : (isset($data['province']) ? $locations->cities($data['province']) : $locations->provinces($data['region'] ?? null)));

        $province = isset($data['province']) && ! isset($data['city']) ? collect($locations->provinces())->firstWhere('code', $data['province']) : null;
        $postalCodes = app(PhilippinePostalCodes::class);

        return response()->json(collect($items)->map(fn ($item) => [
            'code' => $item['code'], 'name' => $item['name'],
            ...($province ? ['postal_code' => $postalCodes->forCity($province['name'], $item['name'])] : []),
        ])->sortBy('name')->values());
    }
}
