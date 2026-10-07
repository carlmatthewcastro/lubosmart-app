<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminComplianceController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ApplicationReviewController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PlatformContentController;
use App\Http\Controllers\RegistrationDocumentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SupportCaseController;
use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome', ['departments' => Category::query()->whereNull('parent_id')->where('is_active', true)->pluck('id', 'slug'),
        'announcements' => DB::table('platform_contents')->where('kind', 'announcement')->where('published', true)->latest('updated_at')->limit(3)->get(['id', 'title', 'body']),
    ]);
})->name('home');
Route::get('shop', [MarketplaceController::class, 'index'])->name('shop');
Route::get('platform-information', [PlatformContentController::class, 'published'])->name('platform-information');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::middleware('verified')->group(function () {
        Route::get('application', [ApplicationController::class, 'edit'])->name('application.edit');
        Route::post('application/draft', [ApplicationController::class, 'draft'])->middleware('throttle:20,1')->name('application.draft');
        Route::post('application', [ApplicationController::class, 'store'])->middleware('throttle:10,1')->name('application.store');
        Route::get('locations', LocationController::class)->middleware('throttle:60,1')->name('locations');
        Route::get('registration-documents/{document}', RegistrationDocumentController::class)->name('registration-documents.show');
        Route::middleware('active')->group(function () {
            Route::get('cart', [MarketplaceController::class, 'cart'])->name('cart');
            Route::put('cart/{product}', [MarketplaceController::class, 'updateCart'])->name('cart.update');
            Route::post('addresses', [MarketplaceController::class, 'address'])->name('addresses.store');
            Route::post('checkout', [MarketplaceController::class, 'checkout'])->middleware('throttle:10,1')->name('checkout');
            Route::get('inventory', [InventoryController::class, 'index'])->name('inventory');
            Route::post('inventory', [InventoryController::class, 'save'])->name('inventory.store');
            Route::put('inventory/{product}', [InventoryController::class, 'save'])->name('inventory.update');
            Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
            Route::post('purchases/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
            Route::get('orders/{sellerOrder}/waybill', [OrderController::class, 'waybill'])->name('orders.waybill');
            Route::patch('orders/{sellerOrder}', [OrderController::class, 'prepare'])->name('orders.prepare');
            Route::post('orders/{sellerOrder}/messages', [OrderController::class, 'message'])->middleware('throttle:30,1')->name('orders.message');
            Route::get('deliveries', [DeliveryController::class, 'index'])->name('deliveries.index');
            Route::post('deliveries/{delivery}', [DeliveryController::class, 'update'])->name('deliveries.update');
            Route::get('deliveries/{delivery}/proof', [DeliveryController::class, 'proof'])->name('deliveries.proof');
            Route::get('reports', [ReportController::class, 'index'])->name('reports');
            Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
            Route::get('admin/commission', [ReportController::class, 'commission'])->name('admin.commission');
            Route::patch('reports/settings', [ReportController::class, 'update'])->name('reports.settings');
            Route::get('accounts', [AccountController::class, 'index'])->name('accounts.index');
            Route::get('accounts/{user}', [AccountController::class, 'show'])->name('accounts.show');
            Route::patch('accounts/{user}', [AccountController::class, 'update'])->name('accounts.update');
            Route::get('admin/compliance', [AdminComplianceController::class, 'index'])->name('admin.compliance');
            Route::patch('admin/compliance/{product}', [AdminComplianceController::class, 'update'])->middleware('throttle:30,1')->name('admin.compliance.update');
            Route::get('admin/platform', [PlatformContentController::class, 'index'])->name('admin.platform');
            Route::post('admin/platform', [PlatformContentController::class, 'save'])->name('admin.platform.store');
            Route::put('admin/platform/{content}', [PlatformContentController::class, 'save'])->whereNumber('content')->name('admin.platform.update');
            Route::get('support', [SupportCaseController::class, 'index'])->name('support.index');
            Route::post('support', [SupportCaseController::class, 'store'])->middleware('throttle:10,1')->name('support.store');
            Route::get('support/{case}', [SupportCaseController::class, 'show'])->name('support.show');
            Route::post('support/{case}/messages', [SupportCaseController::class, 'message'])->middleware('throttle:30,1')->name('support.message');
            Route::patch('support/{case}', [SupportCaseController::class, 'update'])->name('support.update');
            Route::get('support/{case}/evidence/{message}', [SupportCaseController::class, 'evidence'])->name('support.evidence');
            Route::get('dashboard/{role}', [DashboardController::class, 'show'])->whereIn('role', ['buyer', 'seller', 'rider', 'admin', 'logistics'])->name('dashboard.role');
            Route::get('reviews', [ApplicationReviewController::class, 'index'])->name('reviews.index');
            Route::get('reviews/{application}', [ApplicationReviewController::class, 'show'])->name('reviews.show');
            Route::patch('reviews/{application}', [ApplicationReviewController::class, 'update'])->name('reviews.update');
        });
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
