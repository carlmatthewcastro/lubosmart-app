<?php

namespace App\Services;

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\User;
use App\Support\LogisticsRules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class LogisticsApplicationDetails
{
    public function validateRegions(array $regions): void
    {
        if (array_diff($regions, collect(app(PhilippineLocations::class)->regions())->pluck('code')->all())) {
            throw ValidationException::withMessages(['service_regions' => 'Choose valid Philippine service regions.']);
        }
    }

    public function save(User $user, RegistrationApplication $application, array $data, array $names, array &$stored): void
    {
        $this->validateRegions($data['service_regions']);
        $regionNames = collect(app(PhilippineLocations::class)->regions())->whereIn('code', $data['service_regions'])->pluck('name')->values()->all();
        $address = Address::updateOrCreate(['id' => $application->address_id, 'user_id' => $user->id], [...$names, 'label' => 'Registration', 'recipient_name' => $user->name, 'phone' => $user->phone, 'line1' => $data['line1'], 'house_number' => $data['house_number'] ?? null, 'street' => $data['street'] ?? null, 'zip' => $data['zip']]);
        DB::table('user_profiles')->updateOrInsert(['user_id' => $user->id], ['first_name' => $data['first_name'], 'last_name' => $data['last_name'],
            ...collect($data)->only(['birthday', 'sex', 'middle_initial'])->all(),
            'province_code' => $data['province_code'], 'city_code' => $data['city_code'], 'barangay_code' => $data['barangay_code'], 'updated_at' => now()]);
        foreach (LogisticsRules::DOCUMENTS as $kind) {
            if ($file = $data[$kind] ?? null) {
                $path = $file->store('registration/'.$application->id, 'local');
                if (! $path) {
                    throw new \RuntimeException('Unable to store registration document.');
                } $stored[] = $path;
                $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
            }
        }
        $application->forceFill(['registration_contract' => 'logistics-2026-10', 'address_id' => $address->id, 'business_name' => $data['business_name'], 'company_name_normalized' => mb_strtolower(trim($data['business_name'])),
            'sec_number' => $data['sec_number'], 'tin' => $data['tin'], 'position' => $data['position'], 'service_regions' => $data['service_regions'], 'service_region_names' => $regionNames, 'region_code' => $data['region_code'], 'status' => 'submitted', 'submitted_at' => now(), 'reviewed_at' => null, 'reviewer_id' => null, 'rejection_reason' => null, 'policy_version' => 'registration-2026-10', 'policy_accepted_at' => now()])->save();
        $application->draftRecord()->delete();
        DB::table('audit_events')->insert(['actor_id' => $user->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id, 'action' => 'submitted', 'occurred_at' => now()]);
    }

    public function assertReviewable(RegistrationApplication $application): void
    {
        if ($application->registration_contract !== 'logistics-2026-10') {
            return;
        }
        $current = $application->documents()->latest('id')->get()->unique('kind')->keyBy('kind');
        foreach (LogisticsRules::DOCUMENTS as $kind) {
            $doc = $current->get($kind);
            if (! $doc || ! Storage::disk($doc->disk)->exists($doc->path)) {
                throw ValidationException::withMessages(['decision' => 'A required company document is missing.']);
            }
        }
        if (! $application->address_id || ! $application->sec_number || ! $application->tin || ! $application->position || ! $application->service_regions) {
            throw ValidationException::withMessages(['decision' => 'Company registration details are incomplete.']);
        }
    }
}
