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
        $query = User::query()->where('role', '!=', 'admin')->whereIn('status', ['active', 'suspended']);
        if ($actor->role === 'logistics') {
            $query->where('role', 'rider')->whereHas('application', fn ($query) => $query->where('status', 'approved')->whereIn('sorting_center_id', $actor->sortingCenters()->where('is_active', true)->pluck('sorting_centers.id')));
        }

        return Inertia::render('accounts', ['accounts' => $query->orderBy('name')->orderBy('id')->paginate(20, ['id', 'name', 'email', 'role', 'status'])]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('updateStatus', $user);
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'suspended'])], 'reason' => ['required', 'string', 'max:1000']]);
        DB::transaction(function () use ($request, $user, $data) {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            Gate::authorize('updateStatus', $user);
            if (! in_array($user->status, ['active', 'suspended'], true) || ($data['status'] === 'active' && $user->application && $user->application->status !== 'approved')) {
                throw ValidationException::withMessages(['status' => 'Review and approve this application before activating the account.']);
            }
            $previous = $user->status;
            $user->forceFill(['status' => $data['status']])->save();
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'user', 'subject_id' => $user->id, 'action' => 'status_changed', 'changes' => json_encode(['from' => $previous, 'to' => $data['status'], 'reason' => $data['reason']]), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Account status updated.');
    }
}
