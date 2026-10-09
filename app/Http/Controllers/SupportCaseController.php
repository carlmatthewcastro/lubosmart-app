<?php

namespace App\Http\Controllers;

use App\Models\SellerOrder;
use App\Models\SupportCase;
use App\Models\SupportCaseMessage;
use App\Models\User;
use App\Services\Admin\AuditLogger;
use App\Services\Logistics\LogisticsContacts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SupportCaseController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate(['kind' => ['nullable', Rule::in(['complaint', 'message'])], 'status' => ['nullable', Rule::in(['open', 'in_review', 'resolved'])]]);
        $query = SupportCase::query()->with('participants:id,name,role');
        if ($request->expectsJson()) {
            $query->with('latestMessage.author:id,name');
        }
        if ($request->user()->role !== 'admin') {
            $query->whereHas('participants', fn ($q) => $q->where('users.id', $request->user()->id));
        }
        $query->when($filters['kind'] ?? null, fn ($q, $kind) => $q->where('kind', $kind));
        $query->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));

        $data = ['cases' => $query->latest('updated_at')->orderByDesc('id')->paginate(15)->withQueryString(), 'filters' => $filters];

        return $request->expectsJson() ? response()->json($data)->header('Cache-Control', 'private, no-store') : Inertia::render('support/index', $data);
    }

    public function options(Request $request): JsonResponse
    {
        abort_unless($request->user()->canAdmin('messages') || $request->user()->role === 'sorting_center', 403);
        $logistics = $request->user()->role === 'sorting_center';
        $contacts = app(LogisticsContacts::class);
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'role' => ['nullable', Rule::in(['buyer', 'seller', 'courier', 'sorting_center', 'admin'])]]);
        $search = $filters['search'] ?? '';
        $recipients = ($logistics ? $contacts->recipients($request->user()) : User::query()->where('role', '!=', 'admin')->where('status', 'approved')->whereNotNull('email_verified_at'))
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')))
            ->orderBy('name')->limit(20)->get(['id', 'name', 'email', 'role']);
        $orders = ($logistics ? $contacts->parcels($request->user()) : SellerOrder::query())->with(['order.buyer:id,name', 'store:id,name'])
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q->whereHas('order.buyer', fn ($q) => $q->where('name', 'like', '%'.$search.'%'))->orWhereHas('store', fn ($q) => $q->where('name', 'like', '%'.$search.'%'))->orWhere('id', is_numeric($search) ? (int) $search : 0)))
            ->latest('id')->limit(20)->get()->map(fn ($order) => ['id' => $order->id, 'label' => 'Parcel #'.$order->id.' / '.$order->order->buyer->name.' / '.$order->store->name]);

        return response()->json(compact('recipients', 'orders'))->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request)
    {
        $data = $request->validate(['kind' => ['required', Rule::in(['complaint', 'message'])], 'subject' => 'required|string|max:160', 'body' => 'required|string|max:5000', 'seller_order_id' => 'nullable|integer|exists:seller_orders,id', 'recipient_email' => 'nullable|email|max:160', 'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $user = $request->user();
        $participants = [$user->id];
        if (! empty($data['seller_order_id'])) {
            $order = SellerOrder::query()->with(['order', 'store', 'delivery'])->findOrFail($data['seller_order_id']);
            $orderUsers = array_filter([$order->order->buyer_id, $order->store->user_id, $order->delivery?->rider_id]);
            abort_unless($user->role === 'admin' || ($user->role === 'sorting_center' && app(LogisticsContacts::class)->parcels($user)->whereKey($order->id)->exists()) || in_array($user->id, $orderUsers, true), 403);
            $participants = array_merge($participants, $orderUsers);
        }
        if (! empty($data['recipient_email'])) {
            abort_unless(in_array($user->role, ['admin', 'sorting_center'], true), 403);
            $recipient = ($user->role === 'sorting_center' ? app(LogisticsContacts::class)->recipients($user) : User::query()->where('role', '!=', 'admin'))->where('email', strtolower(trim($data['recipient_email'])))->first();
            if (! $recipient) {
                throw ValidationException::withMessages(['recipient_email' => 'No account found for this email.']);
            }
            $participants[] = $recipient->id;
        }
        if (in_array($user->role, ['admin', 'sorting_center'], true) && count(array_unique($participants)) < 2) {
            throw ValidationException::withMessages(['recipient_email' => 'Enter a recipient email or a parcel order number.']);
        }
        $path = $request->hasFile('attachment') ? $request->file('attachment')->store('support-evidence', 'local') : null;
        try {
            $case = DB::transaction(function () use ($request, $data, $participants, $path) {
                $case = SupportCase::query()->create(['opened_by' => $request->user()->id, 'kind' => $data['kind'], 'subject' => $data['subject'], 'seller_order_id' => $data['seller_order_id'] ?? null]);
                $case->participants()->attach(array_unique($participants));
                $case->messages()->create(['user_id' => $request->user()->id, 'body' => $data['body'], 'attachment_path' => $path, 'attachment_name' => $path ? 'evidence.'.strtolower($request->file('attachment')->extension()) : null]);

                return $case;
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        if ($request->boolean('_modal')) {
            return back()->with('status', 'Conversation opened. Open it from your inbox to view replies.');
        }

        return to_route('support.show', $case)->with('status', 'Conversation opened.');
    }

    public function show(Request $request, SupportCase $case)
    {
        Gate::authorize('view', $case);
        if ($request->user()->role === 'admin') {
            DB::table('support_case_reads')->updateOrInsert(['support_case_id' => $case->id, 'user_id' => $request->user()->id], ['read_at' => now(), 'last_read_message_id' => $case->messages()->max('id')]);
        }

        $data = ['case' => $case->load('participants:id,name,role'), 'messages' => $case->messages()->with('author:id,name,role')->latest('id')->paginate(30)];

        return $request->expectsJson() ? response()->json($data)->header('Cache-Control', 'private, no-store') : Inertia::render('support/show', $data);
    }

    public function message(Request $request, SupportCase $case)
    {
        Gate::authorize('view', $case);
        $data = $request->validate(['body' => 'required|string|max:5000', 'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $path = $request->hasFile('attachment') ? $request->file('attachment')->store('support-evidence', 'local') : null;
        try {
            DB::transaction(function () use ($request, $case, $data, $path) {
                $case = SupportCase::query()->whereKey($case->id)->lockForUpdate()->firstOrFail();
                abort_if($case->status === 'resolved', 409, 'Reopen this case before sending a message.');
                $case->messages()->create(['user_id' => $request->user()->id, 'body' => $data['body'], 'attachment_path' => $path, 'attachment_name' => $path ? 'evidence.'.strtolower($request->file('attachment')->extension()) : null]);
                $case->touch();
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return back()->with('status', 'Message sent.');
    }

    public function update(Request $request, SupportCase $case)
    {
        abort_unless($request->user()->role === 'admin', 403);
        $data = $request->validate(['status' => ['required', Rule::in(['open', 'in_review', 'resolved'])], 'resolution' => 'required_if:status,resolved|nullable|string|max:5000']);
        DB::transaction(function () use ($request, $case, $data) {
            $case = SupportCase::query()->whereKey($case->id)->lockForUpdate()->firstOrFail();
            $case->update($data + ['resolved_by' => $data['status'] === 'resolved' ? $request->user()->id : null, 'resolved_at' => $data['status'] === 'resolved' ? now() : null]);
            app(AuditLogger::class)->record(['actor_id' => $request->user()->id, 'subject_type' => 'support_case', 'subject_id' => $case->id, 'action' => $data['status'], 'changes' => json_encode($data), 'occurred_at' => now()]);
        });

        return back()->with('status', 'Case updated.');
    }

    public function evidence(SupportCase $case, SupportCaseMessage $message)
    {
        Gate::authorize('view', $case);
        abort_unless($message->support_case_id === $case->id && $message->attachment_path, 404);

        return Storage::disk('local')->download($message->attachment_path, $message->attachment_name);
    }
}
