<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Resources\Api\UserResource;
use App\Models\Address;
use App\Models\Order;
use App\Models\SupportCase;
use App\Models\User;
use App\Services\AccountSettings;
use App\Services\EmailSecurityCodes;
use App\Support\SellerRules;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        if ($request->user()->role === 'logistics' && in_array($request->user()->status, ['approved', 'pending_reverification'], true)) {
            return Inertia::render('settings/account', ['logisticsRegistration' => $this->logisticsRegistration($request->user())]);
        }

        if (in_array($request->user()->role, ['rider', 'seller'], true)) {
            $user = $request->user();
            $registration = $this->logisticsRegistration($user);
            $vehicle = DB::table('rider_profiles')->where('user_id', $user->id)->first();

            $seller = $user->role === 'seller';

            return Inertia::render($seller ? 'settings/seller' : 'settings/rider', [
                'personalDetails' => $registration['Personal details'],
                'registeredAddress' => $registration['Registered business address'],
                'companyName' => $user->logisticsCenter?->name,
                'vehicleType' => $vehicle?->vehicle_type,
                'plateNumber' => $vehicle?->plate_number,
                'bankAccount' => $seller ? $user->store?->bank_account : $user->bank_account,
                ...($seller ? [
                    'businessName' => $user->store?->name,
                    'sellerType' => $user->application?->seller_type,
                    'requiredDocuments' => SellerRules::documents($user->application?->seller_type ?? ''),
                ] : []),
                'sensitiveConfirmed' => $request->session()->has('profile_confirmation'),
                'googleOnly' => ! $user->password,
                'documents' => $user->application?->documents()->latest('id')->get()->unique('kind')->values()->map(fn ($document) => [
                    'id' => $document->id, 'kind' => $document->kind,
                ]) ?? [],
            ]);
        }

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'googleConnected' => filled($request->user()->google_id),
            'googleOnly' => ! $request->user()->password,
            'sensitiveConfirmed' => $request->session()->has('profile_confirmation'),
            'businessName' => $request->user()->role === 'logistics' ? $request->user()->application?->business_name : $request->user()->store?->name,
            'bankAccount' => $request->user()->role === 'seller' ? $request->user()->store?->bank_account : $request->user()->bank_account,
            'plateNumber' => DB::table('rider_profiles')->where('user_id', $request->user()->id)->value('plate_number'),
            'logisticsRegistration' => $request->user()->role === 'logistics' ? $this->logisticsRegistration($request->user()) : null,
        ]);
    }

    private function logisticsRegistration(User $user): array
    {
        $profile = DB::table('user_profiles')->where('user_id', $user->id)->first();
        $application = $user->application;
        $address = $application?->address_id ? Address::query()->where('user_id', $user->id)->find($application->address_id) : null;
        $birthday = $profile?->birthday ? Carbon::parse($profile->birthday, 'Asia/Manila') : null;
        $documents = $application?->documents()->latest('id')->get()->unique('kind')->pluck('kind')->all() ?? [];

        return [
            'Personal details' => [
                'First name' => $profile?->first_name, 'Last name' => $profile?->last_name,
                'Middle initial (optional)' => $profile?->middle_initial,
                'Sex' => match ($profile?->sex) {
                    'female' => 'Female', 'male' => 'Male', 'prefer_not_to_say' => 'Prefer not to say', default => null
                },
                'Date of birth' => $birthday?->format('F j, Y'), 'Age' => $birthday ? (string) (int) $birthday->diffInYears(now('Asia/Manila')) : null,
            ],
            'Company registration' => [
                'Company name' => $application?->business_name, 'SEC registration number' => $application?->sec_number,
                'TIN' => $application?->tin ? '***-***-***-'.substr(preg_replace('/\D/', '', $application->tin), -3) : null, 'Contact person position' => $application?->position,
                'Service areas' => implode(', ', $application?->service_region_names ?? []),
            ],
            'Registered business address' => [
                'Region' => app(AccountSettings::class)->regionName($application?->region_code ?: $address?->region), 'Province' => $address?->province, 'City / municipality' => $address?->city,
                'Barangay' => $address?->barangay, 'House / unit number' => $address?->house_number,
                'Street / subdivision' => $address?->street ?: $address?->line1, 'Postal code' => $address?->zip,
            ],
            'Submitted documents' => collect([
                'identity' => 'Government-issued ID', 'sec_certificate' => 'SEC certificate',
                'bir_2303' => 'BIR Form 2303', 'business_permit' => "Mayor's / business permit",
            ])->mapWithKeys(fn ($label, $kind) => [$label => in_array($kind, $documents, true) ? 'Submitted' : 'Not submitted'])->all(),
        ];
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request, EmailSecurityCodes $codes): RedirectResponse|JsonResponse
    {
        $path = null;
        $emailChanged = false;
        try {
            DB::transaction(function () use ($request, $codes, &$path, &$emailChanged) {
                $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                $before = $user->only(['name', 'email', 'phone', 'status']);
                $user->fill($request->safe()->only($user->role === 'admin' ? ['name'] : ['name', 'email']));
                if ($user->role !== 'admin' && $request->has('phone')) {
                    $user->forceFill(['phone' => $request->validated('phone')]);
                }
                $store = $user->store;
                $businessName = $user->role === 'logistics' ? $user->application?->business_name : $store?->name;
                $bankAccount = $user->role === 'seller' ? $store?->bank_account : $user->bank_account;
                $rider = DB::table('rider_profiles')->where('user_id', $user->id)->first();
                $partnerBefore = ['business_name' => $businessName, 'plate_number' => $rider?->plate_number];
                $bankChanged = $request->has('bank_account') && $request->validated('bank_account') !== $bankAccount;
                $businessChanged = $request->has('business_name') && $request->validated('business_name') !== $businessName;
                $plateChanged = $request->has('plate_number') && $request->validated('plate_number') !== $rider?->plate_number;
                if ($user->isDirty(['email', 'phone']) || $bankChanged) {
                    // Confirm against the current email before applying its replacement.
                    $identity = User::query()->findOrFail($user->id);
                    $codes->confirmSensitiveChange($request, $identity);
                }
                $important = $businessChanged || $bankChanged || $plateChanged || $request->hasFile('identity');
                if ($important && $user->status !== 'approved') {
                    throw ValidationException::withMessages(['business_name' => 'Complete your application or wait for its review before changing partner details.']);
                }
                if ($user->isDirty('email')) {
                    $emailChanged = true;
                    $user->email_verified_at = null;
                    DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();
                    DB::table('registration_email_codes')->where('user_id', $user->id)->delete();
                    DB::table('email_security_codes')->where('user_id', $user->id)->delete();
                }
                if ($request->has('phone') && $user->isDirty('phone') && $user->role === 'buyer' && $user->status === 'approved' && blank($user->phone)) {
                    throw ValidationException::withMessages(['phone' => 'Approved buyers must keep a valid contact number.']);
                }
                if ($businessChanged) {
                    $businessName = $request->validated('business_name');
                    if ($store) {
                        $store->name = $businessName;
                    }
                }
                if ($bankChanged) {
                    if ($user->role !== 'seller') {
                        $user->bank_account = $request->validated('bank_account');
                    } else {
                        $store->bank_account = $request->validated('bank_account');
                    }
                }
                if ($plateChanged) {
                    DB::table('rider_profiles')->where('user_id', $user->id)->update(['plate_number' => $request->validated('plate_number'), 'plate_normalized' => strtoupper(trim($request->validated('plate_number'))), 'updated_at' => now()]);
                }
                if ($important && in_array($user->role, ['buyer', 'seller', 'rider', 'logistics'], true)) {
                    $user->status = 'pending';
                    $user->application()->updateOrCreate(['user_id' => $user->id], [
                        'requested_role' => $user->role, 'status' => 'submitted', 'submitted_at' => now(),
                        'reviewer_id' => null, 'reviewed_at' => null, 'rejection_reason' => null,
                        'business_name' => $businessName,
                        'logistics_center_id' => $user->role === 'rider' ? $user->logistics_center_id : null,
                    ]);
                    if ($request->hasFile('identity')) {
                        $application = $user->application()->firstOrFail();
                        $file = $request->file('identity');
                        $path = $file->store('registration/'.$application->id, 'local');
                        if (! $path) {
                            throw new \RuntimeException('Unable to store the identity document.');
                        }
                        $application->documents()->create(['kind' => 'identity', 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()]);
                    }
                    if ($store) {
                        $store->status = 'pending';
                    }
                }
                $store?->save();
                $user->save();
                DB::table('audit_events')->insert(['actor_id' => $user->id, 'subject_type' => 'user', 'subject_id' => $user->id, 'action' => $important ? 'profile_review_requested' : 'profile_updated',
                    'old_status' => $before['status'], 'new_status' => $user->status,
                    'changes' => json_encode(['before' => $before, 'after' => $user->only(['name', 'email', 'phone', 'status']), 'partner_before' => $partnerBefore, 'partner_after' => ['business_name' => $businessName, 'plate_number' => $plateChanged ? $request->validated('plate_number') : $rider?->plate_number], 'bank_account_changed' => $bankChanged, 'identity_changed' => $request->hasFile('identity')]), 'occurred_at' => now()]);
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        if ($request->routeIs('api.v1.*')) {
            $sent = false;
            if ($emailChanged) {
                try {
                    $request->user()->fresh()->sendEmailVerificationNotification();
                    $sent = true;
                } catch (\Throwable $exception) {
                    report($exception);
                }
            }

            return response()->json(['data' => new UserResource($request->user()->fresh()),
                'message' => 'Profile saved. Important changes require review.', 'requires_sign_in' => $emailChanged || ! $request->user()->fresh()->canOperate(), 'verification_mail_sent' => $sent]);
        }

        if ($emailChanged) {
            try {
                $request->user()->fresh()->sendEmailVerificationNotification();
            } catch (\Throwable $exception) {
                report($exception);

                return to_route('verification.notice')->with('status', 'verification-mail-unavailable');
            }

            return to_route('verification.notice')->with('status', 'verification-link-sent');
        }

        return to_route($request->user()->fresh()->status === 'pending' ? 'application.waiting' : 'profile.edit')->with('status', $request->user()->role === 'admin'
            ? 'Admin name saved.'
            : 'Profile saved. Important changes require another approval review.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($user->role !== 'buyer' || $user->application()->exists() || Order::query()->where('buyer_id', $user->id)->exists()
            || DB::table('audit_events')->where('actor_id', $user->id)->exists()
            || SupportCase::query()->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))->exists()) {
            throw ValidationException::withMessages(['password' => 'This account has records to keep. Contact support to request account closure.']);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
