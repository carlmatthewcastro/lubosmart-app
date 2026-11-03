<?php

namespace App\Http\Requests\Account;

use App\Models\ChangeRequest;
use Illuminate\Foundation\Http\FormRequest;

class ChangeRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', ChangeRequest::class);
    }

    public function rules(): array
    {
        return [
            'field' => ['required', 'in:registered_address,service_areas'],
            'new_value' => ['required', 'array'],
            'new_value.*' => ['required_if:field,service_areas'],
        ];
    }
}
