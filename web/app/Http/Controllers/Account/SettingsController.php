<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\ChangeRequestRequest;
use App\Http\Requests\Account\ProfileRequest;
use App\Http\Requests\Account\ReverificationRequest;
use App\Models\ChangeRequest;
use App\Models\PsgcLocation;
use App\Models\RegistrationDocument;
use App\Models\User;
use App\Services\AccountSettings;
use App\Services\EmailSecurityCodes;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingsController extends Controller
{
    public function show(Request $request, AccountSettings $settings): JsonResponse
    {
        return DB::transaction(function () use ($request, $settings) {
            $user = User::query()->whereKey($request->user()->id)->sharedLock()->firstOrFail();
            Gate::forUser($user)->authorize('create', ChangeRequest::class);
            $profile = $settings->profile($user);
            $profile['age'] = $profile['date_of_birth'] ? Carbon::parse($profile['date_of_birth'], 'Asia/Manila')->age : null;
            $profile['tin'] = $this->maskTin($profile['tin']);
            $profile['service_areas'] = array_map(fn ($code) => ['code' => $code, 'name' => $settings->regionName($code)], $profile['service_areas']);
            $profile['documents'] = array_map(fn ($doc) => [...$doc, 'url' => URL::temporarySignedRoute('account.documents', now()->addMinutes(5), ['document' => $doc['id']])], $profile['documents']);
            $history = ChangeRequest::query()->where('account_id', $user->id)->where('status', '!=', 'pending')->latest('id')->limit(50)->get();
            $changes = ChangeRequest::query()->where('account_id', $user->id)->where('status', 'pending')->get()
                ->concat($history)->sortByDesc('id')->values();

            return response()->json([
                'profile' => $profile, 'status' => $user->status,
                'contact' => $user->only(['email', 'phone', 'notification_preferences']),
                'requests' => $changes->map(fn ($change) => $this->present($change)),
                'regions' => collect(config('account-regions'))->map(fn ($name, $code) => ['code' => (string) $code, 'name' => $name])->values(),
            ])->header('Cache-Control', 'private, no-store');
        });
    }

    public function tin(Request $request): JsonResponse
    {
        Gate::authorize('create', ChangeRequest::class);

        return response()->json(['tin' => $request->user()->application->tin])->header('Cache-Control', 'private, no-store');
    }

    public function update(ProfileRequest $request, EmailSecurityCodes $codes, AccountSettings $settings): JsonResponse
    {
        $emailChanged = false;
        DB::transaction(function () use ($request, $codes, $settings, &$emailChanged) {
            $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($user)->authorize('create', ChangeRequest::class);
            $data = $request->validated();
            $changes = collect($data)->only(['email', 'password', 'notification_preferences'])->all();
            if (isset($data['contact_number'])) {
                $changes['phone'] = $data['contact_number'];
            }
            if ((isset($changes['email']) && $changes['email'] !== $user->email) || (isset($changes['phone']) && $changes['phone'] !== $user->phone)) {
                $codes->consume($user, 'profile', $data['otp_token'] ?? null);
            }
            $emailChanged = isset($changes['email']) && $changes['email'] !== $user->email;
            if ($emailChanged) {
                $changes['email_verified_at'] = null;
            }
            $before = $user->only(['email', 'phone', 'notification_preferences']);
            $user->forceFill($changes)->save();
            if (isset($changes['password'])) {
                $user->forceFill(['remember_token' => Str::random(60)])->save();
                DB::table('sessions')->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->delete();
                $request->session()->put('password_hash_web', $user->password);
                DB::table('email_security_codes')->where('user_id', $user->id)->delete();
                DB::table('password_reset_tokens')->where('email', $user->email)->delete();
                $request->session()->regenerate();
            }
            $request->user()->setRawAttributes($user->getAttributes(), true);
            $settings->audit($user, $user, 'updated', 'contact_security', $before, $user->only(['email', 'phone', 'notification_preferences']));
        });
        if ($emailChanged) {
            try {
                $request->user()->fresh()->sendEmailVerificationNotification();
            } catch (\Throwable $exception) {
                report($exception);

                return response()->json(['message' => 'Contact details saved. Email verification could not be sent. Use resend on the verification page.', 'requires_email_verification' => true]);
            }
        }

        return response()->json(['message' => $emailChanged ? 'Saved. Verify your new email using the link sent to it.' : 'Account settings saved.', 'requires_email_verification' => $emailChanged]);
    }

    public function store(ChangeRequestRequest $request, AccountSettings $settings): JsonResponse
    {
        $change = $settings->request($request->user(), $request->validated('field'), $request->validated('new_value'));

        return response()->json(['request' => $change ? $this->present($change) : null, 'message' => $change ? 'Request submitted for review.' : 'Service areas updated.'], 201);
    }

    public function reverification(ReverificationRequest $request, AccountSettings $settings): JsonResponse
    {
        $stored = [];
        try {
            $value = $request->safe()->only(['company_name', 'sec_registration_number', 'tin']);
            foreach (['identity', 'sec_certificate', 'bir_2303', 'business_permit'] as $kind) {
                $file = $request->file($kind);
                $path = $file->store('reverification/'.$request->user()->id, 'local');
                if (! $path) {
                    throw new \RuntimeException('Unable to store the document.');
                }
                $stored[] = $path;
                $value['documents'][] = ['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize()];
            }
            $change = $settings->request($request->user(), 'reverification', $value);

            return response()->json(['request' => $this->present($change), 'message' => 'Re-verification requested.'], 201);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($stored);
            throw $exception;
        }
    }

    public function locations(Request $request): JsonResponse
    {
        Gate::authorize('create', ChangeRequest::class);
        $filters = $request->validate(['region_code' => 'required|string', 'province_code' => 'nullable|string', 'city_code' => 'nullable|string']);

        return response()->json(PsgcLocation::query()->where($filters)->get())->header('Cache-Control', 'private, no-store');
    }

    public function document(Request $request, RegistrationDocument $document): StreamedResponse
    {
        abort_unless($request->user()->id === $document->application->user_id || $request->user()->canAdmin('registrations'), 404);
        abort_unless($document->disk === 'local' && Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download($document->path, $document->kind.'.'.pathinfo($document->path, PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function sendCode(Request $request, EmailSecurityCodes $codes): JsonResponse
    {
        Gate::authorize('create', ChangeRequest::class);
        $codes->send($request->user()->email, 'profile', true);

        return response()->json(['message' => 'Code sent to your current registered email.']);
    }

    public function verifyCode(Request $request, EmailSecurityCodes $codes): JsonResponse
    {
        Gate::authorize('create', ChangeRequest::class);
        $data = $request->validate(['code' => 'required|digits:6']);

        return response()->json(['token' => $codes->verify($request->user()->email, 'profile', $data['code'])])->header('Cache-Control', 'private, no-store');
    }

    public function present(ChangeRequest $change): array
    {
        $result = $change->toArray();
        if ($change->field === 'reverification') {
            foreach (['old_value', 'new_value'] as $key) {
                $result[$key]['tin'] = $this->maskTin($result[$key]['tin'] ?? '');
                $result[$key]['documents'] = collect($result[$key]['documents'] ?? [])->map(fn ($doc) => ['kind' => $doc['kind']])->all();
            }
        }

        return $result;
    }

    private function maskTin(?string $tin): string
    {
        return filled($tin) ? '***-***-***-'.substr(preg_replace('/\D/', '', $tin), -3) : '';
    }
}
