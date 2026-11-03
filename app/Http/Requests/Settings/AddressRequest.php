<?php

namespace App\Http\Requests\Settings;

use App\Models\RegistrationApplication;
use App\Services\PhilippineLocations;
use App\Support\AccountRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator;

class AddressRequest extends FormRequest
{
    private array $locationNames = [];

    protected function prepareForValidation(): void
    {
        if ($this->filled(['house_number', 'street']) && is_string($this->input('house_number')) && is_string($this->input('street'))) {
            $this->merge(['line1' => trim($this->input('house_number').' '.$this->input('street'))]);
        }
        if (is_string($this->input('phone'))) {
            $this->merge(['phone' => AccountRules::phone($this->input('phone'))]);
        }
    }

    public function authorize(): bool
    {
        $address = $this->route('address');

        return $this->user() && (! $address || ($address->user_id === $this->user()->id
            && ! RegistrationApplication::query()->where('requested_role', 'logistics')->where('address_id', $address->id)->exists()));
    }

    public function rules(): array
    {
        return [
            'label' => 'required|string|max:40',
            'recipient_name' => ['required', ...AccountRules::name(160)],
            'phone' => ['required', 'string', 'regex:/\A09[0-9]{9}\z/'],
            'line1' => 'required|string|max:200',
            'house_number' => ['required_with:street', 'nullable', 'string', 'max:30'],
            'street' => ['required_with:house_number', 'nullable', 'string', 'max:160'],
            'line2' => 'nullable|string|max:200',
            'region_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'province_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'city_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'barangay_code' => ['required', 'regex:/\A[0-9]{9}\z/'],
            'zip' => ['required', 'regex:/\A[0-9]{4}\z/'],
            'is_default' => 'sometimes|boolean',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            try {
                $this->locationNames = app(PhilippineLocations::class)->resolve($this->input('province_code'), $this->input('city_code'), $this->input('barangay_code'), $this->input('region_code'));
            } catch (ValidationException $exception) {
                foreach ($exception->errors() as $field => $messages) {
                    $validator->errors()->add($field, $messages[0]);
                }
            }
        }];
    }

    public function addressData(): array
    {
        return [...$this->safe()->except(['region_code', 'province_code', 'city_code', 'barangay_code']), ...$this->locationNames];
    }
}
