<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdmin extends Command
{
    protected $signature = 'lubosmart:create-admin';

    protected $description = 'Create a verified administrator using interactive credentials';

    public function handle(): int
    {
        $data = ['name' => $this->ask('Full name'), 'email' => strtolower(trim((string) $this->ask('Email address'))), 'password' => $this->secret('Password (at least 12 characters)'), 'password_confirmation' => $this->secret('Confirm password')];
        $validator = Validator::make($data, ['name' => ['required', 'string', 'max:160'], 'email' => ['required', 'email', 'max:160', 'unique:users,email'], 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }
        $user = User::query()->create(['name' => $data['name'], 'email' => $data['email'], 'role' => 'admin', 'password' => Hash::make($data['password'])]);
        $user->forceFill(['status' => 'active', 'email_verified_at' => now()])->save();
        $this->info('Administrator created. Sign in with the credentials you entered.');

        return self::SUCCESS;
    }
}
