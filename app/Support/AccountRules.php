<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

class AccountRules
{
    public static function email(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    public static function phone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }
        $phone = trim($phone);

        return preg_match('/\A\+?639[0-9]{9}\z/', $phone) ? '0'.substr(ltrim($phone, '+'), 2) : $phone;
    }

    public static function validPhone(?string $phone): bool
    {
        return $phone !== null && preg_match('/\A09[0-9]{9}\z/', self::phone($phone)) === 1;
    }

    public static function name(int $maximum = 50, int $minimumLetters = 2): array
    {
        return ['string', 'min:'.$minimumLetters, 'max:'.$maximum, "regex:/\A(?=(?:[^\p{L}]*\p{L}){{$minimumLetters}})[\p{L}\p{M} .'-]+\z/u"];
    }

    public static function password(): array
    {
        return ['string', Password::min(8)->mixedCase()->numbers()->symbols(), 'regex:/[\p{P}\p{S}]/u'];
    }

    public static function birthday(string $role): array
    {
        return ['date_format:Y-m-d', 'after:1900-01-01', 'before_or_equal:'.now('Asia/Manila')->format('Y-m-d'),
            ...(in_array($role, ['buyer', 'courier'], true) ? ['before_or_equal:'.now('Asia/Manila')->subYearsNoOverflow(18)->format('Y-m-d')] : []),
        ];
    }

    public static function upload(): array
    {
        return ['file', 'mimes:jpg,jpeg,png,pdf', 'extensions:jpg,jpeg,png,pdf', 'max:5120'];
    }
}
