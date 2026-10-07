<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveApplicationDraftRequest;
use App\Http\Requests\SubmitApplicationRequest;
use App\Models\Address;
use App\Models\Category;
use App\Models\RegistrationApplication;
use App\Models\SortingCenter;
use App\Services\PhilippineLocations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if ($user->status === 'active') {
            return to_route('dashboard');
        }
        $application = $user->application()->firstOrCreate(['user_id' => $user->id], ['requested_role' => $user->role]);
        $profile = DB::table('user_profiles')->where('user_id', $user->id)->first();

        return Inertia::render('application', [
            'application' => $application->only(['id', 'status', 'rejection_reason', 'business_name', 'sorting_center_id', 'draft_data', 'draft_saved_at', 'submitted_at', 'reviewed_at']),
            'profile' => $profile,
            'address' => Address::query()->find($application->address_id),
            'store' => $user->store,
            'rider' => DB::table('rider_profiles')->where('user_id', $user->id)->first(),
            'documents' => $application->documents->map(fn ($document) => ['id' => $document->id, 'kind' => $document->kind]),
            'categories' => Category::query()->whereNull('parent_id')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'centers' => SortingCenter::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function draft(SaveApplicationDraftRequest $request): RedirectResponse
    {
        $stored = [];
        try {
            DB::transaction(function () use ($request, &$stored) {
                $user = $request->user()->newQuery()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                abort_unless($user->status === 'pending', 403);
                $application = $user->application()->lockForUpdate()->firstOrFail();
                if (! in_array($application->status, ['draft', 'rejected'], true)) {
                    throw ValidationException::withMessages(['application' => 'Submitted applications cannot be edited while under review.']);
                }
                $data = $request->safe()->except(['identity', 'business_permit', 'vehicle_registration']);
                $application->forceFill(['draft_data' => array_replace($application->draft_data ?? [], $data), 'draft_saved_at' => now()])->save();
                $this->storeDocuments($request, $application, $stored);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($stored);
            throw $exception;
        }

        return to_route('application.edit')->with('status', 'Draft saved. You can return later to finish your application.');
    }

    public function store(SubmitApplicationRequest $request, PhilippineLocations $locations): RedirectResponse
    {
        $data = $request->validated();
        $addressNames = $locations->resolve($data['province_code'], $data['city_code'], $data['barangay_code']);
        $stored = [];
        try {
            DB::transaction(function () use ($request, $data, $addressNames, &$stored) {
                $user = $request->user()->newQuery()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                abort_unless($user->status === 'pending', 403);
                $application = $user->application()->lockForUpdate()->firstOrFail();
                if (! in_array($application->status, ['draft', 'rejected'], true)) {
                    throw ValidationException::withMessages(['application' => 'Your application is already being reviewed.']);
                }
                $user->forceFill(['name' => Str::substr(trim($data['first_name'].' '.($data['middle_initial'] ?? '').' '.$data['last_name']), 0, 160), 'phone' => $data['phone']])->save();
                DB::table('user_profiles')->updateOrInsert(['user_id' => $user->id], [
                    ...collect($data)->only(['first_name', 'last_name', 'middle_initial', 'sex', 'birthday', 'province_code', 'city_code', 'barangay_code'])->all(),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $address = Address::query()->updateOrCreate(['id' => $application->address_id, 'user_id' => $user->id], [
                    ...$addressNames, 'label' => 'Registration', 'recipient_name' => $user->name, 'phone' => $data['phone'], 'line1' => $data['line1'], 'zip' => $data['zip'],
                ]);
                if ($user->role === 'seller') {
                    $user->store()->updateOrCreate(['user_id' => $user->id], ['name' => $data['business_name'], 'business_category_id' => $data['business_category_id'], 'status' => 'pending']);
                }
                if ($user->role === 'rider') {
                    DB::table('rider_profiles')->updateOrInsert(['user_id' => $user->id], ['vehicle_type' => $data['vehicle_type'], 'plate_number' => $data['plate_number'] ?? null, 'created_at' => now(), 'updated_at' => now()]);
                }
                $this->storeDocuments($request, $application, $stored);
                $application->forceFill([
                    'address_id' => $address->id, 'business_name' => $data['business_name'] ?? null,
                    'sorting_center_id' => $user->role === 'rider' ? $data['sorting_center_id'] : null,
                    'status' => 'submitted', 'submitted_at' => now(), 'reviewer_id' => null, 'reviewed_at' => null, 'rejection_reason' => null,
                    'policy_version' => 'registration-2026-10', 'policy_accepted_at' => now(),
                    'draft_data' => null,
                ])->save();
                DB::table('audit_events')->insert(['actor_id' => $user->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id, 'action' => 'submitted', 'occurred_at' => now()]);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($stored);
            throw $exception;
        }

        return to_route('application.edit')->with('status', 'Application submitted. We will email you after review.');
    }

    private function storeDocuments(Request $request, RegistrationApplication $application, array &$stored): void
    {
        $kinds = ['identity'];
        if (in_array($application->requested_role, ['seller', 'logistics'], true)) {
            $kinds[] = 'business_permit';
        }
        if ($application->requested_role === 'rider') {
            $kinds[] = 'vehicle_registration';
        }
        foreach ($kinds as $kind) {
            if ($file = $request->file($kind)) {
                $path = $file->store('registration/'.$application->id, 'local');
                if (! $path) {
                    throw new \RuntimeException('Unable to store the registration document.');
                }
                $stored[] = $path;
                $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
            }
        }
    }
}
