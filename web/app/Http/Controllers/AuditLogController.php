<?php

namespace App\Http\Controllers;

use App\Services\Admin\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->role === 'admin', 403);
        $actions = DB::table('audit_events')->distinct()->orderBy('action')->pluck('action');
        $filters = $request->validate(['action' => ['nullable', Rule::in($actions->all())], 'search' => ['nullable', 'string', 'max:160'], 'account_id' => ['nullable', 'integer', 'min:1']]);
        $query = app(AuditLogger::class)->scope(DB::table('audit_events'), $request->user(), 'audit_events.module')
            ->leftJoin('users as actor', 'actor.id', '=', 'audit_events.actor_id')
            ->leftJoin('registration_applications as application', fn ($join) => $join->on('application.id', '=', 'audit_events.subject_id')->where('audit_events.subject_type', 'registration_application'))
            ->leftJoin('users as account', fn ($join) => $join->on('account.id', '=', 'audit_events.subject_id')->where('audit_events.subject_type', 'user'))
            ->leftJoin('users as applicant', 'applicant.id', '=', 'application.user_id')
            ->leftJoin('products as product', fn ($join) => $join->on('product.id', '=', 'audit_events.subject_id')->where('audit_events.subject_type', 'product'))
            ->leftJoin('support_cases as conversation', fn ($join) => $join->on('conversation.id', '=', 'audit_events.subject_id')->where('audit_events.subject_type', 'support_case'))
            ->leftJoin('platform_contents as content', fn ($join) => $join->on('content.id', '=', 'audit_events.subject_id')->where('audit_events.subject_type', 'platform_content'))
            ->when($filters['action'] ?? null, fn ($q, $action) => $q->where('audit_events.action', $action))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q->where('actor.name', 'like', '%'.$search.'%')->orWhere('account.name', 'like', '%'.$search.'%')->orWhere('account.email', 'like', '%'.$search.'%')->orWhere('applicant.name', 'like', '%'.$search.'%')->orWhere('applicant.email', 'like', '%'.$search.'%')->orWhere('product.name', 'like', '%'.$search.'%')->orWhere('conversation.subject', 'like', '%'.$search.'%')->orWhere('content.title', 'like', '%'.$search.'%')))
            ->when($filters['account_id'] ?? null, fn ($q, $id) => $q->where(fn ($q) => $q->where('account.id', $id)->orWhere('applicant.id', $id)));
        $events = $query->orderByDesc('audit_events.id')->paginate(25, ['audit_events.*', 'actor.name as actor_name', DB::raw("COALESCE(account.name, applicant.name, product.name, conversation.subject, content.title, 'Platform rates') as subject_name")])->withQueryString();

        return Inertia::render('admin/audit-log', ['events' => $events, 'filters' => $filters, 'actions' => $actions]);
    }
}
