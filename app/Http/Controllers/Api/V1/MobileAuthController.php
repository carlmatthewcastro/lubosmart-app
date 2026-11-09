<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\DeviceTokenRequest;
use App\Http\Requests\Api\MobileRegisterRequest;
use App\Http\Resources\Api\UserResource;
use App\Models\LogisticsCenter;
use App\Models\User;
use App\Services\EmailSecurityCodes;
use App\Services\RegisterAccount;
use App\Services\RegistrationEmailCodes;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Socialite\Facades\Socialite;

class MobileAuthController extends Controller
{
    public function session(DeviceTokenRequest $request)
    {
        return DB::transaction(function () use ($request) {
            $user = User::query()->where('email_normalized', $request->validated('email'))->lockForUpdate()->first();
            $valid = Hash::check($request->validated('password'), $user?->password ?: config('mobile-api.dummy_password_hash'));
            abort_unless($user && $user->password && $valid, 401);

            return $this->issue($user, $request->validated('device_name'));
        });
    }

    public function register(MobileRegisterRequest $request, RegisterAccount $accounts)
    {
        abort_unless(in_array($request->validated('role'), ['buyer', 'seller', 'rider'], true), 422);
        $data = $request->validated();
        if ($request->providerId()) {
            $data['password'] = Str::random(64);
        }
        $user = $accounts->create($data, $request->providerId());
        if ($request->providerId()) {
            $user->forceFill(['password' => null])->save();
        }
        $sent = true;
        try {
            event(new Registered($user));
        } catch (\Throwable $exception) {
            report($exception);
            $sent = false;
        }

        return $this->issue($user, 'Registration', ['verification_mail_sent' => $sent]);
    }

    public function google(Request $request)
    {
        $data = $request->validate(['access_token' => 'required|string|max:4096', 'device_name' => 'required|string|max:100']);
        try {
            $identity = Socialite::driver('google')->userFromToken($data['access_token']);
        } catch (\Throwable $exception) {
            abort(401);
        }
        abort_unless(($identity->user['email_verified'] ?? $identity->user['verified_email'] ?? false) === true, 401);
        $user = User::query()->where('google_id', $identity->getId())->where('email', mb_strtolower($identity->getEmail()))->first();
        if (! $user) {
            abort_if(User::query()->where('email', mb_strtolower($identity->getEmail()))->exists(), 409, 'Link Google to your existing account through the website first.');

            return response()->json(['data' => ['kind' => 'registration_required', 'profile' => ['email' => mb_strtolower($identity->getEmail()),
                'first_name' => $identity->user['given_name'] ?? '', 'last_name' => $identity->user['family_name'] ?? '',
            ]]]);
        }

        return $this->issue($user, $data['device_name']);
    }

    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json(['data' => ['user' => new UserResource($user),
            'can_operate' => $user->canOperate(),
            'application' => $user->application?->only(['id', 'status', 'requested_role', 'rejection_reason']),
        ]]);
    }

    public function verify(Request $request, RegistrationEmailCodes $codes)
    {
        abort_if($request->user()->hasVerifiedEmail(), 409);
        $data = $request->validate(['code' => 'required|string|regex:/\A[0-9]{6}\z/']);
        $user = $codes->verify($request->user(), $data['code']);

        return $this->issue($user, 'Verified device');
    }

    public function resend(Request $request)
    {
        abort_if($request->user()->hasVerifiedEmail(), 409);
        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification code sent.']);
    }

    public function promote(Request $request)
    {
        abort_unless($request->user()->canOperate(), 403);
        $response = $this->issue($request->user(), 'Approved device');
        $request->user()->currentAccessToken()->delete();

        return $response;
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function centers()
    {
        return response()->json(['data' => LogisticsCenter::query()->operational()->orderBy('name')->get(['id', 'name'])]);
    }

    public function sendCode(Request $request, EmailSecurityCodes $codes)
    {
        $data = $request->validate(['email' => 'required|email|max:160', 'purpose' => 'required|in:password,profile']);
        if ($data['purpose'] === 'profile') {
            abort_unless($request->user() && mb_strtolower($data['email']) === $request->user()->email, 403);
        }
        $codes->send($data['email'], $data['purpose'], $data['purpose'] === 'profile');

        return response()->json(['message' => EmailSecurityCodes::SENT_MESSAGE]);
    }

    public function verifyCode(Request $request, EmailSecurityCodes $codes)
    {
        $data = $request->validate(['email' => 'required|email|max:160', 'purpose' => 'required|in:password,profile', 'code' => 'required|digits:6']);
        if ($data['purpose'] === 'profile') {
            abort_unless($request->user() && mb_strtolower($data['email']) === $request->user()->email, 403);
        }

        return response()->json(['data' => ['confirmation_token' => $codes->verify($data['email'], $data['purpose'], $data['code'])]]);
    }

    public function password(Request $request, EmailSecurityCodes $codes)
    {
        $data = $request->validate(['email' => 'required|email|max:160', 'confirmation_token' => 'required|string|size:64', 'password' => ['required', 'confirmed', Password::defaults()]]);
        $codes->changePassword($data['email'], $data['confirmation_token'], $data['password'], $request);

        return response()->json(['message' => 'Password changed. Sign in again.']);
    }

    private function issue(User $user, string $device, array $extra = [])
    {
        abort_if(($user->status === 'unverified' || ! $user->hasVerifiedEmail()) && $user->application?->registration_contract === 'company-rider-2026-10', 403, 'Activate your company invitation before signing in.');
        abort_unless(in_array($user->role, ['buyer', 'seller', 'rider'], true) && ! in_array($user->status, ['suspended', 'deactivated'], true), 403);
        $operational = $user->canOperate();
        $expires = $operational ? now()->addDays(config('mobile-api.token_days')) : now()->addHour();
        $token = $user->createToken($device, $operational ? ['api:v1', 'role:'.$user->role] : ['onboarding'], $expires);

        return response()->json(['data' => ['access_token' => $token->plainTextToken, 'token_type' => 'Bearer',
            'expires_at' => $expires->toISOString(), 'kind' => $operational ? 'operational' : 'onboarding', 'user' => new UserResource($user), ...$extra,
        ]], 201);
    }
}
