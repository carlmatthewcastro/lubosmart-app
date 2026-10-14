<?php

namespace App\Services;

use Illuminate\Http\Request;

class GoogleRegistration
{
    public function pending(Request $request): ?array
    {
        $identity = $request->session()->get('pending_google_registration');
        if (! is_array($identity) || ($identity['expires_at'] ?? 0) <= now()->timestamp) {
            return null;
        }

        return $identity;
    }

    public function remember(Request $request, string $id, string $email, string $name, array $raw): void
    {
        $parts = preg_split('/\s+/u', trim($name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $lastName = count($parts) > 1 ? array_pop($parts) : '';
        $request->session()->put('pending_google_registration', [
            'id' => $id, 'email' => $email,
            'first_name' => is_string($raw['given_name'] ?? null) ? trim($raw['given_name']) : implode(' ', $parts),
            'last_name' => is_string($raw['family_name'] ?? null) ? trim($raw['family_name']) : $lastName,
            'expires_at' => now()->addMinutes(30)->timestamp,
        ]);
    }
}
