<?php

namespace App\Support;

use App\Models\SortingCenter;
use App\Rules\UniqueRiderPlate;
use Illuminate\Validation\Rule;

class RiderRegistrationRules
{
    public static function rules(): array
    {
        return [
            'middle_initial' => ['bail', 'nullable', ...AccountRules::name(10, 1)],
            'sex' => ['required', Rule::in(['female', 'male', 'prefer_not_to_say'])],
            'province_code' => ['required', 'regex:/^\d{9}$/'],
            'city_code' => ['required', 'regex:/^\d{9}$/'],
            'barangay_code' => ['required', 'regex:/^\d{9}$/'],
            'line1' => ['required', 'string', 'max:200'],
            'zip' => ['required', 'regex:/^\d{4}$/'],
            'vehicle_type' => ['required', Rule::in(['motorcycle', 'bicycle', 'car', 'van', 'truck'])],
            'plate_number' => ['bail', 'required', 'string', 'max:30', new UniqueRiderPlate],
            'sorting_center_id' => ['required', 'integer', Rule::in(SortingCenter::query()->operational()->pluck('id')->all())],
            'identity' => ['required', ...AccountRules::upload()],
            'license' => ['required', ...AccountRules::upload()],
            'vehicle_registration' => ['required', ...AccountRules::upload()],
        ];
    }
}
