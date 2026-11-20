<?php

namespace App\Services\Notifications;

use App\Models\Delivery;
use App\Services\ParcelFinance;
use Illuminate\Support\Facades\DB;

class ParcelNotifications
{
    public function __construct(private NotificationInbox $inbox) {}

    /** Called once after the authorized transition and audit event, inside their transaction. */
    public function record(Delivery $delivery, string $action, string $key, array $before): void
    {
        if (in_array($action, ['hold', 'failed_attempt'], true) && ($before['exception_status'] ?? null) === $delivery->exception_status) {
            return;
        }
        if (in_array($action, ['receive_cod', 'cod_discrepancy'], true) && ($before['cash_changed'] ?? true) === false) {
            return;
        }
        $parcel = $delivery->sellerOrder;
        $buyer = $parcel->order->buyer_id;
        $seller = $parcel->store->user_id;
        $operators = $this->inbox->logistics($delivery->logistics_center_id);
        $send = fn ($user, $event, $title, $message, $required = false) => $this->inbox->send($user, $event, $key, $title, $message, 'delivery', $delivery->id, $required);
        $description = 'Parcel #'.$parcel->id.'.';
        if ($action === 'submit_cod_handover') {
            foreach ($operators as $operator) {
                $send($operator, 'cod.handover_submitted', 'Rider submitted COD handover', $description.' Verify the cash physically received and confirm the receipt.', true);
            }
        }
        if ($action === 'receive' && $delivery->receipt_condition === 'damaged') {
            foreach (array_unique([...$operators, ...$this->inbox->admins('operations')]) as $reviewer) {
                $send($reviewer, 'delivery.damaged', 'Damaged parcel requires investigation', $description.' Review the recorded receipt condition.', true);
            }
        }
        if (in_array($action, ['assign', 'exception_assign'], true)) {
            $leg = $delivery->dispatch_prepared_at ? 'delivery' : 'pickup';
            $send($delivery->rider_id, 'assignment.'.$leg, ucfirst($leg).' assignment', $description.($leg === 'delivery' ? ' Collect COD PHP '.ParcelFinance::decimal(ParcelFinance::expected($parcel)).'.' : ' Parcel ready for pickup.'), true);
            if ($before['rider_id'] && $before['rider_id'] !== $delivery->rider_id) {
                $send($before['rider_id'], 'assignment.removed', 'Assignment removed', 'Your previous assignment for '.$description.' has ended.');
            }
            if ($leg === 'pickup') {
                $send($seller, 'pickup.scheduled', 'Pickup scheduled', 'A pickup rider has been assigned to '.$description);
            }
        }
        $titles = ['picked_up' => 'Parcel picked up', 'receive' => 'Parcel arrived at logistics center', 'out_for_delivery' => 'Order out for delivery', 'delivered' => 'Order delivered', 'failed_attempt' => 'Delivery attempt failed'];
        if (isset($titles[$action])) {
            $send($buyer, 'delivery.'.$action, $titles[$action], $description.' '.$titles[$action].'.');
            if (in_array($action, ['picked_up', 'delivered'], true)) {
                $send($seller, 'delivery.'.$action, $titles[$action], $description.' '.$titles[$action].'.');
            }
        }
        if (in_array($action, ['claim', 'approve_pickup', 'sort', 'failed_attempt', 'hold', 'return_to_center', 'receive_return', 'delivered'], true)) {
            $title = match ($action) {
                'claim', 'approve_pickup' => 'Pickup requires assignment',
                'sort' => 'Delivery requires assignment',
                'delivered' => 'COD collected: cash handover pending',
                default => 'Parcel requires attention',
            };
            foreach ($operators as $operator) {
                $send($operator, 'logistics.'.$action, $title, $description, true);
            }
            if (in_array($action, ['failed_attempt', 'hold', 'return_to_center'], true)) {
                $send($delivery->rider_id, 'exception.'.$action, 'Assignment requires follow-up', $description.' Review the current exception.', true);
            }
        }
        if ($action === 'delivered') {
            $cash = DB::table('cod_collections')->where('delivery_id', $delivery->id)->first();
            $send($buyer, 'cod.recorded', 'COD payment recorded', 'PHP '.number_format((float) $cash->amount, 2).' was recorded for '.$description);
            $send($delivery->rider_id, 'cod.pending', 'COD cash handover pending', 'Hand over PHP '.number_format((float) $cash->amount, 2).' through the existing cash process.', true);
        }
        if (in_array($action, ['receive_cod', 'reconcile_cod', 'cod_discrepancy'], true)) {
            $title = match ($action) {
                'receive_cod' => 'COD cash handover recorded', 'reconcile_cod' => 'COD reconciliation verified', default => 'COD reconciliation discrepancy',
            };
            $send($delivery->rider_id, 'cod.'.$action, $title, $description);
            foreach ($operators as $operator) {
                $send($operator, 'cod.'.$action, $title, $description, $action === 'cod_discrepancy');
            }
            if ($action !== 'reconcile_cod') {
                foreach ($this->inbox->admins('operations') as $admin) {
                    $send($admin, 'cod.'.$action, $title, $description.' Review the cash reconciliation queue.', true);
                }
            }
            if ($action === 'reconcile_cod') {
                $send($seller, 'cod.verified', 'COD reconciliation verified', $description.' Seller settlement follows the existing payout process.');
            }
        }
    }
}
