<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\ChangeRequest;
use App\Services\AccountSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReviewController extends Controller
{
    public function index(Request $request, SettingsController $presenter): JsonResponse
    {
        Gate::authorize('viewAny', ChangeRequest::class);
        $data = $request->validate(['status' => 'sometimes|in:pending,approved,rejected']);
        $page = ChangeRequest::query()->where('status', $data['status'] ?? 'pending')->oldest('requested_at')->paginate(20)->through(function ($change) use ($presenter) {
            $result = $presenter->present($change);
            $result['document_urls'] = collect($change->new_value['documents'] ?? [])->map(fn ($doc) => [
                'kind' => $doc['kind'], 'url' => URL::temporarySignedRoute('account.review-document', now()->addMinutes(5), ['changeRequest' => $change->id, 'kind' => $doc['kind']]),
            ])->all();

            return $result;
        })->toArray();
        $page['regions'] = collect(config('account-regions'))->map(fn ($name, $code) => ['code' => (string) $code, 'name' => $name])->values();

        return response()->json($page)->header('Cache-Control', 'private, no-store');
    }

    public function approve(Request $request, ChangeRequest $changeRequest, AccountSettings $settings): JsonResponse
    {
        Gate::authorize('review', $changeRequest);
        $settings->review($changeRequest, $request->user(), true, null);

        return response()->json(['message' => 'Request approved.']);
    }

    public function reject(Request $request, ChangeRequest $changeRequest, AccountSettings $settings): JsonResponse
    {
        Gate::authorize('review', $changeRequest);
        $data = $request->validate(['reason' => 'required|string|max:2000']);
        $settings->review($changeRequest, $request->user(), false, $data['reason']);

        return response()->json(['message' => 'Request rejected.']);
    }

    public function document(Request $request, ChangeRequest $changeRequest, string $kind): StreamedResponse
    {
        Gate::authorize('review', $changeRequest);
        $document = collect($changeRequest->new_value['documents'] ?? [])->firstWhere('kind', $kind);
        abort_unless($document && $document['disk'] === 'local', 404);

        return Storage::disk('local')->download($document['path'], $kind.'.'.pathinfo($document['path'], PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store']);
    }
}
