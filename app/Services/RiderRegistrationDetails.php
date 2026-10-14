<?php

namespace App\Services;

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\SortingCenter;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RiderRegistrationDetails
{
    public function save(User $user, RegistrationApplication $application, array $data, array $names, array &$stored): void
    {
        $center = SortingCenter::query()->operational()->whereKey($data['sorting_center_id'])->lockForUpdate()->first();
        if (! $center) {
            throw ValidationException::withMessages(['sorting_center_id' => 'Choose an approved and active Logistics center.']);
        }
        $user->forceFill(['sorting_center_id' => $center->id, 'logistics_company_id' => $center->company_user_id])->save();
        DB::table('user_profiles')->where('user_id', $user->id)->update([
            ...collect($data)->only(['middle_initial', 'sex', 'province_code', 'city_code', 'barangay_code'])->all(), 'updated_at' => now(),
        ]);
        $address = Address::create([
            ...$names, 'user_id' => $user->id, 'label' => 'Registration', 'recipient_name' => $user->name,
            'phone' => $user->phone, 'line1' => $data['line1'], 'house_number' => $data['house_number'] ?? null, 'street' => $data['street'] ?? null, 'zip' => $data['zip'],
        ]);
        DB::table('rider_profiles')->insert([
            'user_id' => $user->id, 'vehicle_type' => $data['vehicle_type'], 'plate_number' => trim($data['plate_number']),
            'plate_normalized' => strtoupper(trim($data['plate_number'])), 'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach (['identity', 'license', 'vehicle_registration'] as $kind) {
            $file = $data[$kind];
            $path = $file->store('registration/'.$application->id, 'local');
            if (! $path) {
                throw new \RuntimeException('Unable to store rider registration document.');
            }
            $stored[] = $path;
            $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
        }
        $application->forceFill(['address_id' => $address->id, 'sorting_center_id' => $center->id, 'status' => 'submitted', 'submitted_at' => now()])->save();
        DB::table('audit_events')->insert(['actor_id' => $user->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id, 'action' => 'submitted', 'occurred_at' => now()]);
    }
}
