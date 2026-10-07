<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\SortingCenter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->status === 'pending' && in_array($this->user()->role, ['buyer', 'seller', 'rider', 'logistics'], true);
    }

    public function rules(): array
    {
        $role = $this->user()->role;
        $application = $this->user()->application()->with('documents')->first();
        $existing = $application?->documents->pluck('kind')->all() ?? [];
        $file = fn ($kind, $required) => [$required && ! in_array($kind, $existing, true) ? 'required' : 'nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'];

        return [
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'middle_initial' => ['nullable', 'string', 'max:10'],
            'sex' => ['required', Rule::in(['female', 'male', 'prefer_not_to_say'])],
            'birthday' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', 'after:1900-01-01'],
            'phone' => ['required', 'regex:/^(09\d{9}|\+639\d{9})$/'],
            'province_code' => ['required', 'regex:/^\d{9}$/'],
            'city_code' => ['required', 'regex:/^\d{9}$/'],
            'barangay_code' => ['required', 'regex:/^\d{9}$/'],
            'line1' => ['required', 'string', 'max:200'],
            'zip' => ['required', 'regex:/^\d{4}$/'],
            'business_name' => [Rule::requiredIf(in_array($role, ['seller', 'logistics'], true)), 'nullable', 'string', 'max:160'],
            'business_category_id' => [Rule::requiredIf($role === 'seller'), 'nullable', 'integer', Rule::exists(Category::class, 'id')->whereNull('parent_id')->where('is_active', true)],
            'vehicle_type' => [Rule::requiredIf($role === 'rider'), 'nullable', Rule::in(['motorcycle', 'bicycle', 'car', 'van', 'truck'])],
            'plate_number' => [Rule::requiredIf($role === 'rider' && $this->input('vehicle_type') !== 'bicycle'), 'nullable', 'string', 'max:30'],
            'sorting_center_id' => [Rule::requiredIf($role === 'rider'), 'nullable', 'integer', Rule::exists(SortingCenter::class, 'id')->where('is_active', true)],
            'identity' => $file('identity', true),
            'business_permit' => $file('business_permit', in_array($role, ['seller', 'logistics'], true)),
            'vehicle_registration' => $file('vehicle_registration', $role === 'rider' && $this->input('vehicle_type') !== 'bicycle'),
            'policy_accepted' => ['accepted'],
        ];
    }
}
