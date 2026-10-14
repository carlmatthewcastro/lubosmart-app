<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRiderRequest;
use App\Models\User;
use App\Services\CreateCompanyRider;
use App\Services\RiderInvitations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RiderController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->role === 'sorting_center' && $request->user()->canOperate(), 403);

        $user = $request->user();
        $riders = User::query()->managedRiders($user)->where('role', 'courier')
            ->whereIn('sorting_center_id', $user->sortingCenters()->operational()->pluck('sorting_centers.id'))
            ->with('application:id,user_id,status,registration_contract,requested_role,sorting_center_id')->orderBy('name')->get(['id', 'name', 'email', 'role', 'status', 'sorting_center_id', 'logistics_company_id']);

        return Inertia::render('logistics/riders/index', ['riders' => $riders->map(fn ($rider) => [
            ...$rider->only(['id', 'name', 'email', 'status']),
            'pendingActivation' => $rider->status === 'unverified' && $rider->application?->registration_contract === 'company-rider-2026-10',
            'applicationId' => $rider->application?->id,
            'canReview' => $rider->status === 'pending' && $rider->application?->status === 'submitted' && Gate::forUser($user)->allows('review', $rider->application),
            'canManage' => Gate::forUser($user)->allows('updateStatus', $rider),
        ])]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->role === 'sorting_center' && $request->user()->canOperate() && $request->user()->riderCreationCenters()->exists(), 403);

        return Inertia::render('logistics/riders/create');
    }

    public function store(CreateRiderRequest $request, CreateCompanyRider $service, RiderInvitations $invitations): RedirectResponse
    {
        [$rider,$delivery] = $service->create($request->user(), $request->validated());
        $sent = $invitations->deliver($delivery);

        return to_route('logistics.riders.index')->with('status', $sent ? 'Rider created. Activation email sent.' : 'Rider created. Email could not be delivered; resend from the rider list.');
    }

    public function resend(Request $request, User $rider, RiderInvitations $invitations): RedirectResponse
    {
        $sent = $invitations->resend($request->user(), $rider);

        return back()->with('status', $sent ? 'Activation email resent.' : 'Activation delivery failed. Please retry.');
    }
}
