<?php

namespace App\Http\Controllers;

use App\Services\Admin\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PlatformContentController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);

        $filters = $request->validate(['kind' => ['nullable', Rule::in(['announcement', 'policy'])], 'visibility' => ['nullable', Rule::in(['published', 'draft'])]]);
        $counts = DB::table('platform_contents')->selectRaw('COUNT(*) as total, COALESCE(SUM(published), 0) as published')->first();

        return Inertia::render('admin/platform', [
            'contents' => DB::table('platform_contents')
                ->when($filters['kind'] ?? null, fn ($query, $kind) => $query->where('kind', $kind))
                ->when($filters['visibility'] ?? null, fn ($query, $visibility) => $query->where('published', $visibility === 'published'))
                ->latest('updated_at')->orderByDesc('id')->paginate(15)->withQueryString(),
            'filters' => $filters,
            'summary' => ['total' => (int) $counts->total, 'published' => (int) $counts->published, 'draft' => (int) $counts->total - (int) $counts->published],
        ]);
    }

    public function save(Request $request, ?int $content = null)
    {
        abort_unless($request->user()->role === 'admin', 403);
        $data = $request->validate(['kind' => ['required', Rule::in(['announcement', 'policy'])], 'title' => 'required|string|max:160', 'body' => 'required|string|max:20000', 'published' => 'required|boolean']);
        DB::transaction(function () use ($request, $data, $content) {
            if ($content) {
                abort_unless(DB::table('platform_contents')->where('id', $content)->lockForUpdate()->first(), 404);
                DB::table('platform_contents')->where('id', $content)->update($data + ['updated_by' => $request->user()->id, 'updated_at' => now()]);
                $id = $content;
            } else {
                $id = DB::table('platform_contents')->insertGetId($data + ['updated_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            }
            app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'platform_content', 'subject_id' => $id, 'action' => $data['published'] ? 'published' : 'draft_saved', 'changes' => json_encode($data), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Platform content saved.');
    }

    public function published(Request $request)
    {
        $data = $request->validate(['policy' => ['nullable', Rule::in(['terms', 'privacy'])]]);
        $policy = $data['policy'] ?? null;

        return Inertia::render('platform-information', [
            'policy' => $policy,
            'contents' => DB::table('platform_contents')->where('published', true)
                ->when($policy, fn ($query) => $query->where('kind', 'policy')->where('title', 'like', '%'.$policy.'%'))
                ->latest('updated_at')->paginate(15, ['id', 'kind', 'title', 'body', 'updated_at'])->withQueryString(),
        ]);
    }
}
