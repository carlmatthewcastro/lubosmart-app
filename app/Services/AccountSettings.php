<?php

namespace App\Services;

use App\Models\AccountServiceArea;
use App\Models\Address;
use App\Models\AuditLog;
use App\Models\ChangeRequest;
use App\Models\LogisticsCenter;
use App\Models\PsgcLocation;
use App\Models\RegistrationSnapshot;
use App\Models\User;
use App\Rules\UniqueCompanyName;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountSettings
{
    public function profile(User $user): array
    {
        $application = $user->application()->firstOrFail();
        $person = DB::table('user_profiles')->where('user_id', $user->id)->first();
        $address = Address::query()->find($application->address_id);

        return [
            'first_name' => $person?->first_name, 'last_name' => $person?->last_name,
            'middle_initial' => $person?->middle_initial, 'sex' => $person?->sex, 'date_of_birth' => $person?->birthday,
            'company_name' => $application->business_name, 'sec_registration_number' => $application->sec_number, 'tin' => $application->tin,
            'position' => $application->position,
            'registered_address' => $address ? [
                'region_code' => $application->region_code ?: $address->region,
                'region_name' => $this->regionName($application->region_code ?: $address->region),
                'province_code' => $person?->province_code, 'province_name' => $address->province,
                'city_code' => $person?->city_code, 'city_name' => $address->city,
                'barangay_code' => $person?->barangay_code, 'barangay_name' => $address->barangay,
                'house_number' => $address->house_number, 'street' => $address->street ?: $address->line1, 'postal_code' => $address->zip,
            ] : null,
            'service_areas' => $application->service_regions ?? [],
            'documents' => $application->documents()->latest('id')->get()->unique('kind')->map->only(['id', 'kind'])->values()->all(),
        ];
    }

    public function capture(User $user): void
    {
        // Call under the account lock, in the registration approval transaction.
        if (RegistrationSnapshot::query()->where('account_id', $user->id)->exists()) {
            return;
        }
        $profile = $this->profile($user);
        $regions = array_values(array_unique([...$profile['service_areas'], ...array_filter([$profile['registered_address']['region_code'] ?? null])]));
        $user->application()->update(['service_regions' => $regions]);
        $profile['service_areas'] = $regions;
        RegistrationSnapshot::query()->create(['account_id' => $user->id, 'payload' => $profile]);
        $this->syncRegions($user, $regions);
    }

    public function regionName(?string $code): ?string
    {
        return config('account-regions.'.$code)
            ?? PsgcLocation::query()->where('region_code', $code)->value('region_name');
    }

    public function address(array $value): array
    {
        $data = Validator::make($value, [
            'region_code' => 'required|string', 'province_code' => 'required|string', 'city_code' => 'required|string',
            'barangay_code' => 'required|string', 'postal_code' => ['required', 'regex:/\A[0-9]{4}\z/'],
            'house_number' => 'required|string|max:30', 'street' => 'required|string|max:160',
        ])->validate();
        $row = PsgcLocation::query()->where(collect($data)->only(['region_code', 'province_code', 'city_code', 'barangay_code', 'postal_code'])->all())->first();
        if (! $row) {
            throw ValidationException::withMessages(['new_value' => 'Choose a valid PSGC address and its matching postal code.']);
        }

        return [...$data, ...$row->only(['region_name', 'province_name', 'city_name', 'barangay_name'])];
    }

    public function request(User $actor, string $field, array $value): ?ChangeRequest
    {
        return DB::transaction(function () use ($actor, $field, $value) {
            $user = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            abort_unless($user->can('create', ChangeRequest::class), 403);
            $this->capture($user);
            $pending = ChangeRequest::query()->where('account_id', $user->id)->where('field', $field)->where('status', 'pending')->first();
            if ($pending && $field !== 'service_areas') {
                throw ValidationException::withMessages(['field' => 'This section already has a pending request.']);
            }
            $profile = $this->profile($user);
            $old = $field === 'reverification' ? collect($profile)->only(['company_name', 'sec_registration_number', 'tin', 'documents'])->all() : $profile[$field];
            if ($field === 'registered_address') {
                $value = $this->address($value);
            }
            if ($field === 'service_areas') {
                Validator::make(['regions' => $value], ['regions' => 'required|array|list|min:1', 'regions.*' => ['required', 'string', 'distinct', Rule::in(array_keys(config('account-regions')))]])->validate();
                $this->assertHomeRegion($profile, $value);
                $original = RegistrationSnapshot::query()->where('account_id', $user->id)->oldest('id')->firstOrFail()->payload['service_areas'];
                $immediate = array_values(array_intersect($value, array_unique([...$old, ...$original])));
                $this->syncRegions($user, $immediate);
                if ($old !== $immediate) {
                    $this->audit($user, $user, 'updated', $field, $old, $immediate);
                }
                if (! array_diff($value, $immediate)) {
                    if ($pending) {
                        $pending->update(['status' => 'rejected', 'reason' => 'Withdrawn by the account owner through a new service area selection.', 'reviewed_by' => $user->id, 'reviewed_at' => now()]);
                    }

                    return null;
                }
                $old = $immediate;
                if ($pending) {
                    $pending->update(['old_value' => $old, 'new_value' => $value, 'requested_at' => now()]);
                    $this->audit($user, $user, 'proposal_updated', $field, $old, $value);

                    return $pending;
                }
            }
            if ($field === 'reverification') {
                $user->forceFill(['status' => 'pending_reverification'])->save();
            }
            $change = ChangeRequest::query()->create(['account_id' => $user->id, 'field' => $field, 'old_value' => $old, 'new_value' => $value, 'requested_at' => now(), 'status' => 'pending']);
            // Do not copy sensitive values or document paths into generic audit entries.
            $this->audit($user, $user, 'requested', $field, $old, $value);

            return $change;
        });
    }

    public function review(ChangeRequest $request, User $actor, bool $approve, ?string $reason): void
    {
        DB::transaction(function () use ($request, $actor, $approve, $reason) {
            $user = User::query()->whereKey($request->account_id)->lockForUpdate()->firstOrFail();
            $change = ChangeRequest::query()->whereKey($request->id)->lockForUpdate()->firstOrFail();
            abort_unless(in_array($user->status, ['approved', 'pending_reverification'], true), 409, 'This account is no longer eligible for changes.');
            abort_unless($actor->fresh()->can('review', $change), 403);
            abort_unless($change->status === 'pending', 409, 'This request has already been reviewed.');
            $value = $change->new_value;
            $application = $user->application()->firstOrFail();
            if ($approve) {
                if ($change->field === 'registered_address') {
                    $value = $this->address($value);
                    Address::query()->whereKey($application->address_id)->update([
                        'region' => $value['region_code'], 'province' => $value['province_name'], 'city' => $value['city_name'], 'barangay' => $value['barangay_name'],
                        'house_number' => $value['house_number'], 'street' => $value['street'], 'line1' => trim($value['house_number'].' '.$value['street']), 'zip' => $value['postal_code'],
                    ]);
                    DB::table('user_profiles')->where('user_id', $user->id)->update(collect($value)->only(['province_code', 'city_code', 'barangay_code'])->all());
                    $application->update(['region_code' => $value['region_code']]);
                    $this->syncRegions($user, array_values(array_unique([...($application->service_regions ?? []), $value['region_code']])));
                } elseif ($change->field === 'service_areas') {
                    $this->assertHomeRegion($this->profile($user), $value);
                    $this->syncRegions($user, $value);
                } elseif ($change->field === 'reverification') {
                    Validator::make($value, [
                        'company_name' => [new UniqueCompanyName($user->id)],
                        'sec_registration_number' => [Rule::unique('registration_applications', 'sec_number')->ignore($user->id, 'user_id')],
                        'tin' => [Rule::unique('registration_applications', 'tin')->ignore($user->id, 'user_id')],
                    ])->validate();
                    foreach ($value['documents'] as $document) {
                        if ($document['disk'] !== 'local' || ! Storage::disk('local')->exists($document['path'])) {
                            throw ValidationException::withMessages(['documents' => 'A re-verification document is missing. Reject the request and ask for a new upload.']);
                        }
                    }
                    LogisticsCenter::query()->where('company_user_id', $user->id)->where('name', $application->business_name)->update(['name' => $value['company_name']]);
                    $application->update(['business_name' => $value['company_name'], 'sec_number' => $value['sec_registration_number'], 'tin' => $value['tin']]);
                    foreach ($value['documents'] as $document) {
                        $application->documents()->create($document);
                    }
                    RegistrationSnapshot::query()->create(['account_id' => $user->id, 'payload' => $this->profile($user)]);
                }
            }
            if ($change->field === 'reverification') {
                // A rejected proposal never replaces the last approved company record.
                $user->forceFill(['status' => 'approved'])->save();
            }
            $change->update(['status' => $approve ? 'approved' : 'rejected', 'reason' => $reason, 'reviewed_by' => $actor->id, 'reviewed_at' => now()]);
            $this->audit($user, $actor, $approve ? 'approved' : 'rejected', $change->field,
                $change->old_value, $value);
        });
    }

    private function assertHomeRegion(array $profile, array $regions): void
    {
        if (! in_array($profile['registered_address']['region_code'] ?? null, $regions, true)) {
            throw ValidationException::withMessages(['new_value' => 'The registered business address region must remain included.']);
        }
    }

    private function syncRegions(User $user, array $regions): void
    {
        AccountServiceArea::query()->where('account_id', $user->id)->delete();
        foreach ($regions as $region) {
            AccountServiceArea::query()->create(['account_id' => $user->id, 'region_code' => $region]);
        }
        $user->application()->update(['service_regions' => $regions, 'service_region_names' => array_map(fn ($region) => $this->regionName($region), $regions)]);
    }

    public function audit(User $user, User $actor, string $action, string $field, ?array $old, ?array $new): void
    {
        if ($field === 'reverification') {
            $sanitize = function (?array $value): ?array {
                if ($value === null) {
                    return null;
                }
                $value['tin'] = '***-***-***-'.substr(preg_replace('/\D/', '', $value['tin'] ?? ''), -3);
                $value['documents'] = collect($value['documents'] ?? [])->pluck('kind')->all();

                return $value;
            };
            $old = $sanitize($old);
            $new = $sanitize($new);
        }
        AuditLog::query()->create(['account_id' => $user->id, 'actor_id' => $actor->id, 'action' => $action, 'field' => $field, 'old_value' => $old, 'new_value' => $new]);
    }
}
