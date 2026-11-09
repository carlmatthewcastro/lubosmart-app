<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Auth\RegisterAccountRequest;
use Illuminate\Validation\Validator;
use Laravel\Socialite\Facades\Socialite;

class MobileRegisterRequest extends RegisterAccountRequest
{
    private ?string $providerId = null;

    public function rules(): array
    {
        $rules = parent::rules();
        $rules['google_access_token'] = ['nullable', 'string', 'max:4096'];
        if ($this->filled('google_access_token')) {
            $rules['password'] = ['prohibited'];
            $rules['password_confirmation'] = ['prohibited'];
        }

        return $rules;
    }

    public function after(): array
    {
        return [...parent::after(), function (Validator $validator) {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('google_access_token')) {
                return;
            }
            try {
                $identity = Socialite::driver('google')->userFromToken($this->input('google_access_token'));
                if (($identity->user['email_verified'] ?? $identity->user['verified_email'] ?? false) !== true
                    || mb_strtolower(trim($identity->getEmail())) !== $this->input('email')) {
                    $validator->errors()->add('google', 'Use your verified Google email address.');

                    return;
                }
                $this->providerId = $identity->getId();
            } catch (\Throwable $exception) {
                $validator->errors()->add('google', 'Google sign-in expired. Sign in with Google again.');
            }
        }];
    }

    public function providerId(): ?string
    {
        return $this->providerId;
    }
}
