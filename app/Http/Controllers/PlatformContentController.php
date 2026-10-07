<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PlatformContentController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'admin', 403);

        return Inertia::render('admin/platform', ['contents' => DB::table('platform_contents')->latest('id')->paginate(15)]);
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
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'platform_content', 'subject_id' => $id, 'action' => $data['published'] ? 'published' : 'draft_saved', 'changes' => json_encode($data), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Platform content saved.');
    }

    public function published()
    {
        return Inertia::render('platform-information', ['contents' => DB::table('platform_contents')->where('published', true)->latest('updated_at')->paginate(15, ['id', 'kind', 'title', 'body', 'updated_at'])]);
    }
}
