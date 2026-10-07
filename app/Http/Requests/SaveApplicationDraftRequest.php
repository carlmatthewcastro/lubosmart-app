<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\RequiredIf;

class SaveApplicationDraftRequest extends SubmitApplicationRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        unset($rules['policy_accepted']);
        $rules['current_step'] = ['nullable', Rule::in(['personal', 'role', 'address', 'documents', 'review'])];
        foreach ($rules as $field => $fieldRules) {
            // Partial drafts use the same constraints as final submission, without mandatory fields.
            $rules[$field] = ['nullable', ...array_filter($fieldRules, fn ($rule) => $rule !== 'required' && $rule !== 'nullable' && ! $rule instanceof RequiredIf)];
        }

        return $rules;
    }
}
