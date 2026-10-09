<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CreateAdmin extends Command
{
    protected $signature = 'lubosmart:create-admin {--replace-local : Update the sole existing local administrator instead of creating another account}';

    protected $description = 'Create a verified administrator using interactive credentials';

    public function handle(): int
    {
        $existing = null;
        if ($this->option('replace-local')) {
            if (! app()->environment('local', 'testing')) {
                $this->error('Replacing an administrator is only available in local and testing environments.');

                return self::FAILURE;
            }
            $admins = User::query()->where('role', 'admin')->get();
            if ($admins->count() !== 1) {
                $this->error('Expected exactly one local administrator. No accounts were changed.');

                return self::FAILURE;
            }
            $existing = $admins->first();
            $this->info('Enter the name, email and password you use on the live site. This updates only the existing local administrator.');
        }
        $data = ['name' => $this->ask('Full name'), 'email' => strtolower(trim((string) $this->ask('Email address'))), 'password' => $this->secret('Password (at least 12 characters)'), 'password_confirmation' => $this->secret('Confirm password')];
        $validator = Validator::make($data, ['name' => ['required', 'string', 'max:160'], 'email' => ['required', 'email', 'max:160', Rule::unique('users', 'email')->ignore($existing?->id)], 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }
        if ($existing) {
            DB::transaction(function () use ($existing, $data) {
                $user = User::query()->whereKey($existing->id)->where('role', 'admin')->lockForUpdate()->firstOrFail();
                $user->forceFill(['name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make($data['password']), 'google_id' => null, 'status' => 'approved', 'email_verified_at' => now(), 'remember_token' => Str::random(60)])->save();
                DB::table('sessions')->where('user_id', $user->id)->delete();
                DB::table('email_security_codes')->where('user_id', $user->id)->delete();
                DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
                DB::table('password_reset_tokens')->whereIn('email', [$existing->email, $data['email']])->delete();
            });
            Storage::disk('local')->delete(['test-account-passwords.json', 'local-test-accounts.md']);
            $this->info('Local administrator updated. Sign in with the credentials you entered. The live site was not changed.');

            return self::SUCCESS;
        }
        $user = User::query()->create(['name' => $data['name'], 'email' => $data['email'], 'role' => 'admin', 'password' => Hash::make($data['password'])]);
        $user->forceFill(['status' => 'approved', 'email_verified_at' => now()])->save();
        $this->info('Administrator created. Sign in with the credentials you entered.');

        return self::SUCCESS;
    }
}
