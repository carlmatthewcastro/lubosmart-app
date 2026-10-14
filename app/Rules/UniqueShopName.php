<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class UniqueShopName implements ValidationRule
{
    public function __construct(private ?int $owner = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $name = mb_strtolower(trim($value));
        if (DB::table('stores')->when($this->owner, fn ($query) => $query->where('user_id', '!=', $this->owner))
            ->where(fn ($query) => $query->where('name_normalized', $name)->orWhereRaw('LOWER(TRIM(name)) = ?', [$name]))->exists()) {
            $fail('This shop name is already registered.');
        }
    }
}
