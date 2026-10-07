<?php

namespace App\Http\Controllers;

use App\Services\PhilippineLocations;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function __invoke(Request $request, PhilippineLocations $locations): JsonResponse
    {
        $data = $request->validate(['province' => ['nullable', 'regex:/^\d{9}$/'], 'city' => ['nullable', 'regex:/^\d{9}$/']]);
        $items = isset($data['city']) ? $locations->barangays($data['city']) : (isset($data['province']) ? $locations->cities($data['province']) : $locations->provinces());

        return response()->json(collect($items)->map(fn ($item) => ['code' => $item['code'], 'name' => $item['name']])->sortBy('name')->values());
    }
}
