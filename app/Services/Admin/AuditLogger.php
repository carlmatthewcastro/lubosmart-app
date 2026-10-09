<?php

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditLogger
{
    public function record(array $event): void
    {

        $changes = is_string($event['changes'] ?? null) ? json_decode($event['changes'], true) : ($event['changes'] ?? []);
        $module = match ($event['subject_type']) {
            'registration_application' => 'registrations', 'user' => 'accounts', 'product' => 'compliance',
            'support_case' => 'disputes', 'commerce_settings' => 'finance', 'platform_content' => 'system', default => 'system',
        };
        $request = request();
        $requestId = $request->attributes->get('admin_audit_request_id');
        if (! $requestId) {
            $requestId = (string) Str::uuid();
            $request->attributes->set('admin_audit_request_id', $requestId);
        }
        DB::table('audit_events')->insert([
            ...$event, 'changes' => json_encode($changes), 'module' => $module,
            'actor_sub_role' => null, 'request_id' => $requestId,
            'old_status' => $event['old_status'] ?? $changes['from'] ?? null,
            'new_status' => $event['new_status'] ?? $changes['to'] ?? $changes['status'] ?? null,
            'reason' => $event['reason'] ?? $changes['reason'] ?? $changes['resolution'] ?? null,
            'occurred_at' => $event['occurred_at'] ?? now(),
        ]);
    }

    public function scope($query, User $user, string $column = 'module')
    {
        return $user->role === 'admin' && $user->canOperate() ? $query : $query->whereIn($column, array_diff($user->adminPermissions(), ['audit']));
    }
}
