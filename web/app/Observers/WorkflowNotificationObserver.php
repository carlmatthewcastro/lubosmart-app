<?php

namespace App\Observers;

use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\SupportCase;
use App\Models\User;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class WorkflowNotificationObserver
{
    public function __construct(private NotificationInbox $inbox) {}

    public function created(Model $model): void
    {
        $this->record($model, true);
    }

    public function updated(Model $model): void
    {
        $this->record($model, false);
    }

    private function record(Model $model, bool $created): void
    {
        $key = $created ? $model->getMorphClass().':'.$model->id : (string) Str::uuid();
        $send = fn ($user, $event, $title, $message, $kind, $action = false) => $this->inbox->send($user, $event, $key, $title, $message, $kind, $model->id, $action);

        if ($model instanceof SellerOrder) {
            $buyer = $model->order?->buyer_id;
            $seller = $model->store?->user_id;
            if ($created) {
                $send($buyer, 'order.placed', 'Order placed', 'Order #'.$model->order_id.' has been placed. Pay cash upon delivery.', 'order');
                $send($seller, 'order.new', 'New order received', 'Parcel #'.$model->id.' requires preparation.', 'order', true);
            } elseif ($model->wasChanged('status')) {
                $titles = ['processing' => 'Seller is preparing your order', 'shipped' => 'Parcel ready for pickup', 'cancelled' => 'Order cancelled'];
                if (isset($titles[$model->status])) {
                    $send($buyer, 'order.'.$model->status, $titles[$model->status], 'Parcel #'.$model->id.': '.$titles[$model->status].'.', 'order');
                    if ($model->status === 'cancelled') {
                        $send($seller, 'order.cancelled', 'Buyer cancelled an order', 'Parcel #'.$model->id.' was cancelled.', 'order');
                    }
                    if ($model->status === 'shipped') {
                        foreach ($this->inbox->logistics($model->delivery?->logistics_center_id) as $operator) {
                            $this->inbox->send($operator, 'pickup.pending', $key, 'Pickup requires assignment', 'Parcel #'.$model->id.' is ready for pickup.', 'delivery', $model->delivery->id, true);
                        }
                    }
                }
            }
        } elseif ($model instanceof ParcelReturn) {
            if (! $created && ! $model->wasChanged(['status', 'rider_id'])) {
                return;
            }
            $state = $model->status ?? 'requested';
            $title = 'Return '.str_replace('_', ' ', $state);
            $send($model->buyer_id, 'return.'.$state, $title, 'Your return for parcel #'.$model->seller_order_id.' is '.$state.'.', 'return');
            $send($model->sellerOrder?->store?->user_id, 'return.'.$state, $title, 'Return for parcel #'.$model->seller_order_id.' is '.$state.'.', 'return', $state === 'collected');
            if ($created) {
                foreach ($this->inbox->admins('disputes') as $admin) {
                    $send($admin, 'return.review', 'Return requires review', 'Review the return for parcel #'.$model->seller_order_id.'.', 'return', true);
                }
            }
            if ($state === 'approved') {
                foreach ($this->inbox->logistics($model->sellerOrder?->delivery?->logistics_center_id) as $operator) {
                    $send($operator, 'return.assign', 'Return pickup requires assignment', 'Arrange return transport for parcel #'.$model->seller_order_id.'.', 'return', true);
                }
            }
            if (in_array($state, ['assigned', 'seller_assigned'], true)) {
                $send($model->rider_id, 'return.assignment', $state === 'seller_assigned' ? 'Seller return handover assigned' : 'Return pickup assigned',
                    $state === 'seller_assigned' ? 'Collect parcel #'.$model->seller_order_id.' from the facility and return it to the seller.' : 'Collect the approved return for parcel #'.$model->seller_order_id.'.', 'return', true);
                if ($model->wasChanged('rider_id') && $model->getOriginal('rider_id')) {
                    $send($model->getOriginal('rider_id'), 'return.reassigned', 'Return assignment removed', 'This return has been reassigned.', 'return');
                }
            }
            if ($state === 'received') {
                foreach ($this->inbox->logistics($model->sellerOrder?->delivery?->logistics_center_id) as $operator) {
                    $send($operator, 'return.received', 'Returned parcel received', 'The seller confirmed receipt of parcel #'.$model->seller_order_id.'.', 'return');
                }
            }
        } elseif ($model instanceof RegistrationApplication) {
            if (! $created && ! $model->wasChanged('status')) {
                return;
            }
            if ($model->status === 'submitted' && in_array($model->requested_role, ['buyer', 'seller', 'logistics'], true)) {
                foreach ($this->inbox->admins('registrations') as $admin) {
                    $send($admin, 'application.submitted', 'Application requires review', 'A '.$model->requested_role.' application is awaiting review.', 'application', true);
                }
            }
        } elseif ($model instanceof User) {
            if (! $created && $model->wasChanged('status')) {
                $this->inbox->send($model->id, 'account.'.$model->status, $key, 'Account status updated', 'Your account status is '.$model->status.'.', 'account', $model->id);
            }
            if (! $created && $model->wasChanged('email_verified_at') && $model->email_verified_at) {
                $send($model->id, 'account.registered', 'Welcome to LubosMart', 'Your email has been verified. Your account follows the existing approval process.', 'account');
            }
            if (! $created && $model->wasChanged(['password', 'email'])) {
                $send($model->id, 'account.security', 'Account security updated', 'Your sign-in details were changed. Review your account security settings if this was unexpected.', 'account');
            }
        } elseif ($model instanceof SellerPayout && $created) {
            $this->inbox->send($model->sellerOrder?->store?->user_id, 'settlement.recorded', $key, 'Seller payout recorded', 'A manual payout of PHP '.number_format($model->amount_cents / 100, 2).' was recorded for parcel #'.$model->seller_order_id.'.', 'settlement', $model->seller_order_id);
        } elseif ($model instanceof Product && ! $created && $model->wasChanged('stock')) {
            $this->stock($model, (int) $model->getOriginal('stock'), $key);
        } elseif ($model instanceof SupportCase && $created && $model->kind === 'complaint') {
            foreach ($this->inbox->admins('messages') as $admin) {
                $send($admin, 'support.complaint', 'Complaint requires review', 'A new complaint has been submitted for review.', 'support', true);
            }
        }
    }

    public function stock(Product $product, int $before, string $key): void
    {
        if (($product->stock === 0 && $before > 0) || ($product->stock > 0 && $product->stock <= 5 && $before > 5)) {
            $empty = $product->stock === 0;
            $this->inbox->send($product->store?->user_id, $empty ? 'stock.empty' : 'stock.low', $key,
                $empty ? 'Product out of stock' : 'Product stock running low', $product->name.' has '.$product->stock.' units remaining.', 'product', $product->id, true);
        }
    }
}
