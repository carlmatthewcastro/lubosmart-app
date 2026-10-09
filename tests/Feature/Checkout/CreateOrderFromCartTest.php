<?php

use App\Actions\Checkout\CreateOrderFromCart;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\MarketplaceCategorySeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

function setupCheckoutCart(array $productDefinitions): array
{
    $buyer = User::factory()->create(['status' => 'approved']);
    $category = Category::query()->create(['name' => 'Test category']);
    $stores = [];
    $products = [];

    foreach ($productDefinitions as $definition) {
        $storeKey = $definition['store'];

        if (! isset($stores[$storeKey])) {
            $seller = User::factory()->create(['role' => 'seller']);
            $stores[$storeKey] = Store::query()->create([
                'user_id' => $seller->id,
                'name' => "Store {$storeKey}",
                'status' => 'approved',
            ]);
        }

        $product = Product::query()->create([
            'store_id' => $stores[$storeKey]->id,
            'category_id' => $category->id,
            'name' => $definition['name'],
            'price' => $definition['price'],
            'stock' => $definition['stock'],
            'status' => $definition['status'] ?? 'active',
        ]);

        $products[$definition['name']] = $product;
    }

    $address = Address::query()->create([
        'user_id' => $buyer->id,
        'label' => 'Home',
        'recipient_name' => 'Buyer Name',
        'phone' => '09171234567',
        'line1' => '10 Test Street',
        'barangay' => 'Barangay Test',
        'city' => 'Manila',
        'province' => 'Metro Manila',
        'region' => 'NCR',
        'zip' => '1000',
    ]);
    $cart = Cart::query()->create(['user_id' => $buyer->id]);

    foreach ($productDefinitions as $definition) {
        CartItem::query()->create([
            'cart_id' => $cart->id,
            'product_id' => $products[$definition['name']]->id,
            'quantity' => $definition['quantity'],
        ]);
    }

    return compact('buyer', 'address', 'cart', 'products', 'stores');
}

it('creates one checkout with seller orders, per-seller deliveries, snapshots, and accurate totals', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'First product', 'price' => '100.00', 'stock' => 8, 'quantity' => 2],
        ['store' => 'A', 'name' => 'Second product', 'price' => '25.00', 'stock' => 4, 'quantity' => 1],
        ['store' => 'B', 'name' => 'Third product', 'price' => '80.00', 'stock' => 3, 'quantity' => 1],
    ]);

    $order = app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id);

    expect($order->subtotal)->toBe('305.00')
        ->and($order->shipping_total)->toBe('100.00')
        ->and($order->total)->toBe('405.00')
        ->and($order->sellerOrders)->toHaveCount(2)
        ->and($order->sellerOrders->pluck('shipping_fee')->unique()->all())->toBe(['50.00'])
        ->and($order->sellerOrders->pluck('items')->flatten())->toHaveCount(3);

    expect($setup['products']['First product']->fresh()->stock)->toBe(6)
        ->and($setup['products']['Second product']->fresh()->stock)->toBe(3)
        ->and($setup['products']['Third product']->fresh()->stock)->toBe(2);

    expect(Delivery::query()->count())->toBe(2)
        ->and(CartItem::query()->where('cart_id', $setup['cart']->id)->count())->toBe(0);

    $setup['address']->update(['line1' => 'Changed after checkout']);

    expect($order->fresh()->shipping_line1)->toBe('10 Test Street');
});

it('uses the current database shipping setting instead of a client-supplied fee', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '40.00', 'stock' => 5, 'quantity' => 1],
    ]);
    CommerceSetting::query()->whereKey(1)->update([
        'shipping_fee_per_seller_order' => '12.50',
    ]);

    $order = app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id);

    expect($order->subtotal)->toBe('40.00')
        ->and($order->shipping_total)->toBe('12.50')
        ->and($order->total)->toBe('52.50')
        ->and($order->sellerOrders->sole()->shipping_fee)->toBe('12.50');
});

it('rejects an empty cart without creating an order', function () {
    $setup = setupCheckoutCart([]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0)
        ->and(SellerOrder::query()->count())->toBe(0);
});

it('rejects insufficient stock without changing stock or clearing the cart', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '100.00', 'stock' => 1, 'quantity' => 2],
    ]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0)
        ->and($setup['products']['Product']->fresh()->stock)->toBe(1)
        ->and(CartItem::query()->where('cart_id', $setup['cart']->id)->count())->toBe(1);
});

it('rejects an address that belongs to another user', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '40.00', 'stock' => 5, 'quantity' => 1],
    ]);
    $otherBuyer = User::factory()->create();
    $otherAddress = Address::query()->create([
        'user_id' => $otherBuyer->id,
        'label' => 'Home',
        'recipient_name' => 'Other Buyer',
        'phone' => '09170000000',
        'line1' => 'Other Address',
        'barangay' => 'Barangay Test',
        'city' => 'Manila',
        'province' => 'Metro Manila',
        'region' => 'NCR',
        'zip' => '1000',
    ]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $otherAddress->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0)
        ->and($setup['products']['Product']->fresh()->stock)->toBe(5);
});

it('rejects inactive or non-buyer accounts', function (string $role, string $status) {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '40.00', 'stock' => 5, 'quantity' => 1],
    ]);
    User::query()->whereKey($setup['buyer']->id)->update([
        'role' => $role,
        'status' => $status,
    ]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(AuthorizationException::class);

    expect(Order::query()->count())->toBe(0)
        ->and($setup['products']['Product']->fresh()->stock)->toBe(5);
})->with([
    'seller account' => ['seller', 'approved'],
    'incomplete buyer' => ['buyer', 'incomplete'],
    'pending buyer' => ['buyer', 'pending'],
    'rejected buyer' => ['buyer', 'rejected'],
    'suspended buyer' => ['buyer', 'suspended'],
]);

