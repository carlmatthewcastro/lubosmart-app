<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\SortingCenter;
use App\Rules\UniqueAccountIdentifier;
use App\Rules\UniqueRiderPlate;
use App\Support\AccountRules;
use App\Support\LogisticsRules;
use App\Support\SellerRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SubmitApplicationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('phone'))) {
            $this->merge(['phone' => AccountRules::phone($this->input('phone'))]);
        }
        foreach (['business_name', 'tin', 'position', 'sec_number'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($this->input($field))]);
            }
        }
        if (is_string($this->input('street')) && is_string($this->input('house_number')) && $this->filled(['street', 'house_number'])) {
            $this->merge(['line1' => trim($this->input('house_number').' '.$this->input('street'))]);
        }
    }

    public function authorize(): bool
    {
        return in_array($this->user()->status, ['incomplete', 'pending', 'rejected'], true) && in_array($this->user()->role, ['buyer', 'seller', 'courier', 'sorting_center'], true);
    }

    public function rules(): array
    {
        $role = $this->user()->role;
        $application = $this->user()->application()->with('documents')->first();
        $existing = $application?->documents->sortByDesc('id')->unique('kind')->filter(fn ($document) => Storage::disk($document->disk)->exists($document->path))->pluck('kind')->all() ?? [];
        $file = fn ($kind, $required) => [$required && ! in_array($kind, $existing, true) ? 'required' : 'nullable', ...AccountRules::upload()];

        $rules = [
            'first_name' => ['required', ...AccountRules::name()],
            'last_name' => ['required', ...AccountRules::name()],
            'middle_initial' => ['bail', 'nullable', ...AccountRules::name(10, 1)],
            'sex' => ['required', Rule::in(['female', 'male', 'prefer_not_to_say'])],
            'birthday' => ['required', ...AccountRules::birthday($role)],
            'phone' => ['bail', 'required', 'string', 'regex:/\A09[0-9]{9}\z/', new UniqueAccountIdentifier('phone', $this->user()->id)],
            'province_code' => ['required', 'regex:/^\d{9}$/'],
            'city_code' => ['required', 'regex:/^\d{9}$/'],
            'barangay_code' => ['required', 'regex:/^\d{9}$/'],
            'line1' => [Rule::requiredIf(! $this->hasAny(['street', 'house_number'])), 'nullable', 'string', 'max:200'],
            'street' => [Rule::requiredIf($this->hasAny(['street', 'house_number'])), 'nullable', 'string', 'max:160'],
            'house_number' => [Rule::requiredIf($this->hasAny(['street', 'house_number'])), 'nullable', 'string', 'max:30'],
            'zip' => ['required', 'regex:/^\d{4}$/'],
            'business_name' => [Rule::requiredIf(in_array($role, ['seller', 'sorting_center'], true)), 'nullable', 'string', 'max:160'],
            'business_category_id' => [Rule::requiredIf($role === 'seller'), 'nullable', 'integer', Rule::exists(Category::class, 'id')->whereNull('parent_id')->where('is_active', true)],
            'vehicle_type' => [Rule::requiredIf($role === 'courier'), 'nullable', Rule::in(['motorcycle', 'bicycle', 'car', 'van', 'truck'])],
            'plate_number' => [Rule::requiredIf($role === 'courier'), 'nullable', 'bail', 'string', 'max:30', new UniqueRiderPlate($this->user()->id)],
            'sorting_center_id' => [Rule::requiredIf($role === 'courier'), 'nullable', 'integer', Rule::in(SortingCenter::query()->operational()->when($this->user()->logistics_company_id, fn ($centers) => $centers->where('company_user_id', $this->user()->logistics_company_id))->pluck('id')->all())],
            'identity' => $file('identity', true),
            'license' => $file('license', $role === 'courier'),
            'business_permit' => $file('business_permit', in_array($role, ['seller', 'sorting_center'], true)),
            'vehicle_registration' => $file('vehicle_registration', $role === 'courier'),
            'policy_accepted' => ['accepted'],
        ];
        if ($role === 'seller' && ($application?->registration_contract === 'buyer-seller-2026-10' || $this->filled('seller_type'))) {
            $rules = array_replace($rules, SellerRules::rules($this->input('seller_type'), $this->user()->id, $existing));
            $rules['sex'] = ['required', Rule::in(['female', 'male', 'prefer_not_to_say'])];
            $rules['birthday'] = ['required', ...AccountRules::birthday($role)];
        }
        if ($role === 'sorting_center' && ($application?->registration_contract === 'logistics-2026-10' || $this->filled('sec_number'))) {
            $rules = array_replace($rules, LogisticsRules::rules($this->user()->id, $existing));
            $rules['sex'] = ['required', Rule::in(['female', 'male', 'prefer_not_to_say'])];
            $rules['birthday'] = ['required', ...AccountRules::birthday($role)];
        }

        return $rules;
    }
}
