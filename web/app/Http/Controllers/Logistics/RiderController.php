<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRiderRequest;
use App\Models\Delivery;
use App\Models\ParcelReturn;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\CreateCompanyRider;
use App\Services\RiderInvitations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RiderController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->role === 'logistics' && $request->user()->canOperate(), 403);

        $user = $request->user();
        $riders = User::query()->managedRiders($user)->where('role', 'rider')
            ->whereIn('logistics_center_id', $user->logisticsCenters()->operational()->pluck('logistics_centers.id'))
            ->with('application:id,user_id,status,registration_contract,requested_role,logistics_center_id')->orderBy('name')->get(['id', 'name', 'email', 'role', 'status', 'logistics_center_id', 'logistics_company_id', 'rider_capability', 'created_at', 'email_verified_at']);

        return Inertia::render('logistics/riders/index', ['riders' => $riders->map(fn ($rider) => [
            ...$rider->only(['id', 'name', 'email', 'status', 'created_at', 'email_verified_at', 'rider_capability']),
            'applicationStatus' => $rider->application?->status,
            'pendingActivation' => $rider->status === 'unverified' && $rider->application?->registration_contract === 'company-rider-2026-10',
            'applicationId' => $rider->application?->id,
            'canReview' => $rider->status === 'pending' && $rider->application?->status === 'submitted' && Gate::forUser($user)->allows('review', $rider->application),
            'canManage' => Gate::forUser($user)->allows('updateStatus', $rider),
        ])]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->role === 'logistics' && $request->user()->canOperate() && $request->user()->riderCreationCenters()->exists(), 403);

        return Inertia::render('logistics/riders/create');
    }

    public function store(CreateRiderRequest $request, CreateCompanyRider $service, RiderInvitations $invitations): RedirectResponse
    {
        [$rider,$delivery] = $service->create($request->user(), $request->validated());
        $sent = $invitations->deliver($delivery);

        return to_route('logistics.riders.index')->with('status', $sent ? 'Rider created. Activation email sent.' : 'Rider created. Email could not be delivered; resend from the rider list.');
    }

    public function capability(Request $request, User $rider): RedirectResponse
    {
        $data = $request->validate(['rider_capability' => 'required|in:pickup,delivery,both']);
        DB::transaction(function () use ($request, $rider, $data) {
            $rider = User::query()->whereKey($rider->id)->lockForUpdate()->firstOrFail();
            $actor = $request->user();
            abort_unless($actor->role === 'logistics' && $actor->canOperate() && $rider->role === 'rider'
                && User::query()->managedRiders($actor)->whereKey($rider->id)->exists()
                && $actor->logisticsCenters()->operational()->whereKey($rider->logistics_center_id)->exists(), 403);
            $work = Delivery::query()->where('rider_id', $rider->id)->where('status', '!=', 'delivered');
            abort_if($data['rider_capability'] !== 'both' && $work->exists(), 409, 'Finish or reassign active work before restricting rider capabilities.');
            abort_if($data['rider_capability'] === 'pickup' && DB::table('cod_collections')->where('rider_id', $rider->id)->whereIn('status', ['collected', 'handed_over'])->exists(), 409, 'Resolve outstanding COD before removing delivery capability.');
            abort_if($data['rider_capability'] !== 'both' && ParcelReturn::query()->where('rider_id', $rider->id)->whereIn('status', ['assigned', 'collected', 'seller_assigned', 'seller_in_transit'])->exists(), 409, 'Finish or reassign active returns before restricting rider capabilities.');
            $before = $rider->rider_capability;
            $rider->forceFill($data)->save();
            app(AuditLogger::class)->record(['actor_id' => $actor->id, 'subject_type' => 'user', 'subject_id' => $rider->id,
                'action' => 'rider_capability_changed', 'changes' => ['from' => $before, 'to' => $rider->rider_capability]]);
        }, 3);

        return back()->with('status', 'Rider capability updated.');
    }

    public function resend(Request $request, User $rider, RiderInvitations $invitations): RedirectResponse
    {
        $sent = $invitations->resend($request->user(), $rider);

        return back()->with('status', $sent ? 'Activation email resent.' : 'Activation delivery failed. Please retry.');
    }
}
