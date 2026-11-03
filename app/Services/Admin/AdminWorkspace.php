<?php

namespace App\Services\Admin;

use App\Models\ChangeRequest;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SupportCase;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminWorkspace
{
    public function data(User $user): array
    {
        if (! $user->canOperate() || $user->role !== 'admin') {
            return ['permissions' => [], 'badges' => []];
        }
        $badges = [];
        $registrationAlerts = [];
        $registrationCounts = ['buyer' => 0, 'seller' => 0, 'logistics' => 0];
        if ($user->canAdmin('registrations')) {
            $badges['accountChanges'] = ChangeRequest::query()->where('status', 'pending')->count();
            $applications = RegistrationApplication::query()->adminReviewable()->where('status', 'submitted');
            $registrationCounts = array_replace($registrationCounts, (clone $applications)->selectRaw('requested_role, COUNT(*) as total')->groupBy('requested_role')->pluck('total', 'requested_role')->map(fn ($count) => (int) $count)->all());
            $badges['registrations'] = array_sum($registrationCounts);
            $registrationAlerts = (clone $applications)->with('user:id,name,status,email_verified_at')->orderByDesc('submitted_at')->orderByDesc('id')->limit(8)
                ->get(['id', 'user_id', 'requested_role', 'business_name', 'submitted_at'])
                ->map(fn ($application) => [
                    'id' => $application->id,
                    'role' => $application->requested_role,
                    'label' => in_array($application->requested_role, ['seller', 'logistics'], true) && filled($application->business_name) ? $application->business_name : $application->user->name,
                    'verificationPending' => ! $application->user->hasVerifiedEmail(),
                    'submittedAt' => $application->submitted_at?->toIso8601String(),
                ])->all();
        }
        if ($user->canAdmin('disputes')) {
            $badges['disputes'] = SupportCase::query()->where('kind', 'complaint')->where('status', '!=', 'resolved')->count();
        }
        if ($user->canAdmin('compliance')) {
            $badges['compliance'] = Product::query()->join('stores', 'stores.id', '=', 'products.store_id')->join('categories', 'categories.id', '=', 'products.category_id')
                ->where(fn ($q) => $q->whereNotNull('products.blocked_at')->orWhereColumn('stores.business_category_id', '!=', DB::raw('COALESCE(categories.parent_id, categories.id)')))->count();
        }
        if ($user->canAdmin('messages')) {
            $badges['messages'] = SupportCase::query()->where('kind', 'message')->whereHas('messages', fn ($q) => $q->whereHas('author', fn ($author) => $author->where('role', '!=', 'admin'))
                ->whereRaw('support_case_messages.id > COALESCE((SELECT last_read_message_id FROM support_case_reads WHERE support_case_reads.support_case_id = support_cases.id AND support_case_reads.user_id = ?), 0)', [$user->id]))->count();
        }

        return ['permissions' => $user->adminPermissions(), 'badges' => $badges, 'registrationCounts' => $registrationCounts, 'registrationAlerts' => $registrationAlerts];
    }
}
