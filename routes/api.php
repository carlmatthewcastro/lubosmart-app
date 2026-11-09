<?php

use App\Http\Controllers\Api\V1\DeviceTokenController;
use App\Http\Controllers\Api\V1\MarketplaceReadController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('auth/tokens', [DeviceTokenController::class, 'store'])->middleware('throttle:mobile-login')->name('tokens.store');
    Route::middleware('throttle:mobile-api')->group(function () {
        Route::get('products', [MarketplaceReadController::class, 'products'])->name('products.index');
        Route::get('products/{product}', [MarketplaceReadController::class, 'product'])->whereNumber('product')->name('products.show');
        Route::get('categories', [MarketplaceReadController::class, 'categories'])->name('categories.index');
    });

    Route::middleware(['auth:sanctum', 'throttle:mobile-api'])->group(function () {
        Route::delete('auth/token', [DeviceTokenController::class, 'destroy'])->middleware('mobile.token:logout')->name('tokens.destroy');
        Route::delete('auth/tokens', [DeviceTokenController::class, 'destroyAll'])->middleware('mobile.token:logout')->name('tokens.destroy-all');
        Route::get('me', [MarketplaceReadController::class, 'me'])->middleware('mobile.token')->name('me');
        Route::middleware('mobile.token:buyer')->group(function () {
            Route::get('cart', [MarketplaceReadController::class, 'cart'])->name('cart.show');
            Route::put('cart/items/{product}', [MarketplaceController::class, 'updateCart'])->name('cart.update');
            Route::get('shipping-quotes', [MarketplaceController::class, 'shippingQuote'])->name('shipping-quotes');
            Route::get('addresses', [MarketplaceReadController::class, 'addresses'])->name('addresses.index');
            Route::post('addresses', [MarketplaceController::class, 'address'])->name('addresses.store');
            Route::get('orders', [MarketplaceReadController::class, 'orders'])->name('orders.index');
            Route::get('orders/{order}', [MarketplaceReadController::class, 'order'])->whereNumber('order')->name('orders.show');
            Route::post('orders', [MarketplaceController::class, 'checkout'])->name('orders.store');
            Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
        });
        Route::middleware('mobile.token:seller')->group(function () {
            Route::get('seller/orders', [MarketplaceReadController::class, 'parcels'])->name('seller.orders');
            Route::patch('seller/orders/{sellerOrder}', [OrderController::class, 'prepare'])->name('seller.prepare');
        });
        Route::middleware('mobile.token:logistics')->group(function () {
            Route::get('logistics/configuration', [MarketplaceReadController::class, 'logisticsConfiguration'])->name('logistics.configuration');
            Route::get('logistics/available-pickups', [MarketplaceReadController::class, 'availablePickups'])->name('logistics.available-pickups');
        });
        Route::middleware(['mobile.token', 'role:rider,logistics,admin'])->group(function () {
            Route::get('deliveries', [MarketplaceReadController::class, 'deliveries'])->name('deliveries.index');
            Route::get('deliveries/{delivery}', [MarketplaceReadController::class, 'delivery'])->whereNumber('delivery')->name('deliveries.show');
            Route::post('deliveries/{delivery}/events', [DeliveryController::class, 'update'])->name('deliveries.update');
        });
        Route::get('deliveries/{delivery}/proof', [DeliveryController::class, 'proof'])->middleware('mobile.token')->name('deliveries.proof');
    });
});

require __DIR__.'/mobile.php';
