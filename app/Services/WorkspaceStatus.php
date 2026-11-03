<?php

namespace App\Services;

use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\SupportCase;
use App\Models\User;
use App\Services\Logistics\LogisticsWorkspace;
use App\Services\Rider\RiderWorkspace;
use App\Services\Seller\SellerWorkspace;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class WorkspaceStatus
{
    public function data(User $user): array
    {
        $storeId = $user->role === 'seller' ? $user->store?->id : null;
        $centerIds = $user->role === 'logistics' ? $user->logisticsCenters()->operational()->pluck('logistics_centers.id') : collect();
        $deliveries = Delivery::query()
            ->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id))
            ->when($user->role === 'logistics', fn ($q) => $q->whereIn('logistics_center_id', $centerIds))
            ->when($user->role === 'seller', fn ($q) => $q->whereHas('sellerOrder', fn ($p) => $p->where('store_id', $storeId)))
            ->when($user->role === 'buyer', fn ($q) => $q->whereHas('sellerOrder.order', fn ($p) => $p->where('buyer_id', $user->id)));
        $orders = SellerOrder::query()
            ->when($user->role === 'seller', fn ($q) => $q->where('store_id', $storeId))
            ->when($user->role === 'buyer', fn ($q) => $q->whereHas('order', fn ($o) => $o->where('buyer_id', $user->id)))
            ->when(in_array($user->role, ['rider', 'logistics']), fn ($q) => $q->whereIn('id', (clone $deliveries)->select('seller_order_id')));
        $orderGroups = (clone $orders)->selectRaw('status, COUNT(*) as total, MAX(id) as latest_id, MAX(updated_at) as changed_at')->groupBy('status')->orderBy('status')->get()->toArray();
        $deliveryGroups = (clone $deliveries)->selectRaw('status, exception_status, COUNT(*) as total, MAX(id) as latest_id, MAX(updated_at) as changed_at, COUNT(rider_id) as assigned, SUM(COALESCE(rider_id, 0) * id) as assignment_signature, COUNT(pickup_approved_at) as approved, COUNT(received_at) as received, COUNT(sorted_at) as sorted, COUNT(dispatch_prepared_at) as dispatched, COUNT(dispatch_accepted_at) as accepted')->groupBy('status', 'exception_status')->orderBy('status')->orderBy('exception_status')->get()->toArray();
        $cart = DB::table('cart_items')->whereIn('cart_id', DB::table('carts')->where('user_id', $user->id)->select('id'));
        $cartData = $user->role === 'buyer' ? (clone $cart)->selectRaw('COUNT(*) as line_count, COALESCE(SUM(quantity), 0) as quantity, MAX(id) as latest_id, MAX(updated_at) as changed_at')->first() : null;
        $cases = SupportCase::query()->whereHas('participants', fn ($q) => $q->where('users.id', $user->id));
        $returns = DB::table('parcel_returns')->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id), fn ($q) => $q->whereIn('seller_order_id', (clone $orders)->select('id')));
        $revisions = [
            'orders' => $this->hash([$orderGroups, in_array($user->role, ['buyer', 'seller']) ? $this->aggregate(DB::table('order_messages')->whereIn('seller_order_id', (clone $orders)->select('id'))) : null]),
            'deliveries' => $this->hash($deliveryGroups),
            'cart' => $this->hash($cartData),
            'support' => $this->hash([$this->aggregate((clone $cases)->toBase()), $this->aggregate(DB::table('support_case_messages')->whereIn('support_case_id', (clone $cases)->select('id')))]),
            'returns' => $this->hash($returns->selectRaw('status, COUNT(*) as total, MAX(updated_at) as changed_at, MAX(id) as latest_id')->groupBy('status')->orderBy('status')->get()),
        ];
        if (in_array($user->role, ['buyer', 'seller'])) {
            $products = $user->role === 'seller' ? Product::query()->where('store_id', $storeId) : Product::query()->availableToShoppers();
            $revisions['catalog'] = $this->hash([
                (clone $products)->selectRaw('COUNT(*) as total, MAX(id) as latest_id, MAX(updated_at) as changed_at, SUM(stock) as stock, SUM(price) as prices')->first()?->getAttributes(),
                $this->aggregate(DB::table('product_variants')->whereIn('product_id', (clone $products)->select('id')), 'SUM(stock) as stock, SUM(is_active) as active'),
                $this->aggregate(DB::table('product_reviews')->whereIn('product_id', (clone $products)->select('id')), 'SUM(rating) as ratings, SUM(is_visible) as visible'),
                $this->aggregate(DB::table('store_vouchers')->whereIn('store_id', (clone $products)->select('store_id')), 'SUM(is_active) as active, SUM(amount_cents) as amounts'),
            ]);
        }
        if ($user->role === 'seller') {
            $revisions['finance'] = $this->hash([
                $this->aggregate(DB::table('seller_payouts')->whereIn('seller_order_id', (clone $orders)->select('id'))),
                $this->aggregate(DB::table('seller_costs')->where('store_id', $storeId)),
            ]);
        } elseif (in_array($user->role, ['rider', 'logistics'])) {
            $payments = DB::table('rider_payments')->when($user->role === 'rider', fn ($q) => $q->where('rider_id', $user->id), fn ($q) => $q->whereIn('logistics_center_id', $centerIds));
            $revisions['finance'] = $this->hash([$this->aggregate($payments, 'COUNT(paid_at) as paid'), $this->aggregate(DB::table('cod_collections')->whereIn('delivery_id', (clone $deliveries)->select('id')), 'SUM(received_amount) as received')]);
        }
        $queues = match ($user->role) {
            'seller' => app(SellerWorkspace::class)->queueCounts($user),
            'rider' => app(RiderWorkspace::class)->queueCounts($user),
            'logistics' => app(LogisticsWorkspace::class)->queueCounts($user),
            default => [],
        };
        $revisions['queues'] = $this->hash($queues);
        if ($user->role === 'buyer') {
            $revisions['addresses'] = $this->hash($this->aggregate(DB::table('addresses')->where('user_id', $user->id)));
            $revisions['wishlist'] = $this->hash($this->aggregate(DB::table('product_wishlists')->where('user_id', $user->id)));
            $revisions['shipping'] = $this->hash([
                $this->aggregate(DB::table('shipping_rates')->where('is_active', true)->whereIn('service_area_id', DB::table('service_areas')->where('is_active', true)->whereIn('logistics_center_id', LogisticsCenter::query()->operational()->select('id'))->select('id')), 'SUM(base_fee_cents) as fees, SUM(extra_kg_fee_cents) as extra_fees, SUM(included_weight_grams) as included_weight, SUM(max_weight_grams) as max_weight'),
                DB::table('commerce_settings')->where('id', 1)->value('logistics_shipping_enabled'),
            ]);
        }
        if ($user->role === 'logistics') {
            $managedRiders = User::query()->managedRiders($user)->where('role', 'rider')->whereIn('logistics_center_id', $centerIds);
            $revisions['coverage'] = $this->hash([
                $this->aggregate(DB::table('service_areas')->whereIn('logistics_center_id', $centerIds), 'SUM(is_active) as active'),
                $this->aggregate(DB::table('rider_service_area')->whereIn('rider_id', User::query()->managedRiders($user)->where('role', 'rider')->whereIn('logistics_center_id', $centerIds)->select('id'))->whereIn('service_area_id', DB::table('service_areas')->whereIn('logistics_center_id', $centerIds)->select('id'))),
                $this->aggregate(DB::table('shipping_rates')->whereIn('service_area_id', DB::table('service_areas')->whereIn('logistics_center_id', $centerIds)->select('id')), 'SUM(is_active) as active, SUM(base_fee_cents) as fees'),
                $this->aggregate((clone $managedRiders)->toBase()),
                $this->aggregate(DB::table('registration_applications')->whereIn('user_id', (clone $managedRiders)->select('id'))),
            ]);
        }

        return [
            'cartQuantity' => (int) ($cartData?->quantity ?? 0),
            'queues' => $queues + ['orders' => (int) collect($orderGroups)->whereNotIn('status', ['completed', 'cancelled'])->sum('total'), 'deliveries' => (int) collect($deliveryGroups)->where('status', '!=', 'delivered')->sum('total')],
            'revisions' => $revisions,
        ];
    }

    private function aggregate(Builder $query, ?string $extra = null): ?object
    {
        return $query->selectRaw('COUNT(*) as total, MAX(id) as latest_id, MAX(updated_at) as changed_at'.($extra ? ', '.$extra : ''))->first();
    }

    private function hash(mixed $value): string
    {
        return hash('sha256', json_encode($value, JSON_THROW_ON_ERROR));
    }
}
