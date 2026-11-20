<?php

namespace App\Http\Controllers;

use App\Services\Notifications\NotificationInbox;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class NotificationInboxController extends Controller
{
    public function index(Request $request, NotificationInbox $inbox)
    {
        abort_unless($request->user()->canOperate(), 403);
        $filters = $request->validate([
            'category' => ['nullable', Rule::in(['all', 'action_required', 'updates'])],
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);
        $query = $request->user()->notifications();
        $category = $filters['category'] ?? 'all';
        $notifications = $query->when($category !== 'all', fn ($q) => $q->where('category', $category))
            ->reorder()->orderByDesc('created_at')->orderByDesc('id')->paginate($filters['per_page'] ?? 15)->withQueryString();
        $inbox->prepare($notifications->getCollection());
        $notifications->through(fn ($notification) => $inbox->present($notification, $request->user()));
        $data = ['notifications' => $notifications, 'unread_count' => $request->user()->unreadNotifications()->count(), 'category' => $category];

        return ($request->expectsJson() || $request->routeIs('api.v1.*'))
            ? response()->json($data)->header('Cache-Control', 'private, no-store')
            : Inertia::render('notifications/index', $data);
    }

    public function count(Request $request)
    {
        abort_unless($request->user()->canOperate(), 403);

        return response()->json(['unread_count' => $request->user()->unreadNotifications()->count()])->header('Cache-Control', 'private, no-store');
    }

    public function read(Request $request, string $notification)
    {
        abort_unless($request->user()->canOperate(), 403);
        $owned = $request->user()->notifications()->findOrFail($notification);
        if (! $owned->read_at) {
            $owned->markAsRead();
        }

        return response()->json(['message' => 'Notification marked as read.'])->header('Cache-Control', 'private, no-store');
    }

    public function readAll(Request $request)
    {
        abort_unless($request->user()->canOperate(), 403);
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.'])->header('Cache-Control', 'private, no-store');
    }
}
