<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class CreateCompanyRider
{
    public function create(User $actor, array $data): array
    {
        $stored = [];
        try {
            return DB::transaction(function () use ($actor, $data, &$stored) {
                Storage::disk('local')->delete($stored);
                $stored = [];
                // SQLite ignores row locks; acquire its write lock before reading eligibility.
                if (DB::getDriverName() === 'sqlite') {
                    DB::table('users')->where('id', $actor->id)->update(['updated_at' => DB::raw('updated_at')]);
                }
                $company = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
                abort_unless($company->role === 'sorting_center' && $company->canOperate(), 403);
                $center = $company->riderCreationCenters()->orderBy('sorting_centers.id')->lockForUpdate()->first();
                abort_unless($center, 403);
                if (! $center->company_user_id) {
                    $center->forceFill(['company_user_id' => $company->id])->save();
                }
                $rider = User::create(['name' => $data['first_name'].' '.$data['last_name'], 'email' => $data['email'], 'role' => 'courier', 'password' => null]);
                $rider->forceFill(['status' => 'unverified', 'phone' => $data['phone'], 'logistics_company_id' => $company->id, 'sorting_center_id' => $center->id])->save();
                DB::table('user_profiles')->insert(['user_id' => $rider->id, 'first_name' => $data['first_name'], 'last_name' => $data['last_name'], 'birthday' => $data['birthday'], 'created_at' => now(), 'updated_at' => now()]);
                DB::table('rider_profiles')->insert(['user_id' => $rider->id, 'license_number' => $data['license_number'], 'license_expires_at' => $data['license_expires_at'], 'plate_number' => $data['plate_number'], 'plate_normalized' => strtoupper(trim($data['plate_number'])), 'vehicle_type' => $data['vehicle_type'], 'created_at' => now(), 'updated_at' => now()]);
                $application = $rider->application()->create(['requested_role' => 'courier', 'registration_contract' => 'company-rider-2026-10', 'status' => 'approved', 'sorting_center_id' => $center->id, 'reviewer_id' => $company->id, 'submitted_at' => now()]);
                $rider->sortingCenters()->attach($center->id, ['granted_by' => $company->id]);
                foreach (['license', 'vehicle_registration'] as $kind) {
                    $file = $data[$kind];
                    $path = $file->store('registration/'.$application->id, 'local');
                    if (! $path) {
                        throw new \RuntimeException('Unable to store rider document.');
                    } $stored[] = $path;
                    $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
                }
                DB::table('audit_events')->insert(['actor_id' => $company->id, 'subject_type' => 'user', 'subject_id' => $rider->id, 'action' => 'rider_invited', 'occurred_at' => now()]);

                return [$rider, app(RiderInvitations::class)->issue($rider, $company)];
            }, 3);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($stored);
            if ($exception instanceof UniqueConstraintViolationException) {
                foreach (['email' => 'email_normalized', 'phone' => 'phone_normalized'] as $field => $column) {
                    if (User::where($column, $data[$field])->exists()) {
                        throw ValidationException::withMessages([$field => 'This '.$field.' is already registered.']);
                    }
                }
                foreach (['license_number' => 'license_number', 'plate_number' => 'plate_normalized'] as $field => $column) {
                    if (DB::table('rider_profiles')->where($column, $data[$field])->exists()) {
                        throw ValidationException::withMessages([$field => 'This '.$field.' is already registered.']);
                    }
                }
            }
            throw $exception;
        }
    }
}
