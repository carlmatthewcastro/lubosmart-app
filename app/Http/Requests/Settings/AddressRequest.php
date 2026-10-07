<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class AddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        $address = $this->route('address');

        return $this->user() && (! $address || $address->user_id === $this->user()->id);
    }

    public function rules(): array
    {
        return [
            'label' => 'required|string|max:40',
            'recipient_name' => 'required|string|max:160',
            'phone' => 'required|string|max:30',
            'line1' => 'required|string|max:200',
            'line2' => 'nullable|string|max:200',
            'barangay' => 'required|string|max:100',
            'city' => 'required|string|max:100',
            'province' => 'required|string|max:100',
            'region' => 'required|string|max:100',
            'zip' => 'required|string|max:10',
            'is_default' => 'sometimes|boolean',
        ];
    }
}
