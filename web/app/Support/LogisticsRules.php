<?php

namespace App\Support;

use App\Rules\UniqueCompanyName;
use Illuminate\Validation\Rule;

class LogisticsRules
{
    public const DOCUMENTS = ['identity', 'sec_certificate', 'bir_2303', 'business_permit'];

    public static function rules(?int $owner = null, array $existing = []): array
    {
        $sec = Rule::unique('registration_applications', 'sec_number');
        $tin = Rule::unique('registration_applications', 'tin');
        if ($owner) {
            $sec->ignore($owner, 'user_id');
            $tin->ignore($owner, 'user_id');
        }
        $rules = [
            'business_name' => ['bail', 'required', 'string', 'max:160', new UniqueCompanyName($owner)],
            'sec_number' => ['bail', 'required', 'string', 'regex:/\A[A-Z]{2}[0-9]{9}\z/', $sec],
            'tin' => ['bail', 'required', 'string', 'regex:/\A[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}\z/', $tin],
            'position' => ['required', 'string', 'max:100'], 'service_regions' => ['required', 'array', 'min:1'],
            'service_regions.*' => ['required', 'string', 'distinct', 'regex:/\A[0-9]{9}\z/'],
            'line1' => ['required', 'string', 'max:200'], 'zip' => ['required', 'regex:/\A[0-9]{4}\z/'],
        ];
        foreach (['region_code', 'province_code', 'city_code', 'barangay_code'] as $field) {
            $rules[$field] = ['required', 'regex:/\A[0-9]{9}\z/'];
        }
        foreach (self::DOCUMENTS as $kind) {
            $rules[$kind] = [in_array($kind, $existing, true) ? 'nullable' : 'required', ...AccountRules::upload()];
        }

        return $rules;
    }
}
