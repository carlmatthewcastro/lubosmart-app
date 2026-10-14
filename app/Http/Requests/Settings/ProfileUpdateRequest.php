<?php

namespace App\Http\Requests\Settings;

use App\Rules\UniqueAccountIdentifier;
use App\Rules\UniqueCompanyName;
use App\Rules\UniqueRiderPlate;
use App\Rules\UniqueShopName;
use App\Support\AccountRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
        if (is_string($this->input('phone'))) {
            $this->merge(['phone' => AccountRules::phone($this->input('phone'))]);
        }
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isAdmin = $this->user()->role === 'admin';

        return [
            'name' => ['bail', 'required', ...AccountRules::name(160)],
            'phone' => ['bail', 'sometimes', 'nullable', 'regex:/\A09[0-9]{9}\z/', Rule::prohibitedIf($isAdmin), new UniqueAccountIdentifier('phone', $this->user()->id)],
            'current_password' => ['nullable', 'string', 'max:255'],
            'business_name' => ['sometimes', 'bail', 'required', 'string', 'max:160', Rule::prohibitedIf(! in_array($this->user()->role, ['seller', 'sorting_center'], true)), ...($this->user()->role === 'seller' ? [new UniqueShopName($this->user()->id)] : ($this->user()->role === 'sorting_center' ? [new UniqueCompanyName($this->user()->id)] : []))],
            'bank_account' => ['sometimes', 'nullable', 'string', 'max:500', Rule::prohibitedIf(! in_array($this->user()->role, ['seller', 'courier', 'sorting_center'], true))],
            'plate_number' => ['sometimes', 'bail', 'required', 'string', 'max:30', Rule::prohibitedIf($this->user()->role !== 'courier'), new UniqueRiderPlate($this->user()->id)],
            'identity' => ['nullable', ...AccountRules::upload(), Rule::prohibitedIf(! in_array($this->user()->role, ['buyer', 'seller', 'courier', 'sorting_center'], true))],

            'email' => [
                ...($isAdmin ? ['sometimes'] : []),
                'required',
                'string',
                'lowercase',
                'email',
                'max:160',
                new UniqueAccountIdentifier('email', $this->user()->id),
                Rule::when($isAdmin, [Rule::in([$this->user()->email])]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.min' => 'Use at least 2 characters for your name.',
            'name.max' => 'Use no more than 160 characters for your full name.',
            'name.regex' => 'Use at least two letters. Spaces, hyphens, apostrophes and periods are allowed.',
            'email.in' => 'The admin sign-in email cannot be changed in settings.',
            'phone.prohibited' => 'Contact numbers are not part of admin settings.',
        ];
    }
}
