<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class UniqueRiderPlate implements ValidationRule
{
    public function __construct(private ?int $owner = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (DB::table('rider_profiles')->when($this->owner, fn ($q) => $q->where('user_id', '!=', $this->owner))->where(fn ($q) => $q->where('plate_normalized', strtoupper(trim($value)))->orWhereRaw('UPPER(TRIM(plate_number)) = ?', [strtoupper(trim($value))]))->exists()) {
            $fail('This plate number is already registered.');
        }
    }
}
