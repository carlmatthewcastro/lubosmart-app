<?php

namespace App\Services;

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\Store;
use App\Models\User;
use App\Support\AccountRules;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class RegisterAccount
{
    public function create(array $data, ?string $googleId = null): User
    {
        $data['email'] = AccountRules::email($data['email']);
        $data['phone'] = AccountRules::phone($data['phone']);
        $stored = [];
        $names = app(PhilippineLocations::class)->resolve($data['province_code'], $data['city_code'], $data['barangay_code'], $data['region_code'] ?? null);
        try {
            return DB::transaction(function () use ($data, $names, $googleId, &$stored) {
                // Remove files from a rolled-back attempt before a deadlock retry.
                Storage::disk('local')->delete($stored);
                $stored = [];
                $user = User::create([
                    'name' => $data['first_name'].' '.$data['last_name'], 'email' => $data['email'],
                    'password' => Hash::make($data['password']), 'role' => $data['role'],
                ]);
                $user->forceFill(['phone' => $data['phone'], 'status' => 'unverified'])->save();
                if ($googleId !== null) {
                    $user->forceFill(['google_id' => $googleId])->save();
                }
                DB::table('user_profiles')->insert([
                    'user_id' => $user->id, 'first_name' => $data['first_name'], 'last_name' => $data['last_name'],
                    'sex' => $data['sex'] ?? null,
                    'middle_initial' => $data['middle_initial'] ?? null,
                    'province_code' => $data['province_code'], 'city_code' => $data['city_code'], 'barangay_code' => $data['barangay_code'],
                    'birthday' => $data['birthday'] ?? null, 'created_at' => now(), 'updated_at' => now(),
                ]);
                $application = RegistrationApplication::create([
                    'user_id' => $user->id, 'requested_role' => $user->role,
                    'policy_version' => 'terms-privacy-2026-10', 'policy_accepted_at' => now(),
                    'registration_contract' => $user->role === 'courier' ? 'self-service-rider-2026-10' : (in_array($user->role, ['buyer', 'seller'], true) ? 'buyer-seller-2026-10' : null),
                ]);
                if ($data['role'] === 'buyer') {
                    $address = Address::create(['user_id' => $user->id, ...$names, 'label' => 'Registration', 'recipient_name' => $user->name, 'phone' => $user->phone,
                        'line1' => $data['line1'], 'house_number' => $data['house_number'] ?? null, 'street' => $data['street'] ?? null, 'zip' => $data['zip']]);
                    $application->forceFill(['address_id' => $address->id])->save();
                    $file = $data['identity'];
                    $path = $file->store('registration/'.$application->id, 'local');
                    if (! $path) {
                        throw new \RuntimeException('Unable to store buyer identity document.');
                    }
                    $stored[] = $path;
                    $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
                    $application->update(['status' => 'submitted', 'submitted_at' => now()]);
                }
                if ($data['role'] === 'seller') {
                    app(SellerApplicationDetails::class)->save($user, $application, $data, $names, $stored);
                }
                if ($data['role'] === 'sorting_center') {
                    app(LogisticsApplicationDetails::class)->save($user, $application, $data, $names, $stored);
                }
                if ($data['role'] === 'courier') {
                    app(RiderRegistrationDetails::class)->save($user, $application, $data, $names, $stored);
                }

                return $user;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            Storage::disk('local')->delete($stored);
            // Validation can race another insert; the database is the final authority.
            if ($googleId !== null && User::where('google_id', $googleId)->exists()) {
                throw ValidationException::withMessages(['google' => 'This Google account is already registered. Please sign in.']);
            }
            if (User::where('email_normalized', $data['email'])->exists()) {
                throw ValidationException::withMessages(['email' => 'This email is already registered.']);
            }
            if (User::where('phone_normalized', $data['phone'])->exists()) {
                throw ValidationException::withMessages(['phone' => 'This mobile number is already registered.']);
            }
            if ($data['role'] === 'courier' && DB::table('rider_profiles')->where('plate_normalized', strtoupper(trim($data['plate_number'])))->exists()) {
                throw ValidationException::withMessages(['plate_number' => 'This plate number is already registered.']);
            }
            if ($data['role'] === 'seller' && isset($data['business_name']) && Store::where('name_normalized', mb_strtolower(trim($data['business_name'])))->exists()) {
                throw ValidationException::withMessages(['business_name' => 'This shop name is already registered.']);
            }
            if (isset($data['tin']) && RegistrationApplication::where('tin', $data['tin'])->exists()) {
                throw ValidationException::withMessages(['tin' => 'This TIN is already registered.']);
            }
            if (isset($data['sec_number']) && RegistrationApplication::where('sec_number', $data['sec_number'])->exists()) {
                throw ValidationException::withMessages(['sec_number' => 'This SEC registration number is already registered.']);
            }
            if ($data['role'] === 'sorting_center' && RegistrationApplication::where('company_name_normalized', mb_strtolower(trim($data['business_name'])))->exists()) {
                throw ValidationException::withMessages(['business_name' => 'This company name is already registered.']);
            }
            throw $exception;
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($stored);
            throw $exception;
        }
    }
}
