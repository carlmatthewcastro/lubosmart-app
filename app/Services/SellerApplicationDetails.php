<?php

namespace App\Services;

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\User;
use App\Support\SellerRules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SellerApplicationDetails
{
    public function save(User $user, RegistrationApplication $application, array $data, array $names, array &$stored): void
    {
        $address = Address::updateOrCreate(['id' => $application->address_id, 'user_id' => $user->id], [
            ...$names, 'label' => 'Registration', 'recipient_name' => $user->name, 'phone' => $user->phone,
            'line1' => $data['line1'], 'house_number' => $data['house_number'] ?? null, 'street' => $data['street'] ?? null, 'zip' => $data['zip'],
        ]);
        DB::table('user_profiles')->updateOrInsert(['user_id' => $user->id], [
            'first_name' => $data['first_name'], 'last_name' => $data['last_name'],
            ...collect($data)->only(['birthday', 'sex', 'middle_initial'])->all(),
            'province_code' => $data['province_code'], 'city_code' => $data['city_code'], 'barangay_code' => $data['barangay_code'], 'updated_at' => now(),
        ]);
        $user->store()->updateOrCreate(['user_id' => $user->id], [
            'name' => $data['business_name'], 'business_category_id' => $data['business_category_id'], 'status' => 'pending',
        ]);
        foreach (SellerRules::documents($data['seller_type']) as $kind) {
            if ($file = $data[$kind] ?? null) {
                $path = $file->store('registration/'.$application->id, 'local');
                if (! $path) {
                    throw new \RuntimeException('Unable to store registration document.');
                }
                $stored[] = $path;
                $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
            }
        }
        $application->forceFill([
            'registration_contract' => 'buyer-seller-2026-10', 'address_id' => $address->id,
            'business_name' => $data['business_name'], 'seller_type' => $data['seller_type'], 'tin' => $data['tin'], 'region_code' => $data['region_code'],
            'status' => 'submitted', 'submitted_at' => now(), 'reviewer_id' => null, 'reviewed_at' => null, 'rejection_reason' => null,
            'policy_version' => 'registration-2026-10', 'policy_accepted_at' => now(),
        ])->save();
        $application->draftRecord()->delete();
        DB::table('audit_events')->insert(['actor_id' => $user->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id, 'action' => 'submitted', 'occurred_at' => now()]);
    }

    public function assertReviewable(RegistrationApplication $application): void
    {
        if ($application->requested_role !== 'seller' || $application->registration_contract !== 'buyer-seller-2026-10') {
            return;
        }
        $documents = $application->documents()->orderByDesc('id')->get()->unique('kind')->keyBy('kind');
        foreach (SellerRules::documents($application->seller_type ?? '') as $kind) {
            $document = $documents->get($kind);
            if (! $document || ! Storage::disk($document->disk)->exists($document->path)) {
                throw ValidationException::withMessages(['decision' => 'A required seller document is missing. Request corrections before approval.']);
            }
        }
        if (! preg_match('/\A[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}\z/', $application->tin ?? '') || ! in_array($application->seller_type, ['individual', 'sole_proprietorship', 'corporation'], true) || ! $application->address_id || ! $application->user->store) {
            throw ValidationException::withMessages(['decision' => 'Seller application details are incomplete.']);
        }
    }
}
