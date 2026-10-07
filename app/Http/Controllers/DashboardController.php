<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
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
        if (! $user->hasVerifiedEmail()) {
            return to_route('verification.notice');
        }
        if ($user->status !== 'active') {
            return to_route('application.edit');
        }

        return to_route('dashboard.role', ['role' => $user->role]);
    }

    public function show(Request $request, string $role): Response
    {
        $user = $request->user();
        abort_unless($user->role === $role, 403);
        $stats = [];
        $records = collect();
        if ($role === 'buyer') {
            $orders = Order::query()->where('buyer_id', $user->id);
            $stats = ['Orders' => (clone $orders)->count(), 'In progress' => (clone $orders)->whereIn('status', ['pending', 'processing'])->count(), 'Completed' => (clone $orders)->where('status', 'completed')->count()];
            $records = $orders->latest('id')->limit(10)->get(['id', 'status', 'total'])->map(fn ($row) => ['id' => $row->id, 'label' => 'Order #'.$row->id, 'status' => $row->status, 'detail' => 'PHP '.$row->total]);
        } elseif ($role === 'seller') {
            $store = $user->store;
            $orders = SellerOrder::query()->where('store_id', $store?->id);
            $stats = ['Products' => Product::query()->where('store_id', $store?->id)->count(), 'Seller orders' => (clone $orders)->count(), 'Completed' => (clone $orders)->where('status', 'completed')->count()];
            $records = $orders->latest('id')->limit(10)->get(['id', 'status', 'subtotal'])->map(fn ($row) => ['id' => $row->id, 'label' => 'Seller order #'.$row->id, 'status' => $row->status, 'detail' => 'PHP '.$row->subtotal]);
        } elseif ($role === 'rider' || $role === 'logistics') {
            $deliveries = Delivery::query();
            if ($role === 'rider') {
                $deliveries->where('rider_id', $user->id);
            } else {
                $deliveries->whereIn('sorting_center_id', $user->sortingCenters()->where('is_active', true)->pluck('sorting_centers.id'));
            }
            $stats = ['Parcels' => (clone $deliveries)->count(), 'For pickup' => (clone $deliveries)->where('status', 'assigned')->count(), 'Delivered' => (clone $deliveries)->where('status', 'delivered')->count()];
            $records = $deliveries->latest('id')->limit(10)->get(['id', 'status'])->map(fn ($row) => ['id' => $row->id, 'label' => 'Delivery #'.$row->id, 'status' => $row->status, 'detail' => 'Assigned parcel']);
        } else {
            $stats = ['Accounts' => User::query()->count(), 'Pending review' => RegistrationApplication::query()->where('status', 'submitted')->whereIn('requested_role', ['buyer', 'seller', 'logistics'])->count(), 'Approved stores' => Store::query()->where('status', 'approved')->count()];
            $records = DB::table('audit_events')->orderByDesc('id')->limit(10)->get(['id', 'action', 'subject_type'])->map(fn ($row) => ['id' => $row->id, 'label' => $row->subject_type, 'status' => $row->action, 'detail' => 'Review activity']);
        }

        return Inertia::render('dashboard', ['role' => $role, 'stats' => $stats, 'records' => $records, 'storeStatus' => $user->store?->status]);
    }
}
