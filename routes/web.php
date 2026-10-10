<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminComplianceController;
use App\Http\Controllers\AdminSearchController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ApplicationReviewController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\Logistics\ShippingRateController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PlatformContentController;
use App\Http\Controllers\RegistrationDocumentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RiderServiceAreaController;
use App\Http\Controllers\SupportCaseController;
use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('public/home', ['departments' => Category::query()->whereNull('parent_id')->where('is_active', true)->pluck('id', 'slug'),
        'announcements' => DB::table('platform_contents')->where('kind', 'announcement')->where('published', true)->latest('updated_at')->limit(3)->get(['id', 'title', 'body']),
    ]);
})->name('home');
Route::get('shop', [MarketplaceController::class, 'index'])->name('shop');
Route::get('platform-information', [PlatformContentController::class, 'published'])->name('platform-information');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::middleware('verified')->group(function () {
        Route::get('application', [ApplicationController::class, 'edit'])->name('application.edit');
        Route::get('application/waiting', [ApplicationController::class, 'waiting'])->name('application.waiting');
        Route::post('application/draft', [ApplicationController::class, 'draft'])->middleware('throttle:20,1')->name('application.draft');
        Route::post('application', [ApplicationController::class, 'store'])->middleware('throttle:10,1')->name('application.store');
        Route::get('locations', LocationController::class)->middleware('throttle:60,1')->name('locations');
        Route::get('registration-documents/{document}', RegistrationDocumentController::class)->middleware('signed')->name('registration-documents.show');
        Route::middleware('active')->group(function () {
            Route::get('admin/conversation-options', [SupportCaseController::class, 'options'])->middleware(['role:admin', 'throttle:60,1'])->name('admin.conversation-options');
            Route::get('admin/search', AdminSearchController::class)->middleware(['role:admin', 'throttle:60,1'])->name('admin.search');
            Route::get('admin/audit-log', [AuditLogController::class, 'index'])->middleware('role:admin')->middleware('admin.permission:audit')->name('audit.index');
            Route::get('cart', [MarketplaceController::class, 'cart'])->middleware('role:buyer')->name('cart');
            Route::get('cart/shipping-quote', [MarketplaceController::class, 'shippingQuote'])->middleware('role:buyer')->name('cart.shipping-quote');
            Route::put('cart/{product}', [MarketplaceController::class, 'updateCart'])->middleware('role:buyer')->name('cart.update');
            Route::post('addresses', [MarketplaceController::class, 'address'])->middleware('role:buyer')->name('addresses.store');
            Route::post('checkout', [MarketplaceController::class, 'checkout'])->middleware('throttle:10,1')->middleware('role:buyer')->name('checkout');
            Route::get('inventory', [InventoryController::class, 'index'])->middleware('role:seller')->name('inventory');
            Route::post('inventory', [InventoryController::class, 'save'])->middleware('role:seller')->name('inventory.store');
            Route::put('inventory/{product}', [InventoryController::class, 'save'])->middleware('role:seller')->name('inventory.update');
            Route::get('orders', [OrderController::class, 'index'])->middleware('role:buyer,seller,admin')->middleware('admin.permission:operations')->name('orders.index');
            Route::post('purchases/{order}/cancel', [OrderController::class, 'cancel'])->middleware('role:buyer')->name('orders.cancel');
            Route::get('orders/{sellerOrder}/waybill', [OrderController::class, 'waybill'])->middleware('role:seller,admin')->middleware('admin.permission:operations')->name('orders.waybill');
            Route::patch('orders/{sellerOrder}', [OrderController::class, 'prepare'])->middleware('role:seller')->name('orders.prepare');
            Route::post('orders/{sellerOrder}/messages', [OrderController::class, 'message'])->middleware('throttle:30,1')->middleware('role:buyer,seller')->name('orders.message');
            Route::get('logistics/conversation-options', [SupportCaseController::class, 'options'])->middleware(['role:sorting_center', 'throttle:60,1'])->name('logistics.conversation-options');
            Route::get('logistics/reports/export', [App\Http\Controllers\Logistics\ReportController::class, 'export'])->middleware('role:sorting_center')->name('logistics.reports.export');
            Route::get('logistics/shipping-rates', [ShippingRateController::class, 'index'])->middleware('role:sorting_center')->name('logistics.shipping-rates');
            Route::post('logistics/shipping-rates', [ShippingRateController::class, 'store'])->middleware('role:sorting_center')->name('logistics.shipping-rates.store');
            Route::patch('logistics/shipping-rates/{rate}', [ShippingRateController::class, 'update'])->middleware('role:sorting_center')->name('logistics.shipping-rates.update');
            Route::get('deliveries', [DeliveryController::class, 'index'])->middleware('role:courier,sorting_center,admin')->middleware('admin.permission:operations')->name('deliveries.index');
            Route::post('rider-service-areas', [RiderServiceAreaController::class, 'store'])->middleware('role:sorting_center')->name('rider-service-areas.store');
            Route::post('deliveries/{delivery}', [DeliveryController::class, 'update'])->middleware('role:courier,sorting_center,admin')->middleware('admin.permission:operations')->name('deliveries.update');
            Route::get('deliveries/{delivery}/proof', [DeliveryController::class, 'proof'])->middleware('role:buyer,seller,courier,sorting_center,admin')->middleware('admin.permission:operations')->name('deliveries.proof');
            Route::get('reports', [ReportController::class, 'index'])->middleware('role:seller,courier,sorting_center,admin')->middleware('admin.permission:reports')->name('reports');
            Route::get('reports/export', [ReportController::class, 'export'])->middleware('role:admin')->middleware('admin.permission:reports')->name('reports.export');
            Route::get('admin/commission', [ReportController::class, 'commission'])->middleware('role:admin')->middleware('admin.permission:finance')->name('admin.commission');
            Route::patch('reports/settings', [ReportController::class, 'update'])->middleware('role:admin')->middleware('admin.permission:finance')->name('reports.settings');
            Route::get('accounts', [AccountController::class, 'index'])->middleware('role:admin,sorting_center')->middleware('admin.permission:accounts')->name('accounts.index');
            Route::get('accounts/{user}', [AccountController::class, 'show'])->middleware('role:admin,sorting_center')->middleware('admin.permission:accounts')->name('accounts.show');
            Route::patch('accounts/{user}', [AccountController::class, 'update'])->middleware('role:admin,sorting_center')->middleware('admin.permission:accounts')->name('accounts.update');
            Route::get('admin/compliance', [AdminComplianceController::class, 'index'])->middleware('role:admin')->middleware('admin.permission:compliance')->name('admin.compliance');
            Route::patch('admin/compliance/{product}', [AdminComplianceController::class, 'update'])->middleware('throttle:30,1')->middleware('role:admin')->middleware('admin.permission:compliance')->name('admin.compliance.update');
            Route::get('admin/platform', [PlatformContentController::class, 'index'])->middleware('role:admin')->middleware('admin.permission:system')->name('admin.platform');
            Route::post('admin/platform', [PlatformContentController::class, 'save'])->middleware('role:admin')->middleware('admin.permission:system')->name('admin.platform.store');
            Route::put('admin/platform/{content}', [PlatformContentController::class, 'save'])->whereNumber('content')->middleware('role:admin')->middleware('admin.permission:system')->name('admin.platform.update');
            Route::get('support', [SupportCaseController::class, 'index'])->middleware('role:buyer,seller,courier,sorting_center,admin')->middleware('admin.permission:messages')->name('support.index');
            Route::post('support', [SupportCaseController::class, 'store'])->middleware('throttle:10,1')->middleware('role:buyer,seller,courier,sorting_center,admin')->middleware('admin.permission:messages')->name('support.store');
            Route::get('support/{case}', [SupportCaseController::class, 'show'])->middleware('role:buyer,seller,courier,sorting_center,admin')->middleware('admin.permission:messages')->name('support.show');
            Route::post('support/{case}/messages', [SupportCaseController::class, 'message'])->middleware('throttle:30,1')->middleware('role:buyer,seller,courier,sorting_center,admin')->middleware('admin.permission:messages')->name('support.message');
            Route::patch('support/{case}', [SupportCaseController::class, 'update'])->middleware('role:admin')->middleware('admin.permission:messages')->name('support.update');
            Route::get('support/{case}/evidence/{message}', [SupportCaseController::class, 'evidence'])->middleware('role:buyer,seller,courier,sorting_center,admin')->middleware('admin.permission:messages')->name('support.evidence');
            Route::get('dashboard/{role}', [DashboardController::class, 'show'])->whereIn('role', ['buyer', 'seller', 'courier', 'admin', 'sorting_center'])->name('dashboard.role');
            Route::get('reviews', [ApplicationReviewController::class, 'index'])->middleware('role:admin,sorting_center')->middleware('admin.permission:registrations')->name('reviews.index');
            Route::get('reviews/{application}', [ApplicationReviewController::class, 'show'])->middleware('role:admin,sorting_center')->middleware('admin.permission:registrations')->name('reviews.show');
            Route::patch('reviews/{application}', [ApplicationReviewController::class, 'update'])->middleware('role:admin,sorting_center')->middleware('admin.permission:registrations')->name('reviews.update');
        });
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
