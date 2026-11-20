<?php

namespace App\Http\Requests\Account;

use App\Models\ChangeRequest;
use App\Rules\UniqueCompanyName;
use App\Support\AccountRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReverificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', ChangeRequest::class);
    }

    public function rules(): array
    {
        $rules = [
            'company_name' => ['required', 'string', 'max:160', new UniqueCompanyName($this->user()->id)],
            'sec_registration_number' => ['required', 'string', 'regex:/\A[A-Z]{2}[0-9]{9}\z/', Rule::unique('registration_applications', 'sec_number')->ignore($this->user()->id, 'user_id')],
            'tin' => ['required', 'regex:/\A[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}\z/', Rule::unique('registration_applications', 'tin')->ignore($this->user()->id, 'user_id')],
        ];
        foreach (['identity', 'sec_certificate', 'bir_2303', 'business_permit'] as $kind) {
            $rules[$kind] = ['required', ...AccountRules::upload()];
        }

        return $rules;
    }
}
