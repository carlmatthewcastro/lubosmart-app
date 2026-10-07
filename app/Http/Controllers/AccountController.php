<?php

namespace App\Http\Controllers;

use App\Models\User;
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
        abort_unless(in_array($actor->role, ['admin', 'logistics'], true), 403);
        $filters = $request->validate(['search' => 'nullable|string|max:160', 'role' => ['nullable', Rule::in(['buyer', 'seller', 'rider', 'logistics'])], 'status' => ['nullable', Rule::in(['active', 'suspended', 'deactivated'])]]);
        $query = User::query()->where('role', '!=', 'admin')->whereIn('status', ['active', 'suspended', 'deactivated']);
        $query->when($filters['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')));
        $query->when($filters['role'] ?? null, fn ($q, $role) => $q->where('role', $role));
        $query->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));
        if ($actor->role === 'logistics') {
            $query->where('role', 'rider')->whereHas('application', fn ($query) => $query->where('status', 'approved')->whereIn('sorting_center_id', $actor->sortingCenters()->where('is_active', true)->pluck('sorting_centers.id')));
        }

        return Inertia::render('accounts', ['accounts' => $query->orderBy('name')->orderBy('id')->paginate(20, ['id', 'name', 'email', 'role', 'status'])->withQueryString(), 'filters' => $filters]);
    }

    public function show(User $user): Response
    {
        Gate::authorize('updateStatus', $user);

        return Inertia::render('admin/account', [
            'account' => $user->only(['id', 'name', 'email', 'role', 'status', 'phone', 'email_verified_at', 'created_at']),
            'profile' => DB::table('user_profiles')->where('user_id', $user->id)->first(),
            'store' => $user->store?->only(['id', 'name', 'status']),
            'applicationId' => $user->application?->id,
            'history' => DB::table('audit_events')->where('subject_type', 'user')->where('subject_id', $user->id)->latest('id')->limit(10)->get(['id', 'action', 'changes', 'occurred_at']),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('updateStatus', $user);
        $allowed = $request->user()->role === 'admin' ? ['active', 'suspended', 'deactivated'] : ['active', 'suspended'];
        $data = $request->validate(['status' => ['required', Rule::in($allowed)], 'reason' => ['required', 'string', 'max:1000']]);
        DB::transaction(function () use ($request, $user, $data) {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            Gate::authorize('updateStatus', $user);
            abort_if($user->status === 'deactivated' && $request->user()->role !== 'admin', 403);
            if (! in_array($user->status, ['active', 'suspended', 'deactivated'], true) || ($data['status'] === 'active' && (! $user->hasVerifiedEmail() || ($user->application && $user->application->status !== 'approved')))) {
                throw ValidationException::withMessages(['status' => 'Review and approve this application before activating the account.']);
            }
            $previous = $user->status;
            $user->forceFill(['status' => $data['status']])->save();
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'user', 'subject_id' => $user->id, 'action' => 'status_changed', 'changes' => json_encode(['from' => $previous, 'to' => $data['status'], 'reason' => $data['reason']]), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Account status updated.');
    }
}
