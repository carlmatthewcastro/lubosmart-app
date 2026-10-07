<?php

namespace App\Actions\Checkout;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CommerceSetting;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateOrderFromCart
{
    public function handle(User $buyer, int $addressId): Order
    {
        return DB::transaction(function () use ($buyer, $addressId): Order {
            $buyer = User::query()
                ->whereKey($buyer->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($buyer->role !== 'buyer' || $buyer->status !== 'active' || ! $buyer->hasVerifiedEmail()) {
                throw new AuthorizationException('Only verified, active buyer accounts can check out.');
            }

            $cart = Cart::query()
                ->where('user_id', $buyer->id)
                ->lockForUpdate()
                ->first();

            if (! $cart) {
                throw ValidationException::withMessages([
                    'cart' => 'Your cart is empty.',
                ]);
            }

            $cartItems = CartItem::query()
                ->where('cart_id', $cart->id)
                ->orderBy('product_id')
                ->lockForUpdate()
                ->get();

            if ($cartItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => 'Your cart is empty.',
                ]);
            }

            if ($cartItems->contains(fn (CartItem $item): bool => $item->quantity < 1)) {
                throw ValidationException::withMessages([
                    'cart' => 'Cart quantities must be greater than zero.',
                ]);
            }

            $address = Address::query()
                ->whereKey($addressId)
                ->where('user_id', $buyer->id)
                ->first();

            if (! $address) {
                throw ValidationException::withMessages([
                    'address_id' => 'Choose one of your saved delivery addresses.',
                ]);
            }

            $products = Product::query()
                ->with('category.parent')
                ->whereIn('id', $cartItems->pluck('product_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $cartItems->count()) {
                throw ValidationException::withMessages([
                    'cart' => 'One or more products in your cart are no longer available.',
                ]);
            }

            $stores = Store::query()
                ->with('user:id,status')
                ->whereIn('id', $products->pluck('store_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($cartItems as $item) {
                /** @var Product $product */
                $product = $products->get($item->product_id);
                $category = $product->category;
                $store = $stores->get($product->store_id);

                if (! $category?->is_active || ($category->parent && ! $category->parent->is_active)) {
                    throw ValidationException::withMessages([
                        'cart' => "The category for \"{$product->name}\" is no longer available.",
                    ]);
                }

                if ($store?->business_category_id !== null
                    && (int) ($category->parent_id ?? $category->id) !== (int) $store->business_category_id) {
                    throw ValidationException::withMessages([
                        'cart' => "The product \"{$product->name}\" is outside its store's registered department.",
                    ]);
                }

                if ($product->status !== 'active' || $product->blocked_at || $stores->get($product->store_id)?->status !== 'approved' || $store?->user?->status !== 'active') {
                    throw ValidationException::withMessages([
                        'cart' => "The product \"{$product->name}\" is no longer available.",
                    ]);
                }

                if ($this->toCents($product->price) < 0) {
                    throw ValidationException::withMessages([
                        'cart' => "The product \"{$product->name}\" has an invalid price.",
                    ]);
                }

                if ($product->stock < $item->quantity) {
                    throw ValidationException::withMessages([
                        'cart' => "There is not enough stock for \"{$product->name}\".",
                    ]);
                }
            }

            $setting = CommerceSetting::query()
                ->whereKey(1)
                ->firstOrFail();

            $itemsByStore = $cartItems->groupBy(
                fn (CartItem $item): int => (int) $products->get($item->product_id)->store_id
            );

            $shippingFeeCents = $this->toCents($setting->shipping_fee_per_seller_order);
            $commissionBasisPoints = $setting->platform_commission_basis_points;

            if ($commissionBasisPoints < 0 || $commissionBasisPoints > 10000) {
                throw ValidationException::withMessages([
                    'commission' => 'The configured commission rate must be between 0% and 100%.',
                ]);
            }

            if ($shippingFeeCents < 0) {
                throw ValidationException::withMessages([
                    'shipping_fee' => 'The configured shipping fee cannot be negative.',
                ]);
            }

            $shippingTotalCents = $shippingFeeCents * $itemsByStore->count();
            $subtotalCents = $cartItems->sum(
                fn (CartItem $item): int => $this->toCents($products->get($item->product_id)->price) * $item->quantity
            );

            $order = Order::query()->create([
                'buyer_id' => $buyer->id,
                'address_id' => $address->id,
                'shipping_recipient_name' => $address->recipient_name,
                'shipping_phone' => $address->phone,
                'shipping_line1' => $address->line1,
                'shipping_line2' => $address->line2,
                'shipping_barangay' => $address->barangay,
                'shipping_city' => $address->city,
                'shipping_province' => $address->province,
                'shipping_region' => $address->region,
                'shipping_zip' => $address->zip,
                'subtotal' => $this->fromCents($subtotalCents),
                'shipping_total' => $this->fromCents($shippingTotalCents),
                'payment_method' => 'cod',
                'total' => $this->fromCents($subtotalCents + $shippingTotalCents),
                'status' => 'pending',
            ]);

            foreach ($itemsByStore as $storeId => $storeItems) {
                $storeSubtotalCents = $storeItems->sum(
                    fn (CartItem $item): int => $this->toCents($products->get($item->product_id)->price) * $item->quantity
                );
                $commissionCents = intdiv($storeSubtotalCents * $commissionBasisPoints + 5000, 10000);

                $sellerOrder = SellerOrder::query()->create([
                    'order_id' => $order->id,
                    'store_id' => $storeId,
                    'subtotal' => $this->fromCents($storeSubtotalCents),
                    'shipping_fee' => $this->fromCents($shippingFeeCents),
                    'commission_basis_points' => $commissionBasisPoints,
                    'commission_amount' => $this->fromCents($commissionCents),
                    'seller_proceeds' => $this->fromCents($storeSubtotalCents - $commissionCents),
                    'status' => 'pending',
                ]);

                foreach ($storeItems as $item) {
                    /** @var Product $product */
                    $product = $products->get($item->product_id);

                    $updatedRows = Product::query()
                        ->whereKey($product->id)
                        ->where('stock', '>=', $item->quantity)
                        ->decrement('stock', $item->quantity);

                    if ($updatedRows !== 1) {
                        throw ValidationException::withMessages([
                            'cart' => "There is not enough stock for \"{$product->name}\".",
                        ]);
                    }

                    OrderItem::query()->create([
                        'seller_order_id' => $sellerOrder->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'quantity' => $item->quantity,
                        'price_each' => $product->price,
                    ]);
                }

                Delivery::query()->create([
                    'seller_order_id' => $sellerOrder->id,
                    'status' => 'unassigned',
                ]);
            }

            CartItem::query()->whereKey($cartItems->modelKeys())->delete();

            return $order->load('sellerOrders.items', 'sellerOrders.delivery');
        }, 3);
    }

    private function toCents(string|int|float $amount): int
    {
        $amount = (string) $amount;
        $negative = str_starts_with($amount, '-');
        $amount = ltrim($amount, '+-');
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '0');

        $cents = ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');

        return $negative ? -$cents : $cents;
    }

    private function fromCents(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
