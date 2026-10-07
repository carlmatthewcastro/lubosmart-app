<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\SortingCenter;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin', 'logistics'], true), 403);
        $filters = $request->validate(['status' => ['nullable', Rule::in(['submitted', 'approved', 'rejected'])]]);
        $status = $filters['status'] ?? 'submitted';
        $query = RegistrationApplication::query()->where('status', $status);
        if ($user->role !== 'admin') {
            $query->where('requested_role', 'rider')->whereIn('sorting_center_id', $user->sortingCenters()->where('is_active', true)->pluck('sorting_centers.id'));
        }

        return Inertia::render('reviews', ['filters' => ['status' => $status], 'applications' => $query->with('user')->orderBy('submitted_at')->orderBy('id')->paginate(15)->withQueryString()->through(fn ($application) => [
            ...$application->only(['id', 'status', 'requested_role', 'submitted_at', 'reviewed_at']), 'name' => $application->user->name, 'email' => $application->user->email,
        ])]);
    }

    public function show(RegistrationApplication $application): Response
    {
        Gate::authorize('review', $application);

        return Inertia::render('review', [
            'application' => $application->only(['id', 'status', 'requested_role', 'business_name', 'rejection_reason', 'submitted_at', 'reviewed_at']),
            'reviewer' => User::query()->find($application->reviewer_id)?->only(['name']),
            'applicant' => $application->user->only(['name', 'email', 'phone', 'status', 'email_verified_at']),
            'profile' => DB::table('user_profiles')->where('user_id', $application->user_id)->first(),
            'address' => Address::query()->find($application->address_id),
            'store' => $application->user->store?->load('businessCategory'),
            'rider' => DB::table('rider_profiles')->where('user_id', $application->user_id)->first(),
            'documents' => $application->documents->map(fn ($document) => ['id' => $document->id, 'kind' => $document->kind]),
        ]);
    }

    public function update(Request $request, RegistrationApplication $application): RedirectResponse
    {
        Gate::authorize('review', $application);
        $data = $request->validate(['decision' => ['required', Rule::in(['approved', 'rejected'])], 'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:2000']]);
        DB::transaction(function () use ($request, $application, $data) {
            // Match the submission lock order to serialize resubmission and review.
            $user = User::query()->whereKey($application->user_id)->lockForUpdate()->firstOrFail();
            $application = RegistrationApplication::query()->whereKey($application->id)->lockForUpdate()->firstOrFail();
            Gate::authorize('review', $application);
            if ($application->status !== 'submitted' || $user->status !== 'pending' || ! $user->hasVerifiedEmail() || $user->role !== $application->requested_role) {
                throw ValidationException::withMessages(['decision' => 'This application is no longer eligible for review. Refresh the page.']);
            }
            $approved = $data['decision'] === 'approved';
            if ($approved && $user->role === 'rider' && ! SortingCenter::query()->whereKey($application->sorting_center_id)->where('is_active', true)->exists()) {
                throw ValidationException::withMessages(['decision' => 'The courier needs an active sorting center before approval.']);
            }
            $application->update(['status' => $data['decision'], 'reviewer_id' => $request->user()->id, 'reviewed_at' => now(), 'rejection_reason' => $approved ? null : $data['reason']]);
            $user->forceFill(['status' => $approved ? 'active' : 'pending'])->save();
            if ($user->role === 'seller') {
                $user->store()->update(['status' => $approved ? 'approved' : 'rejected']);
            }
            if ($approved && $user->role === 'logistics') {
                $address = Address::query()->findOrFail($application->address_id);
                $center = SortingCenter::query()->create(['code' => 'APP-'.$application->id, 'name' => $application->business_name, 'address' => implode(', ', [$address->line1, $address->barangay, $address->city, $address->province]), 'phone' => $user->phone]);
                $user->sortingCenters()->attach($center->id, ['granted_by' => $request->user()->id]);
            }
            if ($approved && $user->role === 'rider') {
                $user->sortingCenters()->syncWithoutDetaching([$application->sorting_center_id => ['granted_by' => $request->user()->id]]);
            }
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id, 'action' => $data['decision'], 'changes' => json_encode(['from' => 'submitted', 'to' => $data['decision'], 'reason' => $application->rejection_reason]), 'occurred_at' => now()]);
            $user->notify(new ApplicationReviewed($data['decision'], $application->rejection_reason));
        });

        return to_route('reviews.index')->with('status', 'Application '.$data['decision'].'. Email notification queued.');
    }
}
