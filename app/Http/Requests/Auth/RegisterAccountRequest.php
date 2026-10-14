<?php

namespace App\Http\Requests\Auth;

use App\Models\Category;
use App\Rules\UniqueAccountIdentifier;
use App\Services\GoogleRegistration;
use App\Services\LogisticsApplicationDetails;
use App\Services\PhilippineLocations;
use App\Support\AccountRules;
use App\Support\LogisticsRules;
use App\Support\RiderRegistrationRules;
use App\Support\SellerRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

class RegisterAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() === null;
    }

    protected function prepareForValidation(): void
    {
        $data = [];
        foreach (['first_name', 'last_name', 'business_name', 'tin', 'position', 'sec_number'] as $field) {
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
        $this->merge($data);
        if ($this->filled(['street', 'house_number'])) {
            $this->merge(['line1' => trim($this->input('house_number').' '.$this->input('street'))]);
        }
        if (is_string($this->input('sec_number'))) {
            $this->merge(['sec_number' => strtoupper($this->input('sec_number'))]);
        }
    }

    public function rules(): array
    {
        $rules = [
            'first_name' => ['bail', 'required', ...AccountRules::name()],
            'last_name' => ['bail', 'required', ...AccountRules::name()],
            'middle_initial' => ['bail', 'nullable', ...AccountRules::name(10, 1)],
            'sex' => ['required', Rule::in(['female', 'male', 'prefer_not_to_say'])],
            'email' => ['bail', 'required', 'string', 'email', 'max:160', 'regex:/\A[^@]+@[^@]+\.[^@]+\z/', new UniqueAccountIdentifier('email')],
            'phone' => ['bail', 'required', 'string', 'regex:/\A09[0-9]{9}\z/', new UniqueAccountIdentifier('phone')],
            'birthday' => ['bail', 'required', ...AccountRules::birthday(is_string($this->input('role')) ? $this->input('role') : '')],
            'house_number' => ['required_with:street', 'nullable', 'string', 'max:30'],
            'street' => ['required_with:house_number', 'nullable', 'string', 'max:160'],
            'role' => ['required', Rule::in(['buyer', 'seller', 'courier', 'sorting_center'])],
            'store_name' => ['nullable', 'string', 'max:160'],
            'business_category_id' => ['nullable', 'integer', Rule::exists(Category::class, 'id')->whereNull('parent_id')->where('is_active', true)],
            'password' => ['required', 'confirmed', ...AccountRules::password()],
            'policy_accepted' => ['required', 'accepted'],
        ];
        if ($this->input('role') === 'buyer') {
            $rules['identity'] = ['required', ...AccountRules::upload()];
            foreach (['region_code', 'province_code', 'city_code', 'barangay_code'] as $field) {
                $rules[$field] = ['required', 'regex:/\A[0-9]{9}\z/'];
            }
            $rules['line1'] = ['required', 'string', 'max:200'];
            $rules['zip'] = ['required', 'regex:/\A[0-9]{4}\z/'];
        }
        if ($this->input('role') === 'seller') {
            $rules = array_replace($rules, SellerRules::rules($this->input('seller_type')));
        }
        if ($this->input('role') === 'sorting_center') {
            $rules = array_replace($rules, LogisticsRules::rules());
        }
        if ($this->input('role') === 'courier') {
            $rules = array_replace($rules, RiderRegistrationRules::rules());
        }

        return $rules;
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->session()->has('pending_google_registration')) {
                $identity = app(GoogleRegistration::class)->pending($this);
                if (! $identity) {
                    $validator->errors()->add('google', 'Google sign-in expired. Please sign in with Google again.');
                } elseif ($this->input('email') !== $identity['email']) {
                    $validator->errors()->add('email', 'Use the email address from your Google account.');
                }
            }
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            try {
                app(PhilippineLocations::class)->resolve($this->input('province_code'), $this->input('city_code'), $this->input('barangay_code'), $this->input('region_code'));
                if ($this->input('role') === 'sorting_center') {
                    app(LogisticsApplicationDetails::class)->validateRegions($this->input('service_regions'));
                }
            } catch (ValidationException $exception) {
                foreach ($exception->errors() as $field => $messages) {
                    $validator->errors()->add($field, $messages[0]);
                }
            }
        }];
    }

    public function messages(): array
    {
        return ['first_name.regex' => 'Use at least two letters (including ñ). Spaces, hyphens, apostrophes and periods are allowed.', 'last_name.regex' => 'Use at least two letters (including ñ). Spaces, hyphens, apostrophes and periods are allowed.',
            'phone.regex' => 'Enter a Philippine mobile number in 639XXXXXXXXX format.', 'sec_number.regex' => 'Enter 2 letters followed by 9 digits, for example CS202012345.',
            'tin.regex' => 'Use TIN format 000-000-000-000 (12 digits).', 'zip.regex' => 'Enter a 4-digit postal code.'];
    }
}
