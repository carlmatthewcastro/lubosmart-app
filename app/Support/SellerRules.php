<?php

namespace App\Support;

use App\Models\Category;
use App\Rules\UniqueShopName;
use Illuminate\Validation\Rule;

class SellerRules
{
    public static function documents(string $type): array
    {
        return match ($type) {
            'sole_proprietorship' => ['identity', 'business_permit', 'dti_certificate', 'bir_2303'],
            'corporation' => ['identity', 'business_permit', 'sec_certificate', 'bir_2303'],
            default => ['identity', 'business_permit'],
        };
    }

    public static function rules(mixed $type, ?int $owner = null, array $existing = []): array
    {
        $uniqueTin = Rule::unique('registration_applications', 'tin');
        if ($owner) {
            $uniqueTin->ignore($owner, 'user_id');
        }
        $rules = [
            'business_name' => ['bail', 'required', 'string', 'min:3', 'max:30', new UniqueShopName($owner)],
            'business_category_id' => ['required', 'integer', Rule::exists(Category::class, 'id')->whereNull('parent_id')->where('is_active', true)],
            'seller_type' => ['required', Rule::in(['individual', 'sole_proprietorship', 'corporation'])],
            'tin' => ['bail', 'required', 'string', 'regex:/\A[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}\z/', $uniqueTin],
            'region_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'province_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'city_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'barangay_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'line1' => ['required', 'string', 'max:200'],
            'zip' => ['required', 'regex:/\A[0-9]{4}\z/'],
        ];
        $required = self::documents(is_string($type) ? $type : '');
        foreach (['identity', 'business_permit', 'dti_certificate', 'sec_certificate', 'bir_2303'] as $kind) {
            $rules[$kind] = [in_array($kind, $required, true) && ! in_array($kind, $existing, true) ? 'required' : 'nullable', ...AccountRules::upload()];
        }

        return $rules;
    }
}
