<?php

namespace App\Http\Requests;

use App\Rules\UniqueAccountIdentifier;
use App\Rules\UniqueRiderPlate;
use App\Support\AccountRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateRiderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'sorting_center' && $this->user()->canOperate() && $this->user()->riderCreationCenters()->exists();
    }

    protected function prepareForValidation(): void
    {
        $data = [];
        foreach (['first_name', 'last_name', 'license_number', 'plate_number'] as $field) {
            if (is_string($this->input($field))) {
                $data[$field] = trim($this->input($field));
            }
        }
        if (is_string($this->input('email'))) {
            $data['email'] = AccountRules::email($this->input('email'));
        }
        if (is_string($this->input('phone'))) {
            $data['phone'] = AccountRules::phone($this->input('phone'));
        }
        if (isset($data['license_number'])) {
            $data['license_number'] = strtoupper($data['license_number']);
        }
        if (isset($data['plate_number'])) {
            $data['plate_number'] = strtoupper($data['plate_number']);
        }
        $this->merge($data);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['bail', 'required', ...AccountRules::name()], 'last_name' => ['bail', 'required', ...AccountRules::name()],
            'birthday' => ['required', ...AccountRules::birthday('courier')],
            'email' => ['bail', 'required', 'string', 'email', 'max:160', 'regex:/\A[^@]+@[^@]+\.[^@]+\z/', new UniqueAccountIdentifier('email')],
            'phone' => ['bail', 'required', 'string', 'regex:/\A09[0-9]{9}\z/', new UniqueAccountIdentifier('phone')],
            'license_number' => ['bail', 'required', 'string', 'regex:/\A[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}\z/', Rule::unique('rider_profiles', 'license_number')],
            'license_expires_at' => ['required', 'date_format:Y-m-d', 'after_or_equal:'.now('Asia/Manila')->format('Y-m-d')],
            'vehicle_type' => ['required', Rule::in(['motorcycle', 'car', 'van'])],
            'plate_number' => ['bail', 'required', 'string', 'max:30', new UniqueRiderPlate],
            'license' => ['required', ...AccountRules::upload()], 'vehicle_registration' => ['required', ...AccountRules::upload()],
        ];
    }

    public function messages(): array
    {
        return ['first_name.regex' => 'Use letters (including ñ), spaces, hyphens, apostrophes and periods.', 'last_name.regex' => 'Use letters (including ñ), spaces, hyphens, apostrophes and periods.',
            'birthday.before_or_equal' => 'The rider must be at least 18 years old.', 'phone.regex' => 'Enter an 11-digit mobile number beginning with 09, or its +639 equivalent.',
            'license_number.regex' => 'Use license format A00-00-000000.', 'license_expires_at.after_or_equal' => 'The license has expired. Choose today or a later expiry date.'];
    }
}
