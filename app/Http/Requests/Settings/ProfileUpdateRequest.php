<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
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
            'name' => ['required', 'string', 'max:160'],
            'phone' => ['sometimes', 'nullable', 'regex:/^(09\d{9}|\+639\d{9})$/', Rule::prohibitedIf($isAdmin)],
            'current_password' => ['nullable', 'string', 'max:255'],
            'business_name' => ['sometimes', 'required', 'string', 'max:160', Rule::prohibitedIf(! in_array($this->user()->role, ['seller', 'sorting_center'], true))],
            'bank_account' => ['sometimes', 'nullable', 'string', 'max:500', Rule::prohibitedIf(! in_array($this->user()->role, ['seller', 'courier', 'sorting_center'], true))],
            'plate_number' => ['sometimes', 'required', 'string', 'max:30', Rule::prohibitedIf($this->user()->role !== 'courier')],
            'identity' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120', Rule::prohibitedIf(! in_array($this->user()->role, ['buyer', 'seller', 'courier', 'sorting_center'], true))],

            'email' => [
                ...($isAdmin ? ['sometimes'] : []),
                'required',
                'string',
                'lowercase',
                'email',
                'max:160',
                Rule::unique(User::class)->ignore($this->user()->id),
                Rule::when($isAdmin, [Rule::in([$this->user()->email])]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.in' => 'The admin sign-in email cannot be changed in settings.',
            'phone.prohibited' => 'Contact numbers are not part of admin settings.',
        ];
    }
}
