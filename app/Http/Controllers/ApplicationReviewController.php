<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\RegistrationApplication;
use App\Models\SortingCenter;
use App\Models\User;
use App\Notifications\ApplicationReviewed;
use App\Services\Admin\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin', 'sorting_center'], true), 403);
        $filters = $request->validate(['status' => ['nullable', Rule::in(['submitted', 'approved', 'rejected'])]]);
        $status = $filters['status'] ?? 'submitted';
        $query = RegistrationApplication::query()->where('status', $status);
        if ($user->role === 'sorting_center') {
            $query->where('requested_role', 'courier')->whereIn('sorting_center_id', $user->sortingCenters()->operational()->pluck('sorting_centers.id'))
                ->whereHas('user', fn ($users) => $users->where('role', 'courier')->whereColumn('users.sorting_center_id', 'registration_applications.sorting_center_id'));
        }

        return Inertia::render('reviews', ['filters' => ['status' => $status], 'applications' => $query->with('user')->orderBy('submitted_at')->orderBy('id')->paginate(15)->withQueryString()->through(fn ($application) => [
            ...$application->only(['id', 'status', 'requested_role', 'submitted_at', 'reviewed_at']), 'name' => $application->user->name, 'email' => $application->user->email,
        ])]);
    }

    public function show(Request $request, RegistrationApplication $application): Response|JsonResponse
    {
        Gate::authorize('view', $application);
        $profile = DB::table('user_profiles')->where('user_id', $application->user_id)->first();
        if ($profile?->birthday) {
            $profile->age = Carbon::parse($profile->birthday)->age;
        }

        $data = [
            'canReview' => Gate::allows('review', $application),
            'application' => $application->only(['id', 'status', 'requested_role', 'business_name', 'rejection_reason', 'submitted_at', 'reviewed_at']),
            'reviewer' => User::query()->find($application->reviewer_id)?->only(['name']),
            'applicant' => $application->user->only(['name', 'email', 'phone', 'status', 'email_verified_at']),
            'profile' => $profile,
            'address' => Address::query()->find($application->address_id),
            'store' => $application->user->store?->load('businessCategory'),
            'bankAccount' => $application->user->role === 'seller' ? $application->user->store?->bank_account : $application->user->bank_account,
            'courier' => DB::table('rider_profiles')->where('user_id', $application->user_id)->first(),
            'documents' => $application->documents->map(fn ($document) => [
                'id' => $document->id, 'kind' => $document->kind, 'mime_type' => $document->mime_type,
                'url' => URL::temporarySignedRoute('registration-documents.show', now()->addMinutes(5), ['document' => $document->id]),
            ]),
        ];

        return $request->expectsJson() ? response()->json($data)->header('Cache-Control', 'private, no-store') : Inertia::render('review', $data);
    }

    public function update(Request $request, RegistrationApplication $application): RedirectResponse
    {
        Gate::authorize('review', $application);
        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'reason' => [Rule::requiredIf($request->input('decision') === 'rejected' || ($request->user()->role === 'admin' && $application->requested_role === 'courier')), 'nullable', 'string', 'max:2000'],
        ]);
        DB::transaction(function () use ($request, $application, $data) {
            // Match the submission lock order to serialize resubmission and review.
            $user = User::query()->whereKey($application->user_id)->lockForUpdate()->firstOrFail();
            $application = RegistrationApplication::query()->whereKey($application->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($request->user()->fresh())->authorize('review', $application);
            if ($application->status !== 'submitted' || $user->status !== 'pending' || ! $user->hasVerifiedEmail() || $user->role !== $application->requested_role) {
                throw ValidationException::withMessages(['decision' => 'This application is no longer eligible for review. Refresh the page.']);
            }
            $approved = $data['decision'] === 'approved';
            if ($approved && $user->role === 'courier' && ! SortingCenter::query()->operational()->whereKey($application->sorting_center_id)->exists()) {
                throw ValidationException::withMessages(['decision' => 'The courier needs an active sorting center before approval.']);
            }
            $application->update(['status' => $data['decision'], 'reviewer_id' => $request->user()->id, 'reviewed_at' => now(), 'rejection_reason' => $approved ? null : $data['reason']]);
            $user->forceFill(['status' => $approved ? 'approved' : 'rejected'])->save();
            if ($user->role === 'seller') {
                $user->store()->update(['status' => $approved ? 'approved' : 'rejected']);
            }
            if ($approved && $user->role === 'sorting_center') {
                $address = Address::query()->findOrFail($application->address_id);
                $center = $user->sortingCenters()->first() ?? new SortingCenter(['code' => 'APP-'.$application->id]);
                $center->fill(['is_active' => true, 'name' => $application->business_name, 'address' => implode(', ', [$address->line1, $address->barangay, $address->city, $address->province]), 'phone' => $user->phone])->save();
                $user->sortingCenters()->syncWithoutDetaching([$center->id => ['granted_by' => $request->user()->id]]);
            }
            if ($approved && $user->role === 'courier') {
                $user->forceFill(['sorting_center_id' => $application->sorting_center_id])->save();
                $user->sortingCenters()->sync([$application->sorting_center_id => ['granted_by' => $request->user()->id]]);
            }
            app(AuditLogger::class)->record([
                'actor_id' => $request->user()->id, 'subject_type' => 'registration_application', 'subject_id' => $application->id,
                'action' => $data['decision'], 'old_status' => 'pending', 'new_status' => $data['decision'], 'reason' => $data['reason'] ?? null,
                'changes' => json_encode(['from' => 'pending', 'to' => $data['decision'], 'reason' => $data['reason'] ?? null, 'user_id' => $user->id]), 'occurred_at' => now(),
            ]);
            $user->notify(new ApplicationReviewed($data['decision'], $application->rejection_reason));
        });

        if ($request->boolean('_modal')) {
            return back()->with('status', 'Application '.$data['decision'].'. Email notification queued.');
        }

        return to_route('reviews.index')->with('status', 'Application '.$data['decision'].'. Email notification queued.');
    }
}
