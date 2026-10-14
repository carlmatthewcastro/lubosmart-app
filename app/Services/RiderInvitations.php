<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\RiderActivation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RiderInvitations
{
    public function issue(User $user, User $company): array
    {
        $old = DB::table('rider_activation_invitations')->where('user_id', $user->id)->first();
        $same = $old && $old->window_started_at > now()->subHour();
        if ($same && $old->send_count >= 3) {
            throw ValidationException::withMessages(['rider' => 'Three activation emails per hour are allowed.']);
        }
        $token = Str::random(64);
        $hash = hash('sha256', $token);
        DB::table('rider_activation_invitations')->updateOrInsert(['user_id' => $user->id], [
            'company_id' => $company->id, 'sorting_center_id' => $user->sorting_center_id, 'email' => $user->email, 'token_hash' => $hash, 'expires_at' => now()->addDay(), 'consumed_at' => null,
            'last_sent_at' => now(), 'window_started_at' => $same ? $old->window_started_at : now(), 'send_count' => $same ? $old->send_count + 1 : 1, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return [$user, $token, $hash, $company->application?->business_name ?? $user->logisticsCenter->name];
    }

    public function deliver(array $delivery): bool
    {
        [$user,$token,$hash,$company] = $delivery;
        try {
            $user->notify(new RiderActivation(route('rider.activation.show', ['token' => $token]), $company));

            return true;
        } catch (\Throwable $exception) {
            report($exception);
            DB::table('rider_activation_invitations')->where('user_id', $user->id)->where('token_hash', $hash)->update(['expires_at' => now()]);

            return false;
        }
    }

    public function resend(User $actor, User $target): bool
    {
        $delivery = DB::transaction(function () use ($actor, $target) {
            $company = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $user = User::whereKey($target->id)->lockForUpdate()->firstOrFail();
            abort_unless($company->role === 'sorting_center' && $company->canOperate() && $user->logistics_company_id === $company->id && $user->role === 'courier', 404);
            abort_unless($user->status === 'unverified' && $company->sortingCenters()->operational()->whereKey($user->sorting_center_id)->exists(), 403);

            return $this->issue($user, $company);
        }, 3);

        return $this->deliver($delivery);
    }

    public function eligible(string $token): ?object
    {
        $record = DB::table('rider_activation_invitations')->where('token_hash', hash('sha256', $token))->first();
        if (! $record || $record->consumed_at || $record->expires_at <= now()) {
            return null;
        }
        $rider = User::find($record->user_id);
        $company = User::find($record->company_id);
        if (! $rider || ! $company || $company->role !== 'sorting_center' || $rider->role !== 'courier' || $rider->status !== 'unverified' || $rider->email !== $record->email || $rider->logistics_company_id !== $company->id || $rider->sorting_center_id !== $record->sorting_center_id || ! $company->canOperate() || ! $company->sortingCenters()->operational()->whereKey($record->sorting_center_id)->exists()) {
            return null;
        }

        return $record;
    }

    public function activate(string $token, string $password): void
    {
        $record = $this->eligible($token);
        if (! $record) {
            throw ValidationException::withMessages(['activation' => 'This activation link is invalid, expired or already used.']);
        }
        DB::transaction(function () use ($record, $token, $password) {
            // Same company->rider lock order as creation/resend; serialize with company suspension.
            User::whereKey($record->company_id)->lockForUpdate()->firstOrFail();
            $rider = User::whereKey($record->user_id)->lockForUpdate()->firstOrFail();
            DB::table('rider_activation_invitations')->where('user_id', $rider->id)->lockForUpdate()->first();
            if (! $this->eligible($token)) {
                throw ValidationException::withMessages(['activation' => 'This activation link is invalid, expired or already used.']);
            }
            $profile = DB::table('rider_profiles')->where('user_id', $rider->id)->first();
            if (! $profile || $profile->license_expires_at < now('Asia/Manila')->format('Y-m-d')) {
                throw ValidationException::withMessages(['activation' => 'Your license has expired. Contact your logistics company.']);
            }
            $rider->forceFill(['password' => Hash::make($password), 'status' => 'approved', 'email_verified_at' => now()])->save();
            DB::table('rider_activation_invitations')->where('user_id', $rider->id)->update(['consumed_at' => now(), 'updated_at' => now()]);
            $rider->application()->update(['status' => 'approved', 'reviewed_at' => now()]);
            DB::table('audit_events')->insert(['actor_id' => $rider->id, 'subject_type' => 'user', 'subject_id' => $rider->id, 'action' => 'rider_activated', 'occurred_at' => now()]);
        }, 3);
    }
}
