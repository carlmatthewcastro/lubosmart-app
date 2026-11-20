<?php

namespace App\Http\Requests\Account;

use App\Models\ChangeRequest;
use App\Rules\UniqueAccountIdentifier;
use App\Support\AccountRules;
use Illuminate\Foundation\Http\FormRequest;

class ProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', ChangeRequest::class)
            && ! array_diff(array_keys($this->all()), ['email', 'contact_number', 'password', 'password_confirmation', 'current_password', 'otp_token', 'notification_preferences']);
    }

    public function rules(): array
    {
        return [
            'email' => ['sometimes', 'required', 'email', 'max:160', new UniqueAccountIdentifier('email', $this->user()->id)],
            'contact_number' => ['sometimes', 'required', 'regex:/\A09[0-9]{9}\z/', new UniqueAccountIdentifier('phone', $this->user()->id)],
            'password' => ['sometimes', 'required', 'confirmed', ...AccountRules::password()],
            'current_password' => ['required_with:password', 'current_password'],
            'otp_token' => ['nullable', 'string', 'max:128'],
            'notification_preferences' => ['sometimes', 'array:email,sms'],
            'notification_preferences.email' => ['sometimes', 'boolean'],
            'notification_preferences.sms' => ['sometimes', 'boolean'],
        ];
    }
}
