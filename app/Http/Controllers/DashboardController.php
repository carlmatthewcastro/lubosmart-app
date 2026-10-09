<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AdminWorkspace;
use App\Services\Admin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === null) {
            return to_route('role.choose');
        }
        if (! $user->hasVerifiedEmail()) {
            return to_route('verification.notice');
        }
        if ($user->status !== 'approved') {
            return to_route($user->onboardingRoute());
        }

        return to_route('dashboard.role', ['role' => $user->role]);
    }

    public function show(Request $request, string $role): Response
    {
        $user = $request->user();
        abort_unless($user->role === $role, 403);
        $stats = [];
        $records = collect();
        $adminOverview = null;
        if ($role === 'buyer') {
            $orders = Order::query()->where('buyer_id', $user->id);
            $stats = ['Orders' => (clone $orders)->count(), 'In progress' => (clone $orders)->whereIn('status', ['pending', 'processing'])->count(), 'Completed' => (clone $orders)->where('status', 'completed')->count()];
            $records = $orders->latest('id')->limit(10)->get(['id', 'status', 'total'])->map(fn ($row) => ['id' => $row->id, 'label' => 'Order #'.$row->id, 'status' => $row->status, 'detail' => 'PHP '.$row->total]);
        } elseif ($role === 'seller') {
            $store = $user->store;
            $orders = SellerOrder::query()->where('store_id', $store?->id);
            $stats = ['Products' => Product::query()->where('store_id', $store?->id)->count(), 'Seller orders' => (clone $orders)->count(), 'Completed' => (clone $orders)->where('status', 'completed')->count()];
            $records = $orders->latest('id')->limit(10)->get(['id', 'status', 'subtotal'])->map(fn ($row) => ['id' => $row->id, 'label' => 'Seller order #'.$row->id, 'status' => $row->status, 'detail' => 'PHP '.$row->subtotal]);
        } elseif ($role === 'courier' || $role === 'sorting_center') {
            $deliveries = Delivery::query();
            if ($role === 'courier') {
                $deliveries->where('rider_id', $user->id);
            } else {
                $deliveries->whereIn('sorting_center_id', $user->sortingCenters()->operational()->pluck('sorting_centers.id'));
            }
            $stats = ['Parcels' => (clone $deliveries)->count(), 'For pickup' => (clone $deliveries)->where('status', 'assigned')->count(), 'Delivered' => (clone $deliveries)->where('status', 'delivered')->count()];
            $records = $deliveries->latest('id')->limit(10)->get(['id', 'status'])->map(fn ($row) => ['id' => $row->id, 'label' => 'Delivery #'.$row->id, 'status' => $row->status, 'detail' => 'Assigned parcel']);
        } else {
            $workspace = app(AdminWorkspace::class)->data($user);
            $stats = [];
            if ($user->canAdmin('accounts')) {
                $stats['Accounts'] = User::query()->nonAdmin()->count();
            }
            if ($user->canAdmin('registrations')) {
                $stats['Pending review'] = $workspace['badges']['registrations'];
            }
            if ($user->canAdmin('compliance')) {
                $stats['Approved stores'] = Store::query()->where('status', 'approved')->count();
            }
            $adminOverview = [
                'applications' => $user->canAdmin('registrations') ? RegistrationApplication::query()->where('status', 'submitted')->with('user:id,name')->orderBy('submitted_at')->orderBy('id')->limit(5)->get(['id', 'user_id', 'requested_role', 'submitted_at'])->map(fn ($application) => [
                    'id' => $application->id, 'name' => $application->user->name, 'role' => $application->requested_role, 'submittedAt' => $application->submitted_at?->toIso8601String(),
                ]) : [],
                'openComplaints' => $workspace['badges']['disputes'] ?? null,
                'unreadConversations' => $workspace['badges']['messages'] ?? null,
                'blockedListings' => $workspace['badges']['compliance'] ?? null,
            ];
            $records = app(AuditLogger::class)->scope(DB::table('audit_events'), $user)->orderByDesc('id')->limit(10)->get(['id', 'action', 'subject_type', 'subject_id', 'occurred_at'])->map(fn ($row) => [
                'id' => $row->id,
                'label' => match ($row->subject_type) {
                    'registration_application' => 'Application #'.$row->subject_id,
                    'user' => 'Account #'.$row->subject_id,
                    'commerce_settings' => 'Commerce settings',
                    default => ucfirst(str_replace('_', ' ', $row->subject_type)),
                },
                'status' => $row->action,
                'detail' => ucfirst(str_replace('_', ' ', $row->action)),
                'occurredAt' => $row->occurred_at,
            ]);
        }

        return Inertia::render($role === 'admin' ? 'admin/dashboard' : 'workspace/dashboard', ['role' => $role, 'stats' => $stats, 'records' => $records, 'storeStatus' => $user->store?->status, 'adminOverview' => $adminOverview]);
    }
}
