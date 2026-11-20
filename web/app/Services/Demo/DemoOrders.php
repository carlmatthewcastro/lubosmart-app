<?php

namespace App\Services\Demo;

use App\Actions\Checkout\CreateOrderFromCart;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\LogisticsSettlementController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\ReturnWorkflowController;
use App\Http\Controllers\SellerSettlementController;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\ProductReview;
use App\Models\User;
use App\Services\ParcelFinance;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoOrders
{
    public function __construct(private DemoFixtures $fixtures, private DemoActions $actions) {}

    public function create(array $context, array $accounts, array $products, Carbon $base): array
    {
        $stages = [...array_fill(0, 14, 'delivered'), 'pending', 'pending', 'processing', 'processing', 'ready', 'ready',
            'approved_pickup', 'assigned_pickup', 'assigned_pickup', 'picked_up', 'received', 'received', 'sorted',
            'assigned_delivery', 'assigned_delivery', 'out_for_delivery', 'out_for_delivery', 'cancelled'];
        $orders = [];
        foreach ($stages as $index => $stage) {
            Carbon::setTestNow($base->copy()->addHours($index));
            $orders[] = $this->fixtures->once('order:'.$index.':'.$stage, Order::class, function () use ($context, $accounts, $products, $index, $stage) {
                $storeIndex = $index < 6 || in_array($index, [21, 27, 29], true) ? 0 : $index % 5;
                $buyer = $index < 6 || in_array($index, [21, 27, 29], true) ? $accounts['buyer'][0] : $accounts['buyer'][$index % count($accounts['buyer'])];
                User::query()->whereKey($buyer->id)->lockForUpdate()->firstOrFail();
                $address = Address::query()->where('user_id', $buyer->id)->orderByDesc('is_default')->orderBy('id')->firstOrFail();
                $cart = Cart::query()->where('user_id', $buyer->id)->lockForUpdate()->first();
                $cartExisted = (bool) $cart;
                $cart ??= Cart::query()->create(['user_id' => $buyer->id]);
                $original = DB::table('cart_items')->where('cart_id', $cart->id)->orderBy('id')->get()->map(fn ($item) => (array) $item)->all();
                // The surrounding fixture transaction restores everything if checkout fails.
                DB::table('cart_items')->where('cart_id', $cart->id)->delete();
                $subtotal = 0;
                foreach (array_slice($products[$storeIndex], ($index % 3) * 3, 3) as $product) {
                    $variant = $product->variants()->orderBy('id')->first();
                    CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'product_variant_id' => $variant?->id,
                        'variant_key' => $variant ? (string) $variant->id : 'base', 'quantity' => 2]);
                    $subtotal += ParcelFinance::cents($product->price) * 2;
                }
                $voucher = $index % 3 === 0 && $subtotal >= config('shop-vouchers.templates.starter-10.minimum_cents')
                    ? 'LMDEMO-'.$storeIndex.'-STARTER-10' : null;
                // One-use-per-buyer eligibility remains enforced by the existing discount service.
                if ($voucher && DB::table('seller_orders')->join('orders', 'orders.id', '=', 'seller_orders.order_id')->where('buyer_id', $buyer->id)->where('voucher_code', $voucher)->where('seller_orders.status', '!=', 'cancelled')->exists()) {
                    $voucher = null;
                }
                $order = app(CreateOrderFromCart::class)->handle($buyer, $address->id, $context['center']->id, voucherCode: $voucher);
                if ($original) {
                    DB::table('cart_items')->insert($original);
                }
                if (! $cartExisted) {
                    $cart->delete();
                }
                $parcel = $order->sellerOrders->sole();
                $seller = $parcel->store->user;
                $logistics = $context['accounts']['logistics'];
                $rider = $context['accounts']['rider'];
                if ($stage === 'cancelled') {
                    $this->actions->call($buyer, OrderController::class, 'cancel', parameters: ['order' => $order]);

                    return $order->fresh();
                }
                if ($stage === 'pending') {
                    return $order;
                }
                $this->actions->call($seller, OrderController::class, 'prepare', ['status' => 'processing'], ['sellerOrder' => $parcel]);
                if ($stage === 'processing') {
                    return $order->fresh();
                }
                $this->actions->call($seller, OrderController::class, 'prepare', ['status' => 'shipped'], ['sellerOrder' => $parcel->fresh()]);
                $this->actions->call($seller, OrderController::class, 'printWaybill', ['packages' => 1, 'request_key' => (string) Str::uuid()], ['sellerOrder' => $parcel->fresh()]);
                if ($stage === 'ready') {
                    return $order->fresh();
                }
                $delivery = $parcel->delivery;
                $event = function ($actor, string $action, array $data = [], array $files = []) use ($delivery) {
                    Carbon::setTestNow(now()->addMinute());
                    $this->actions->call($actor, DeliveryController::class, 'update', ['action' => $action,
                        'reason' => 'SYNTHETIC DEMO checkpoint; no real parcel or cash movement.', 'request_key' => (string) Str::uuid(), ...$data],
                        ['delivery' => $delivery->fresh()], $files);
                };
                $event($logistics, 'approve_pickup');
                if ($stage === 'approved_pickup') {
                    return $order->fresh();
                }
                $event($logistics, 'assign', ['service_area_id' => $context['areas']['seller']->id, 'rider_id' => $rider->id]);
                if ($stage === 'assigned_pickup') {
                    return $order->fresh();
                }
                $event($rider, 'picked_up', ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner']);
                if ($stage === 'picked_up') {
                    return $order->fresh();
                }
                $event($logistics, 'receive', ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner', 'receipt_condition' => 'intact']);
                if ($stage === 'received') {
                    return $order->fresh();
                }
                $event($logistics, 'sort', ['service_area_id' => $context['areas']['buyer']->id, 'sorting_bin' => 'DEMO-PAGSANJAN']);
                if ($stage === 'sorted') {
                    return $order->fresh();
                }
                $event($logistics, 'assign', ['service_area_id' => $context['areas']['buyer']->id, 'rider_id' => $rider->id]);
                if ($stage === 'assigned_delivery') {
                    return $order->fresh();
                }
                $event($rider, 'accept_dispatch', ['tracking_reference' => $delivery->tracking_reference, 'capture_method' => 'scanner']);
                $event($rider, 'out_for_delivery');
                if ($stage === 'out_for_delivery') {
                    return $order->fresh();
                }
                $event($rider, 'delivered', ['note' => 'Other / Custom notes', 'recipient_name' => 'DEMO recipient (synthetic)', 'cod_confirmed' => true], ['proof' => $this->proof()]);
                if ($index >= 3) {
                    $event($rider, 'submit_cod_handover');
                }
                if ($index >= 5) {
                    $event($logistics, 'receive_cod');
                    $event($context['accounts']['admin'], 'reconcile_cod');
                }
                if ($index >= 7) {
                    $this->actions->call($logistics, LogisticsSettlementController::class, 'handover', parameters: ['parcel' => $parcel->fresh()]);
                    $this->actions->call($context['accounts']['admin'], LogisticsSettlementController::class, 'store',
                        ['amount' => ParcelFinance::decimal(ParcelFinance::merchandiseCash($parcel->fresh())), 'received_on' => now('Asia/Manila')->toDateString(),
                            'notes' => 'SYNTHETIC DEMO cash receipt; no actual funds transferred.'], ['parcel' => $parcel->fresh()]);
                }
                // Existing Valora balances may reserve proceeds against earlier refunds.
                // Demonstrate paid settlements in new stores without overriding those holds.
                if ($index >= 10 && $storeIndex !== 0) {
                    $this->actions->call($context['accounts']['admin'], SellerSettlementController::class, 'store',
                        ['amount' => $parcel->fresh()->seller_proceeds, 'reference' => 'DEMO-SETTLEMENT-'.$parcel->id,
                            'notes' => 'SYNTHETIC DEMO settlement evidence; no actual payment.'], ['parcel' => $parcel->fresh()]);
                }

                return $order->fresh();
            });
        }

        return $orders;
    }

    public function returnsAndReviews(array $context, array $orders): void
    {
        foreach (['pending', 'approved', 'assigned', 'received', 'rejected', 'seller_assigned'] as $index => $stage) {
            $parcel = $orders[$index + 1]->sellerOrders()->firstOrFail();
            $this->fixtures->once('return:'.$stage, ParcelReturn::class, function () use ($context, $parcel, $stage) {
                $buyer = $parcel->order->buyer;
                $this->actions->call($buyer, ReturnWorkflowController::class, 'store', ['seller_order_id' => $parcel->id,
                    'reason_kind' => 'other', 'reason' => '[DEMO] Synthetic purchase issue for an approved demonstration scenario.',
                    'items' => [['order_item_id' => $parcel->items()->orderBy('id')->value('id'), 'quantity' => 1]]]);
                $case = ParcelReturn::query()->where('seller_order_id', $parcel->id)->latest('id')->firstOrFail();
                $act = function ($actor, string $action, array $data = [], array $files = []) use ($case) {
                    Carbon::setTestNow(now()->addMinute());
                    $this->actions->call($actor, ReturnWorkflowController::class, 'update', ['action' => $action,
                        'reason' => '[DEMO] Synthetic reviewed scenario; no real transport or payment.', ...$data], ['return' => $case->fresh()], $files);
                };
                if ($stage === 'pending') {
                    return $case;
                }
                if ($stage === 'rejected') {
                    $act($context['accounts']['admin'], 'reject');

                    return $case->fresh();
                }
                $item = $case->requestedItems()->firstOrFail();
                $act($context['accounts']['admin'], 'approve', ['responsibility' => 'seller', 'physical_return_required' => true,
                    'return_shipping_responsibility' => 'seller', 'shipping_amount' => '0.00',
                    'items' => [['order_item_id' => $item->order_item_id, 'quantity' => 1, 'amount' => ParcelFinance::decimal($item->requested_cents)]]]);
                if ($stage === 'approved') {
                    return $case->fresh();
                }
                $act($context['accounts']['logistics'], 'assign', ['rider_id' => $context['accounts']['rider']->id]);
                if ($stage === 'assigned') {
                    return $case->fresh();
                }
                $act($context['accounts']['rider'], 'collect', ['recipient_name' => 'DEMO buyer'], ['proof' => $this->proof()]);
                $act($context['accounts']['logistics'], 'facility_receive');
                if ($stage === 'seller_assigned') {
                    return $case->fresh();
                }
                $act($context['accounts']['rider'], 'accept_seller_dispatch');
                $act($context['accounts']['rider'], 'deliver_seller', ['recipient_name' => 'DEMO seller'], ['proof' => $this->proof()]);
                $act($parcel->store->user, 'receive', ['condition' => 'intact', 'restock' => true]);

                return $case->fresh();
            });
        }
        $bodies = ['Packed carefully and arrived in good condition.', 'Good value for our household needs.', 'The selected option matched the listing.', 'Useful item and clear order updates.', 'Satisfied with the purchase and local delivery.', 'Quality was acceptable; packaging could improve.'];
        $count = 0;
        foreach (array_slice($orders, 1, 13) as $order) {
            foreach ($order->sellerOrders()->firstOrFail()->items()->orderBy('id')->get() as $item) {
                if ($count >= 30) {
                    return;
                }
                $reviewIndex = $count++;
                $this->fixtures->once('review:'.$reviewIndex, ProductReview::class, function () use ($item, $order, $bodies, $reviewIndex) {
                    $this->actions->call($order->buyer, ProductReviewController::class, 'store',
                        ['rating' => [5, 4, 5, 4, 5, 3][$reviewIndex % 6], 'body' => '[DEMO REVIEW] '.$bodies[$reviewIndex % 6]], ['item' => $item]);

                    return ProductReview::query()->where('order_item_id', $item->id)->firstOrFail();
                });
            }
        }
    }

    public function coinPurchase(array $context, array $products): Order
    {
        return $this->fixtures->once('order:coin-redemption', Order::class, function () use ($context, $products) {
            $buyer = $context['accounts']['buyer'];
            User::query()->whereKey($buyer->id)->lockForUpdate()->firstOrFail();
            $product = $products[0][5]->fresh();
            $balance = (int) DB::table('buyer_wallets')->where('buyer_id', $buyer->id)->value('balance_cents');
            $cart = Cart::query()->where('user_id', $buyer->id)->lockForUpdate()->first();
            $existed = (bool) $cart;
            $cart ??= Cart::query()->create(['user_id' => $buyer->id]);
            $saved = DB::table('cart_items')->where('cart_id', $cart->id)->get()->map(fn ($row) => (array) $row)->all();
            DB::table('cart_items')->where('cart_id', $cart->id)->delete();
            CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1, 'variant_key' => 'base']);
            $order = app(CreateOrderFromCart::class)->handle($buyer, $context['addresses']['buyer']->id, $context['center']->id,
                coinsToRedeem: min($balance, ParcelFinance::cents($product->price)));
            if ($saved) {
                DB::table('cart_items')->insert($saved);
            }
            if (! $existed) {
                $cart->delete();
            }

            return $order;
        });
    }

    private function proof(): UploadedFile
    {
        return new UploadedFile(database_path('demo/assets/evidence.png'), 'synthetic-demo-evidence.png', 'image/png', null, true);
    }
}
