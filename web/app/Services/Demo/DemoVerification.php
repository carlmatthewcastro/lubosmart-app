<?php

namespace App\Services\Demo;

use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use App\Services\ParcelFinance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class DemoVerification
{
    public function __construct(private DemoFixtures $fixtures) {}

    public function snapshot(): array
    {
        $result = [];
        foreach (['users', 'user_profiles', 'rider_profiles', 'registration_applications', 'registration_documents', 'addresses', 'stores', 'products', 'product_variants', 'carts', 'cart_items',
            'commerce_settings', 'logistics_centers', 'logistics_center_user', 'service_areas', 'shipping_rates', 'rider_service_area', 'account_service_areas'] as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $result[$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
        }

        return $result;
    }

    public function preserve(array $before, bool $allowDemoInventory = false): void
    {
        foreach ($before as $table => $rows) {
            foreach ($rows as $row) {
                $query = DB::table($table);
                foreach (isset($row['id']) ? ['id' => $row['id']] : $row as $field => $value) {
                    $query->where($field, $value);
                }
                $after = $query->first();
                $comparison = $after ? (array) $after : null;
                // Newly added scenarios may consume owned demo stock, but never old catalog stock.
                $ownedInventory = $allowDemoInventory && (($table === 'products' && in_array($row['id'], $this->fixtures->ids(Product::class)))
                    || ($table === 'product_variants' && in_array($row['product_id'], $this->fixtures->ids(Product::class))));
                if ($ownedInventory && $comparison) {
                    unset($comparison['stock'], $comparison['updated_at'], $row['stock'], $row['updated_at']);
                }
                // Primary buyer wallet changes belong to wallet tables, never user identity rows.
                if (! $after || $comparison !== $row) {
                    throw new RuntimeException('Existing '.$table.' record changed; seeding transaction aborted.');
                }
            }
        }
    }

    public function reconcile(): array
    {
        $orders = Order::query()->whereIn('id', $this->fixtures->ids(Order::class))->with('sellerOrders.items', 'sellerOrders.delivery')->get();
        foreach ($orders as $order) {
            $subtotals = $shipping = 0;
            foreach ($order->sellerOrders as $parcel) {
                $gross = $parcel->items->sum(fn ($item) => ParcelFinance::cents($item->price_each) * $item->quantity);
                $net = ParcelFinance::cents($parcel->subtotal);
                $fee = ParcelFinance::cents($parcel->shipping_fee);
                if ($gross - ParcelFinance::cents($parcel->discount_amount ?? '0') !== $net
                    || $fee !== ($parcel->shipping_quote['fee_cents'] ?? null)
                    || $net - $parcel->coins_redeemed_cents + $fee !== $parcel->cod_due_cents) {
                    throw new RuntimeException('Demo order calculation mismatch: '.$order->id);
                }
                if ($parcel->delivery?->status === 'delivered') {
                    $commission = ParcelFinance::commission($net, $parcel->commission_basis_points);
                    $cash = DB::table('cod_collections')->where('delivery_id', $parcel->delivery->id)->first();
                    if (! $cash || ParcelFinance::cents((string) $cash->amount) !== ParcelFinance::expected($parcel)
                        || ParcelFinance::cents($parcel->commission_amount) !== $commission || ParcelFinance::cents($parcel->seller_proceeds) !== $net - $commission) {
                        throw new RuntimeException('Demo COD/commission mismatch: '.$parcel->id);
                    }
                    if ($parcel->logisticsRemittance && $parcel->logisticsRemittance->amount_cents !== ParcelFinance::merchandiseCash($parcel)) {
                        throw new RuntimeException('Demo product-cash remittance mismatch: '.$parcel->id);
                    }
                    if ($parcel->payout && $parcel->payout->amount_cents > ParcelFinance::cents($parcel->seller_proceeds)) {
                        throw new RuntimeException('Demo settlement exceeds seller proceeds: '.$parcel->id);
                    }
                }
                $subtotals += $net;
                $shipping += $fee;
            }
            if ($subtotals !== ParcelFinance::cents($order->subtotal) || $shipping !== ParcelFinance::cents($order->shipping_total)
                || $subtotals + $shipping !== ParcelFinance::cents($order->total)) {
                throw new RuntimeException('Demo order total mismatch: '.$order->id);
            }
        }
        $buyers = $orders->pluck('buyer_id')->unique();
        foreach (DB::table('buyer_wallets')->whereIn('buyer_id', $buyers)->get() as $wallet) {
            if ((int) $wallet->balance_cents !== (int) DB::table('wallet_transactions')->where('buyer_id', $wallet->buyer_id)->sum('amount_cents')) {
                throw new RuntimeException('Wallet ledger mismatch; existing history needs review.');
            }
        }
        foreach (ParcelReturn::query()->whereIn('id', $this->fixtures->ids(ParcelReturn::class))->where('refund_status', 'credited')->get() as $case) {
            $credits = (int) DB::table('wallet_transactions')->where('parcel_return_id', $case->id)->whereIn('type', ['approved_refund_credit', 'return_restoration'])->sum('amount_cents');
            if ($case->refund_cents !== $case->product_refund_cents + $case->shipping_refund_cents || $credits !== $case->refund_cents) {
                throw new RuntimeException('Demo refund/coin credit mismatch: '.$case->id);
            }
        }

        return ['orders' => $orders->count(), 'products' => count($this->fixtures->ids(Product::class)),
            'additional_accounts' => count($this->fixtures->ids(User::class)), 'returns' => count($this->fixtures->ids(ParcelReturn::class)),
            'reviews' => DB::table('demo_fixtures')->where('record_type', ProductReview::class)->count(), 'order_finances_and_wallets' => 'reconciled'];
    }
}
