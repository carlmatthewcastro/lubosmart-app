<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class UniqueCompanyName implements ValidationRule
{
    public function __construct(private ?int $owner = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $key = mb_strtolower(trim($value));
        if (DB::table('registration_applications')->where('requested_role', 'sorting_center')->when($this->owner, fn ($q) => $q->where('user_id', '!=', $this->owner))
            ->where(fn ($q) => $q->where('company_name_normalized', $key)->orWhereRaw('LOWER(TRIM(business_name)) = ?', [$key]))->exists()
            || DB::table('sorting_centers')->when($this->owner, fn ($q) => $q->where(fn ($q) => $q->whereNull('company_user_id')->orWhere('company_user_id', '!=', $this->owner))
                ->whereNotIn('id', DB::table('sorting_center_user')->join('sorting_centers as owned', 'owned.id', '=', 'sorting_center_user.sorting_center_id')->where('user_id', $this->owner)->whereNull('owned.company_user_id')->select('sorting_center_user.sorting_center_id')))->whereRaw('LOWER(TRIM(name)) = ?', [$key])->exists()) {
            $fail('This company name is already registered.');
        }
    }
}
