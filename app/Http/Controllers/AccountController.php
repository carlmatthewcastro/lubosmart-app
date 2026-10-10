<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\AccountStatusChanged;
use App\Services\Admin\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(Request $request): Response
    {
        $actor = $request->user();
        abort_unless(in_array($actor->role, ['admin', 'sorting_center'], true), 403);
        $filters = $request->validate(['search' => 'nullable|string|max:160', 'role' => ['nullable', Rule::in(['buyer', 'seller', 'courier', 'sorting_center', 'unassigned'])], 'status' => ['nullable', Rule::in(['unverified', 'incomplete', 'pending', 'approved', 'rejected', 'suspended', 'deactivated'])]]);
        $query = User::query()->nonAdmin();
        $query->when($filters['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')));
        $query->when($filters['role'] ?? null, fn ($q, $role) => $role === 'unassigned' ? $q->whereNull('role') : $q->where('role', $role));
        $query->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));
        if ($actor->role === 'sorting_center') {
            $query->whereIn('status', ['approved', 'suspended', 'deactivated']);
            $query->where('role', 'courier')->whereIn('sorting_center_id', $actor->sortingCenters()->operational()->pluck('sorting_centers.id'))->whereHas('application', fn ($query) => $query->where('status', 'approved'));
        }

        return Inertia::render('management/accounts', [
            'accounts' => $query->orderBy('name')->orderBy('id')->paginate(20, ['id', 'name', 'email', 'role', 'status'])->withQueryString(), 'filters' => $filters,
            'allowedStatuses' => $actor->role === 'admin' ? ['approved', 'suspended', 'deactivated'] : ['approved', 'deactivated'],
        ]);
    }

    public function show(Request $request, User $user): Response|JsonResponse
    {
        Gate::authorize('updateStatus', $user);

        $data = [
            'account' => $user->only(['id', 'name', 'email', 'role', 'status', 'phone', 'email_verified_at', 'created_at']),
            'profile' => DB::table('user_profiles')->where('user_id', $user->id)->first(),
            'store' => $user->store?->only(['id', 'name', 'status']),
            'address' => DB::table('addresses')->where('user_id', $user->id)->first(['line1', 'barangay', 'city', 'province', 'zip']),
            'courier' => $user->role === 'courier' ? DB::table('rider_profiles')->where('user_id', $user->id)->first() : null,
            'centers' => $user->role === 'sorting_center' ? $user->sortingCenters()->get(['sorting_centers.id', 'name']) : [],
            'assignedCenter' => $user->role === 'courier' ? $user->logisticsCenter?->name : null,
            'allowedStatuses' => in_array($user->status, ['approved', 'suspended', 'deactivated'], true) ? ($request->user()->role === 'admin' ? ['approved', 'suspended', 'deactivated'] : ($user->status === 'approved' ? ['deactivated'] : ($this->canReactivate($request->user(), $user) ? ['approved'] : []))) : [],
            'applicationId' => $user->application?->id,
            'history' => DB::table('audit_events')->leftJoin('users as actor', 'actor.id', '=', 'audit_events.actor_id')->where(fn ($query) => $query->where('subject_type', 'user')->where('subject_id', $user->id))
                ->orWhere(fn ($query) => $query->where('subject_type', 'registration_application')->where('subject_id', $user->application?->id ?? 0))
                ->orderByDesc('occurred_at')->limit(20)->get(['audit_events.id', 'actor_id', 'actor.name as actor_name', 'action', 'changes', 'occurred_at']),
        ];

        return $request->expectsJson() ? response()->json($data)->header('Cache-Control', 'private, no-store') : Inertia::render('admin/account', $data);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('updateStatus', $user);
        $allowed = $request->user()->role === 'admin' ? ['approved', 'suspended', 'deactivated'] : ['approved', 'deactivated'];
        $data = $request->validate(['status' => ['required', Rule::in($allowed)], 'reason' => ['required', 'string', 'max:1000']]);
        DB::transaction(function () use ($request, $user, $data) {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($request->user()->fresh())->authorize('updateStatus', $user);
            if (! in_array($user->status, ['approved', 'suspended', 'deactivated'], true) || ($data['status'] === 'approved' && (! $user->hasVerifiedEmail() || $user->application?->status !== 'approved'))) {
                throw ValidationException::withMessages(['status' => 'Review and approve this application before activating the account.']);
            }
            if ($request->user()->role === 'sorting_center' && $data['status'] === 'approved' && ! $this->canReactivate($request->user(), $user)) {
                throw ValidationException::withMessages(['status' => 'Only the admin can restore an account restricted by the admin.']);
            }
            if ($request->user()->role === 'sorting_center' && $data['status'] === 'deactivated' && $user->status !== 'approved') {
                throw ValidationException::withMessages(['status' => 'Only active riders can be deactivated by logistics. Admin restrictions cannot be changed.']);
            }
            $previous = $user->status;
            abort_if($previous === $data['status'], 409, 'This account already has that status.');
            $user->forceFill(['status' => $data['status']])->save();
            if ($user->role === 'sorting_center') {
                $user->sortingCenters()->update(['is_active' => $data['status'] === 'approved']);
            }
            app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'user', 'subject_id' => $user->id, 'action' => $data['status'] === 'approved' ? 'reactivated' : $data['status'], 'old_status' => $previous, 'new_status' => $data['status'], 'reason' => $data['reason'], 'changes' => json_encode(['from' => $previous, 'to' => $data['status'], 'reason' => $data['reason']]), 'occurred_at' => now()]);
            $user->notify(new AccountStatusChanged($data['status'], $data['reason']));
        });

        return back()->with('status', 'Account status updated.');
    }

    private function canReactivate(User $actor, User $user): bool
    {
        if ($user->status !== 'deactivated') {
            return false;
        }
        $event = DB::table('audit_events')->where('subject_type', 'user')->where('subject_id', $user->id)
            ->whereIn('action', ['deactivated', 'suspended', 'reactivated'])->orderByDesc('id')->first();

        return $event && $event->action === 'deactivated' && (int) $event->actor_id === $actor->id;
    }
}
