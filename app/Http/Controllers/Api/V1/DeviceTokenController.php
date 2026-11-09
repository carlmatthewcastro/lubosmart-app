<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\DeviceTokenRequest;
use App\Http\Resources\Api\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class DeviceTokenController extends Controller
{
    public function store(DeviceTokenRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $user = User::query()->where('email_normalized', $request->validated('email'))->lockForUpdate()->first();
            // Use the configured hasher even for an unknown account to avoid a fast missing-account path.
            $hash = $user?->password ?: config('mobile-api.dummy_password_hash');
            $valid = Hash::check($request->validated('password'), $hash);
            abort_unless($user && $user->password && $valid, 401);
            abort_unless($user->canOperate() && in_array($user->role, ['buyer', 'seller', 'rider', 'logistics', 'admin'], true), 403);
            $expires = now()->addDays(config('mobile-api.token_days'));
            $token = $user->createToken($request->validated('device_name'), ['api:v1', 'role:'.$user->role], $expires);

            return response()->json(['data' => [
                'token_type' => 'Bearer', 'access_token' => $token->plainTextToken,
                'expires_at' => $expires->toISOString(), 'user' => new UserResource($user),
            ]], 201)->header('Cache-Control', 'private, no-store');
        });
    }

    public function destroy(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function destroyAll(Request $request): Response
    {
        $request->user()->tokens()->delete();

        return response()->noContent();
    }
}