it('rejects an unverified buyer without creating an order', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '40.00', 'stock' => 5, 'quantity' => 1],
    ]);
    $setup['buyer']->forceFill(['email_verified_at' => null])->save();
    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))->toThrow(AuthorizationException::class);
    expect(Order::query()->count())->toBe(0);
    expect($setup['products']['Product']->fresh()->stock)->toBe(5);
});

it('rejects a negative shipping fee setting without creating an order', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '40.00', 'stock' => 5, 'quantity' => 1],
    ]);
    CommerceSetting::query()->whereKey(1)->update([
        'shipping_fee_per_seller_order' => '-0.50',
    ]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0)
        ->and($setup['products']['Product']->fresh()->stock)->toBe(5);
});

it('rejects unavailable cart contents', function (string $productStatus, string $storeStatus) {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '40.00', 'stock' => 5, 'quantity' => 1, 'status' => $productStatus],
    ]);

    $setup['stores']['A']->update(['status' => $storeStatus]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0)
        ->and($setup['products']['Product']->fresh()->stock)->toBe(5);
})->with([
    'hidden product' => ['hidden', 'approved'],
    'unapproved store' => ['active', 'pending'],
]);

it('defers commission amounts until delivery without adding commission to buyer COD', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product A', 'price' => '100.05', 'stock' => 2, 'quantity' => 1],
        ['store' => 'B', 'name' => 'Product B', 'price' => '80.00', 'stock' => 2, 'quantity' => 1],
    ]);

    $order = app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id);
    CommerceSetting::query()->whereKey(1)->update(['platform_commission_basis_points' => 2000]);
    $sellerOrder = $order->sellerOrders->firstWhere('store_id', $setup['stores']['A']->id)->fresh();

    expect($order->total)->toBe('280.05');
    expect($order->payment_method)->toBe('cod');
    expect($sellerOrder->commission_basis_points)->toBe(1000);
    expect($sellerOrder->commission_amount)->toBeNull();
    expect($sellerOrder->seller_proceeds)->toBeNull();
    expect($order->sellerOrders->firstWhere('store_id', $setup['stores']['B']->id)->commission_amount)->toBeNull();
});

it('snapshots the configured rate when the order is placed', function (int $rate, string $commission, string $proceeds) {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '10.00', 'stock' => 2, 'quantity' => 1],
    ]);
    CommerceSetting::query()->whereKey(1)->update(['platform_commission_basis_points' => $rate]);

    $order = app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id);

    expect($order->sellerOrders->first()->commission_amount)->toBeNull();
    expect($order->sellerOrders->first()->commission_basis_points)->toBe($rate);
    expect($order->sellerOrders->first()->seller_proceeds)->toBeNull();
})->with([
    'zero commission' => [0, '0.00', '10.00'],
    'configured rate' => [1250, '1.25', '8.75'],
    'full commission' => [10000, '10.00', '0.00'],
]);

it('rejects a configured commission outside the allowed range', function () {
    $setup = setupCheckoutCart([['store' => 'A', 'name' => 'Product', 'price' => '10.00', 'stock' => 2, 'quantity' => 1]]);
    CommerceSetting::query()->whereKey(1)->update(['platform_commission_basis_points' => 10001]);
    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))->toThrow(ValidationException::class);
    expect($setup['products']['Product']->fresh()->stock)->toBe(2);
});

it('rejects a disabled product category or department', function (bool $disableParent) {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '10.00', 'stock' => 2, 'quantity' => 1],
    ]);
    $this->seed(MarketplaceCategorySeeder::class);
    $category = Category::query()->where('slug', 'pet-supplies--dog-food-treats')->firstOrFail();
    $setup['products']['Product']->update(['category_id' => $category->id]);
    ($disableParent ? $category->parent : $category)->update(['is_active' => false]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0);
    expect($setup['products']['Product']->fresh()->stock)->toBe(2);
})->with(['subcategory' => false, 'department' => true]);

it('rejects products outside the store registered department', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '10.00', 'stock' => 2, 'quantity' => 1],
    ]);
    $this->seed(MarketplaceCategorySeeder::class);
    $setup['stores']['A']->update([
        'business_category_id' => Category::query()->where('slug', 'pet-supplies')->value('id'),
    ]);
    $setup['products']['Product']->update([
        'category_id' => Category::query()->where('slug', 'electronics-and-gadgets--smart-home-devices')->value('id'),
    ]);

    expect(fn () => app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id))
        ->toThrow(ValidationException::class);

    expect(Order::query()->count())->toBe(0);
    expect($setup['products']['Product']->fresh()->stock)->toBe(2);
});

it('upgrades pre-existing orders without inventing historical commission snapshots', function () {
    $setup = setupCheckoutCart([
        ['store' => 'A', 'name' => 'Product', 'price' => '10.00', 'stock' => 2, 'quantity' => 1],
    ]);
    $order = app(CreateOrderFromCart::class)->handle($setup['buyer'], $setup['address']->id);
    $migration = require database_path('migrations/2026_10_06_135205_add_commission_snapshots_to_commerce.php');
    $migration->down();

    $migration->up();

    expect($order->fresh()->total)->toBe('60.00');
    expect($order->sellerOrders->first()->fresh()->commission_basis_points)->toBeNull();
    expect($order->sellerOrders->first()->fresh()->commission_amount)->toBeNull();
    expect($order->sellerOrders->first()->fresh()->seller_proceeds)->toBeNull();
    expect($setup['products']['Product']->fresh()->stock)->toBe(1);
});
