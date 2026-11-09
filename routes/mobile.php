<?php

use App\Http\Controllers\Api\V1\MobileAuthController as Auth;
use App\Http\Controllers\Api\V1\RoleDataController as Data;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ParcelReturnController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SellerCostController;
use App\Http\Controllers\Settings\AddressController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\StoreVoucherController;
use App\Http\Controllers\SupportCaseController;
use App\Http\Controllers\WishlistController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::middleware('throttle:mobile-login')->group(function () {
        Route::post('auth/session', [Auth::class, 'session'])->name('session');
        Route::post('auth/register', [Auth::class, 'register'])->name('register');
        Route::post('auth/google', [Auth::class, 'google'])->name('google');
        Route::post('auth/password/code', [Auth::class, 'sendCode'])->name('password.code');
        Route::post('auth/password/verify', [Auth::class, 'verifyCode'])->name('password.verify');
        Route::post('auth/password/reset', [Auth::class, 'password'])->name('password.reset');
    });
    Route::middleware('throttle:mobile-api')->group(function () {
        Route::get('registration/centers', [Auth::class, 'centers'])->name('registration.centers');
        Route::get('locations', LocationController::class)->name('locations');
        Route::get('policies', [Data::class, 'policies'])->name('policies');
        Route::get('products/{product}/reviews', [Data::class, 'reviews'])->name('products.reviews');
    });
    Route::middleware(['auth:sanctum', 'onboarding.token', 'throttle:mobile-api'])->prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('status', [Auth::class, 'status'])->name('status');
        Route::delete('token', [Auth::class, 'logout'])->name('logout');
        Route::post('verify', [Auth::class, 'verify'])->middleware('throttle:10,1')->name('verify');
        Route::post('resend', [Auth::class, 'resend'])->middleware('throttle:5,1')->name('resend');
        Route::post('promote', [Auth::class, 'promote'])->name('promote');
        Route::post('application/draft', [ApplicationController::class, 'draft'])->name('draft');
        Route::post('application', [ApplicationController::class, 'store'])->name('submit');
    });
    Route::middleware(['auth:sanctum', 'mobile.token', 'role:buyer,seller,rider', 'throttle:mobile-api'])->group(function () {
        Route::get('workspace', [Data::class, 'workspace'])->name('workspace');
        Route::get('settings/profile', [Data::class, 'settings'])->name('settings.profile');
        Route::patch('settings/profile', [ProfileController::class, 'update'])->name('settings.update');
        Route::post('settings/code', [Auth::class, 'sendCode'])->middleware('throttle:5,1')->name('settings.code');
        Route::post('settings/code/verify', [Auth::class, 'verifyCode'])->middleware('throttle:10,1')->name('settings.verify');
        Route::get('returns', [Data::class, 'returns'])->name('returns.index');
        Route::patch('returns/{return}', [ParcelReturnController::class, 'update'])->middleware('role:seller,rider')->name('returns.update');
        Route::get('support', [Data::class, 'support'])->name('support.index');
        Route::post('support', [SupportCaseController::class, 'store'])->middleware('throttle:10,1')->name('support.store');
        Route::get('support/{case}', [Data::class, 'conversation'])->name('support.show');
        Route::post('support/{case}/messages', [SupportCaseController::class, 'message'])->middleware('throttle:30,1')->name('support.message');
        Route::get('support/{case}/evidence/{message}', [SupportCaseController::class, 'evidence'])->name('support.evidence');
        Route::middleware('role:buyer,seller')->group(function () {
            Route::get('parcels/{sellerOrder}/messages', [Data::class, 'messages'])->name('messages.index');
            Route::post('parcels/{sellerOrder}/messages', [OrderController::class, 'message'])->middleware('throttle:30,1')->name('messages.store');
        });
        Route::middleware('role:buyer')->group(function () {
            Route::put('addresses/{address}', [AddressController::class, 'update'])->name('addresses.update');
            Route::delete('addresses/{address}', [AddressController::class, 'destroy'])->name('addresses.destroy');
            Route::patch('addresses/{address}/default', [AddressController::class, 'default'])->name('addresses.default');
            Route::get('wishlist', [Data::class, 'wishlist'])->name('wishlist.index');
            Route::put('wishlist/{product}', [WishlistController::class, 'update'])->name('wishlist.update');
            Route::post('vouchers/preview', [StoreVoucherController::class, 'preview'])->name('vouchers.preview');
            Route::get('reviews', [Data::class, 'ownReviews'])->name('reviews.own');
            Route::put('order-items/{item}/review', [ProductReviewController::class, 'store'])->name('reviews.store');
            Route::post('returns', [ParcelReturnController::class, 'store'])->name('returns.store');
        });
        Route::middleware('role:seller')->prefix('seller')->name('seller.')->group(function () {
            Route::get('products', [Data::class, 'products'])->name('products.index');
            Route::post('products', [InventoryController::class, 'save'])->name('products.store');
            Route::get('products/{product}', [Data::class, 'product'])->name('products.show');
            Route::put('products/{product}', [InventoryController::class, 'save'])->name('products.update');
            Route::put('products/{product}/variants', [ProductVariantController::class, 'update'])->name('products.variants');
            Route::get('vouchers', [Data::class, 'vouchers'])->name('vouchers.index');
            Route::post('vouchers', [StoreVoucherController::class, 'store'])->name('vouchers.store');
            Route::patch('vouchers/{voucher}', [StoreVoucherController::class, 'update'])->name('vouchers.update');
            Route::get('orders/{sellerOrder}/waybill', [Data::class, 'waybill'])->name('orders.waybill');
            Route::post('orders/{sellerOrder}/waybill', [OrderController::class, 'printWaybill'])->name('orders.print');
            Route::get('settlements', [Data::class, 'settlements'])->name('settlements');
            Route::get('costs', [SellerCostController::class, 'index'])->name('costs.index');
            Route::post('costs', [SellerCostController::class, 'store'])->name('costs.store');
            Route::post('costs/{cost}/void', [SellerCostController::class, 'void'])->name('costs.void');
            Route::get('reports', [ReportController::class, 'index'])->name('reports');
            Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
        });
        Route::middleware('role:rider')->prefix('rider')->name('rider.')->group(function () {
            Route::get('earnings', [Data::class, 'earnings'])->name('earnings');
            Route::get('reports', [ReportController::class, 'index'])->name('reports');
        });
    });
});
