<?php

namespace App\Services\Notifications;

use App\Models\Delivery;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\RiderPayment;
use App\Models\SellerOrder;
use App\Models\StoreVoucher;
use App\Models\SupportCase;
use App\Models\User;
use App\Models\WeeklyRiderPayment;
use App\Notifications\WorkflowNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class NotificationInbox
{
    private array $records = [];

    private ?array $accessibleCenters = null;

    private array $cashStatuses = [];

    /** Load only the current history page; link checks do not grow queries per row. */
    public function prepare(Collection $notifications): void
    {
        $types = [
            'order' => [SellerOrder::class, ['order', 'store']],
            'delivery' => [Delivery::class, ['sellerOrder.order', 'sellerOrder.store']],
            'return' => [ParcelReturn::class, ['sellerOrder.store', 'sellerOrder.delivery']],
            'application' => [RegistrationApplication::class, []],
            'product' => [Product::class, ['store']],
            'support' => [SupportCase::class, []],
            'settlement' => [SellerOrder::class, ['order', 'store']],
            'platform_handover' => [SellerOrder::class, ['logisticsRemittance']],
        ];
        foreach ($types as $kind => [$class, $relations]) {
            $ids = $notifications->filter(fn ($notification) => $notification->data['kind'] === $kind)->map(fn ($notification) => $notification->data['record'])->unique();
            if ($ids->isEmpty()) {
                continue;
            }
            $records = $class::with($relations)->whereKey($ids)->get()->keyBy('id');
            foreach ($ids as $id) {
                $this->records[$class.':'.$id] = $records->get($id);
            }
            if ($kind === 'delivery') {
                $statuses = DB::table('cod_collections')->whereIn('delivery_id', $ids)->pluck('status', 'delivery_id');
                foreach ($records as $delivery) {
                    $this->records[SellerOrder::class.':'.$delivery->seller_order_id] = $delivery->sellerOrder;
                    $this->cashStatuses[$delivery->id] = $statuses->get($delivery->id);
                }
            }
        }
    }

    private function related(string $class, int $id, array $relations = []): ?Model
    {
        $key = $class.':'.$id;
        if (! array_key_exists($key, $this->records)) {
            $this->records[$key] = $class::with($relations)->find($id);
        }

        return $this->records[$key];
    }

    /** Database-only delivery participates in the business transaction: rollback removes both. */
    public function send(?int $recipient, string $event, string $key, string $title, string $message, string $kind, int $record, bool $action = false): void
    {
        $user = $recipient ? User::find($recipient) : null;
        if (! $user) {
            return;
        }
        $hash = md5($user->id.'|'.$event.'|'.$key);
        $id = substr($hash, 0, 8).'-'.substr($hash, 8, 4).'-'.substr($hash, 12, 4).'-'.substr($hash, 16, 4).'-'.substr($hash, 20);
        $payload = compact('event', 'title', 'message', 'kind', 'record', 'action');
        $notification = new WorkflowNotification($payload);
        // A deterministic primary key handles repeated event delivery, including concurrent retries.
        $user->notifications()->firstOrCreate(['id' => $id], [
            'type' => WorkflowNotification::class,
            'category' => $action ? 'action_required' : 'updates',
            'data' => $notification->toDatabase($user),
        ]);
    }

    public function admins(string $permission): array
    {
        return User::where('role', 'admin')->get()->filter(fn ($user) => $user->canAdmin($permission))->pluck('id')->all();
    }

    public function logistics(?int $center): array
    {
        return $center ? User::where('role', 'logistics')->where('status', 'approved')->whereNotNull('email_verified_at')
            ->whereHas('logisticsCenters', fn ($q) => $q->operational()->where('logistics_centers.id', $center))->pluck('id')->all() : [];
    }

    public function present(DatabaseNotification $notification, User $user): array
    {
        $data = $notification->data;
        $target = $this->target($data, $user);
        $requiresAction = $data['action'] && ($target['action'] ?? false);

        return ['id' => $notification->id, 'event' => $data['event'], 'title' => $data['title'], 'message' => $data['message'],
            'kind' => $data['kind'], 'category' => $notification->category, 'priority' => $requiresAction ? 'high' : 'medium', 'requires_action' => $requiresAction,
            'created_at' => $notification->created_at->toIso8601String(), 'read_at' => $notification->read_at?->toIso8601String(),
            'related' => ['type' => $data['kind'], 'id' => $data['record']], 'url' => $target['url'] ?? null,
            'action_label' => $target ? ($requiresAction ? $target['label'] : 'View update') : null];
    }

    /** Resolve links from current ownership and state, never from a client-supplied URL. */
    public function target(array $data, User $user): ?array
    {
        if (! $user->canOperate()) {
            return null;
        }
        $id = $data['record'];
        $this->accessibleCenters ??= $user->role === 'logistics' ? $user->logisticsCenters()->operational()->pluck('logistics_centers.id')->all() : [];
        $action = false;
        switch ($data['kind']) {
            case 'platform_handover':
                $parcel = $this->related(SellerOrder::class, $id, ['logisticsRemittance']);
                if (! $parcel || ! $user->canAdmin('finance')) {
                    return null;
                }
                $url = '/logistics-settlements';
                $label = 'Confirm Logistics cash receipt';
                $action = ! $parcel->logisticsRemittance;
                break;
            case 'order':
                $parcel = $this->related(SellerOrder::class, $id, ['order', 'store']);
                if (! $parcel || ! (($user->role === 'buyer' && $parcel->order?->buyer_id === $user->id) || ($user->role === 'seller' && $parcel->store?->user_id === $user->id))) {
                    return null;
                }
                $url = '/orders?search='.$parcel->id;
                $label = 'View order';
                $action = $user->role === 'seller' && $parcel->status === 'pending';
                break;
            case 'delivery':
                $delivery = $this->related(Delivery::class, $id, ['sellerOrder.order', 'sellerOrder.store']);
                if (! $delivery) {
                    return null;
                }
                if (in_array($user->role, ['buyer', 'seller'], true)) {
                    return $this->target([...$data, 'kind' => 'order', 'record' => $delivery->seller_order_id], $user);
                }
                $allowed = ($user->role === 'rider' && $delivery->rider_id === $user->id && $delivery->logistics_center_id === $user->logistics_center_id)
                    || ($user->role === 'logistics' && in_array($delivery->logistics_center_id, $this->accessibleCenters, true))
                    || $user->canAdmin('operations');
                if (! $allowed) {
                    return null;
                }
                $url = '/deliveries?search='.urlencode($delivery->tracking_reference);
                $label = $user->role === 'rider' ? 'View assignment' : 'Review parcel';
                $action = $delivery->status !== 'delivered';
                if (str_starts_with($data['event'], 'cod.') || $data['event'] === 'logistics.delivered') {
                    if (! array_key_exists($delivery->id, $this->cashStatuses)) {
                        $this->cashStatuses[$delivery->id] = DB::table('cod_collections')->where('delivery_id', $delivery->id)->value('status');
                    }
                    $cashStatus = $this->cashStatuses[$delivery->id];
                    $action = $cashStatus !== null && $cashStatus !== 'reconciled';
                }
                break;
            case 'return':
                $return = $this->related(ParcelReturn::class, $id, ['sellerOrder.store', 'sellerOrder.delivery']);
                if (! $return) {
                    return null;
                }
                $allowed = ($user->role === 'buyer' && $return->buyer_id === $user->id)
                    || ($user->role === 'seller' && $return->sellerOrder?->store?->user_id === $user->id)
                    || ($user->role === 'rider' && $return->rider_id === $user->id)
                    || ($user->role === 'logistics' && in_array($return->sellerOrder?->delivery?->logistics_center_id, $this->accessibleCenters, true))
                    || $user->canAdmin('disputes') || $user->canAdmin('finance');
                if (! $allowed) {
                    return null;
                }
                $url = '/returns?parcel='.$return->seller_order_id;
                $label = 'Review return';
                $action = ($user->canAdmin('disputes') && in_array($return->refund_status, ['pending', 'approved_uncredited'], true))
                    || ($user->role === 'logistics' && $return->task?->status === 'approved')
                    || ($user->role === 'rider' && $return->task?->status === 'assigned')
                    || ($user->role === 'seller' && $return->task?->status === 'seller_delivered');
                break;
            case 'application':
                $application = $this->related(RegistrationApplication::class, $id);
                if (! $application || ! $user->canAdmin('registrations')) {
                    return null;
                }
                $url = '/reviews/'.$id;
                $label = 'Review application';
                $action = $application->status === 'submitted';
                break;
            case 'product':
                $product = $this->related(Product::class, $id, ['store']);
                if (! $product || $user->role !== 'seller' || $product->store?->user_id !== $user->id) {
                    return null;
                }
                $url = '/inventory';
                $label = 'Review stock';
                $action = $product->stock <= 5;
                break;
            case 'support':
                $case = $this->related(SupportCase::class, $id);
                if (! $case || ! $user->canAdmin('messages')) {
                    return null;
                }
                $url = '/support/'.$id;
                $label = 'Review case';
                $action = $case->status !== 'resolved';
                break;
            case 'settlement':
                $parcel = $this->related(SellerOrder::class, $id, ['store']);
                if (! $parcel || $user->role !== 'seller' || $parcel->store?->user_id !== $user->id) {
                    return null;
                }
                $url = '/settlements';
                $label = 'View settlement';
                break;
            case 'parcel_compensation':
                $payment = RiderPayment::find($id);
                if (! $payment || $user->role !== 'rider' || $payment->rider_id !== $user->id) {
                    return null;
                }
                $url = '/rider-payments';
                $label = 'View payment';
                break;
            case 'voucher':
                $voucher = StoreVoucher::find($id);
                if (! $voucher || $user->role !== 'seller' || $voucher->store_id !== $user->store?->id) {
                    return null;
                }
                $url = '/seller/vouchers';
                $label = 'View voucher';
                break;
            case 'wallet':
                if ($user->role !== 'buyer' || $id !== $user->id) {
                    return null;
                }
                $url = '/wallet';
                $label = 'View Lubos Coins';
                break;
            case 'compensation':
                $payment = WeeklyRiderPayment::find($id);
                if (! $payment || $user->role !== 'rider' || $payment->rider_id !== $user->id) {
                    return null;
                }
                $url = '/rider-payments';
                $label = 'View payment';
                break;
            case 'account':
                if ($id !== $user->id) {
                    return null;
                }
                $url = '/settings/account';
                $label = 'View account';
                break;
            default:
                return null;
        }

        return compact('url', 'label', 'action');
    }
}
