<?php

namespace App\Http\Controllers;

use App\Models\SellerOrder;
use App\Models\SupportCase;
use App\Models\SupportCaseMessage;
use App\Models\User;
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
        if ($request->user()->role !== 'admin') {
            $query->whereHas('participants', fn ($q) => $q->where('users.id', $request->user()->id));
        }
        $query->when($filters['kind'] ?? null, fn ($q, $kind) => $q->where('kind', $kind));
        $query->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));

        return Inertia::render('support/index', ['cases' => $query->latest('updated_at')->orderByDesc('id')->paginate(15)->withQueryString(), 'filters' => $filters]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['kind' => ['required', Rule::in(['complaint', 'message'])], 'subject' => 'required|string|max:160', 'body' => 'required|string|max:5000', 'seller_order_id' => 'nullable|integer|exists:seller_orders,id', 'recipient_email' => 'nullable|email|max:160', 'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $user = $request->user();
        $participants = [$user->id];
        if (! empty($data['seller_order_id'])) {
            $order = SellerOrder::query()->with(['order', 'store', 'delivery'])->findOrFail($data['seller_order_id']);
            $orderUsers = array_filter([$order->order->buyer_id, $order->store->user_id, $order->delivery?->rider_id]);
            abort_unless($user->role === 'admin' || in_array($user->id, $orderUsers, true), 403);
            $participants = array_merge($participants, $orderUsers);
        }
        if (! empty($data['recipient_email'])) {
            abort_unless($user->role === 'admin', 403);
            $recipient = User::query()->where('email', strtolower(trim($data['recipient_email'])))->where('role', '!=', 'admin')->first();
            if (! $recipient) {
                throw ValidationException::withMessages(['recipient_email' => 'No account found for this email.']);
            }
            $participants[] = $recipient->id;
        }
        if ($user->role === 'admin' && count(array_unique($participants)) < 2) {
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

        return to_route('support.show', $case)->with('status', 'Conversation opened.');
    }

    public function show(Request $request, SupportCase $case)
    {
        Gate::authorize('view', $case);
        if ($request->user()->role === 'admin') {
            DB::table('support_cases')->where('id', $case->id)->update(['last_admin_seen_at' => now(), 'last_admin_seen_message_id' => $case->messages()->max('id')]);
        }

        return Inertia::render('support/show', ['case' => $case->load('participants:id,name,role'), 'messages' => $case->messages()->with('author:id,name,role')->latest('id')->paginate(30)]);
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
            DB::table('audit_events')->insert(['actor_id' => $request->user()->id, 'subject_type' => 'support_case', 'subject_id' => $case->id, 'action' => $data['status'], 'changes' => json_encode($data), 'occurred_at' => now()]);
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
