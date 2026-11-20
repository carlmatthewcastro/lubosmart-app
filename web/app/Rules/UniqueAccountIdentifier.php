<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class UniqueAccountIdentifier implements ValidationRule
{
    public function __construct(private string $column, private ?int $ignore = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $query = DB::table('users')->where($this->column.'_normalized', $value);
        if ($this->column === 'email') {
            $query->orWhereRaw('LOWER(TRIM(email)) = ?', [$value]);
        } else {
            $international = '+63'.substr((string) $value, 1);
            $query->orWhereIn('phone', [$value, $international]);
        }
        $exists = DB::table('users')->whereIn('id', $query->select('id'))
            ->when($this->ignore, fn ($users) => $users->where('id', '!=', $this->ignore))->exists();
        if ($exists) {
            $fail($this->column === 'email' ? 'This email is already registered.' : 'This mobile number is already registered.');
        }
    }
}
