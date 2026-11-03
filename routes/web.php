<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminComplianceController;
use App\Http\Controllers\AdminNotificationsController;
use App\Http\Controllers\AdminSearchController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ApplicationReviewController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\Logistics\NotificationsController as LogisticsNotificationsController;
use App\Http\Controllers\Logistics\RiderController;
use App\Http\Controllers\Logistics\ShippingRateController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ParcelReturnController;
use App\Http\Controllers\PlatformContentController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\RegistrationDocumentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\Rider\NotificationsController;
use App\Http\Controllers\RiderPaymentController;
use App\Http\Controllers\RiderServiceAreaController;
use App\Http\Controllers\SellerCostController;
use App\Http\Controllers\SellerSettlementController;
use App\Http\Controllers\StoreVoucherController;
use App\Http\Controllers\SupportCaseController;
use App\Http\Controllers\WishlistController;
use App\Http\Controllers\WorkspaceStatusController;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Preserve the image URL used by previously sent emails and existing environments.
Route::redirect('/email-logo.png', '/images/brand/email-logo.png', 301);

Route::get('/', function (Request $request) {
    return Inertia::render('public/home', ['departments' => Category::query()->whereNull('parent_id')->where('is_active', true)->pluck('id', 'slug'),
        'favoriteIds' => $request->user()?->role === 'buyer' ? DB::table('product_wishlists')->where('user_id', $request->user()->id)->pluck('product_id') : [],
        'products' => Product::query()->availableToShoppers()->where('stock', '>', 0)->whereNotNull('image_path')->with(['store:id,name', 'category:id,name', 'variants'])->withAvg('reviews', 'rating')->withCount('reviews')->latest('id')->limit(4)->get(['id', 'store_id', 'category_id', 'name', 'price', 'stock', 'description', 'image_path']),
        'announcements' => DB::table('platform_contents')->where('kind', 'announcement')->where('published', true)->latest('updated_at')->limit(3)->get(['id', 'title', 'body']),
    ]);
})->name('home');
Route::get('shop', [MarketplaceController::class, 'index'])->name('shop');
Route::get('products/{product}', [ProductReviewController::class, 'show'])->name('products.show');
Route::get('platform-information', [PlatformContentController::class, 'published'])->name('platform-information');
Route::get('registration-options', LocationController::class)->middleware('throttle:60,1,registration-options')->name('registration.options');

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
            Route::get('workspace/status', WorkspaceStatusController::class)->middleware(['role:buyer,seller,rider,logistics', 'throttle:120,1,workspace-status'])->name('workspace.status');
            Route::get('seller/notifications', App\Http\Controllers\Seller\NotificationsController::class)->middleware(['role:seller', 'throttle:60,1'])->name('seller.notifications');
            Route::get('rider/notifications', NotificationsController::class)->middleware(['role:rider', 'throttle:60,1'])->name('rider.notifications');
            Route::middleware('role:logistics')->prefix('logistics/riders')->name('logistics.riders.')->group(function () {
                Route::get('/', [RiderController::class, 'index'])->name('index');
                Route::get('create', [RiderController::class, 'create'])->name('create');
                Route::post('/', [RiderController::class, 'store'])->middleware('throttle:10,1')->name('store');
                Route::post('{rider}/resend', [RiderController::class, 'resend'])->middleware('throttle:6,1')->name('resend');
            });
            Route::get('admin/conversation-options', [SupportCaseController::class, 'options'])->middleware(['role:admin', 'throttle:60,1'])->name('admin.conversation-options');
            Route::get('admin/search', AdminSearchController::class)->middleware(['role:admin', 'throttle:60,1'])->name('admin.search');
            Route::get('admin/notifications', AdminNotificationsController::class)->middleware(['role:admin', 'throttle:120,1,admin-notifications'])->name('admin.notifications');
            Route::get('admin/audit-log', [AuditLogController::class, 'index'])->middleware('role:admin')->middleware('admin.permission:audit')->name('audit.index');
            Route::get('wishlist', [MarketplaceController::class, 'index'])->middleware('role:buyer')->name('wishlist.index');
            Route::post('wishlist/{product}', [WishlistController::class, 'update'])->middleware(['role:buyer', 'throttle:60,1'])->name('wishlist.update');
            Route::get('cart', [MarketplaceController::class, 'cart'])->middleware('role:buyer')->name('cart');
            Route::get('cart/shipping-quote', [MarketplaceController::class, 'shippingQuote'])->middleware('role:buyer')->name('cart.shipping-quote');
            Route::put('cart/{product}', [MarketplaceController::class, 'updateCart'])->middleware('role:buyer')->name('cart.update');
            Route::post('addresses', [MarketplaceController::class, 'address'])->middleware('role:buyer')->name('addresses.store');
            Route::post('checkout', [MarketplaceController::class, 'checkout'])->middleware('throttle:10,1')->middleware('role:buyer')->name('checkout');
            Route::get('inventory', [InventoryController::class, 'index'])->middleware('role:seller')->name('inventory');
            Route::post('inventory', [InventoryController::class, 'save'])->middleware('role:seller')->name('inventory.store');
            Route::put('inventory/{product}', [InventoryController::class, 'save'])->middleware('role:seller')->name('inventory.update');
            Route::put('inventory/{product}/variants', [ProductVariantController::class, 'update'])->middleware('role:seller')->name('inventory.variants');
            Route::get('seller/vouchers', [StoreVoucherController::class, 'index'])->middleware('role:seller')->name('seller.vouchers');
            Route::post('seller/vouchers', [StoreVoucherController::class, 'store'])->middleware(['role:seller', 'throttle:20,1'])->name('seller.vouchers.store');
            Route::patch('seller/vouchers/{voucher}', [StoreVoucherController::class, 'update'])->middleware('role:seller')->name('seller.vouchers.update');
            Route::post('cart/voucher', [StoreVoucherController::class, 'preview'])->middleware(['role:buyer', 'throttle:30,1'])->name('cart.voucher');
            Route::post('order-items/{item}/review', [ProductReviewController::class, 'store'])->middleware(['role:buyer', 'throttle:20,1'])->name('product-reviews.store');
            Route::get('admin/product-reviews', [ProductReviewController::class, 'index'])->middleware(['role:admin', 'admin.permission:compliance'])->name('product-reviews.index');
            Route::patch('admin/product-reviews/{review}', [ProductReviewController::class, 'moderate'])->middleware(['role:admin', 'admin.permission:compliance'])->name('product-reviews.moderate');
            Route::get('orders', [OrderController::class, 'index'])->middleware('role:buyer,seller,admin')->middleware('admin.permission:operations')->name('orders.index');
            Route::post('purchases/{order}/cancel', [OrderController::class, 'cancel'])->middleware('role:buyer')->name('orders.cancel');
            Route::get('orders/{sellerOrder}/waybill', [OrderController::class, 'waybill'])->middleware('role:seller,admin')->middleware('admin.permission:operations')->name('orders.waybill');
            Route::post('orders/{sellerOrder}/waybill', [OrderController::class, 'printWaybill'])->middleware('role:seller,admin')->middleware('admin.permission:operations')->name('orders.waybill.print');
            Route::patch('orders/{sellerOrder}', [OrderController::class, 'prepare'])->middleware('role:seller')->name('orders.prepare');
            Route::post('orders/{sellerOrder}/messages', [OrderController::class, 'message'])->middleware('throttle:30,1')->middleware('role:buyer,seller')->name('orders.message');
            Route::get('logistics/conversation-options', [SupportCaseController::class, 'options'])->middleware(['role:logistics', 'throttle:60,1'])->name('logistics.conversation-options');
            Route::get('logistics/reports/export', [App\Http\Controllers\Logistics\ReportController::class, 'export'])->middleware('role:logistics')->name('logistics.reports.export');
            Route::get('logistics/shipping-rates', [ShippingRateController::class, 'index'])->middleware('role:logistics')->name('logistics.shipping-rates');
            Route::post('logistics/shipping-rates', [ShippingRateController::class, 'store'])->middleware('role:logistics')->name('logistics.shipping-rates.store');
            Route::patch('logistics/shipping-rates/{rate}', [ShippingRateController::class, 'update'])->middleware('role:logistics')->name('logistics.shipping-rates.update');
            Route::get('deliveries', [DeliveryController::class, 'index'])->middleware('role:rider,logistics,admin')->middleware('admin.permission:operations')->name('deliveries.index');
            Route::get('logistics/scan', [DeliveryController::class, 'index'])->middleware('role:logistics')->name('logistics.scan');
            Route::get('logistics/notifications', LogisticsNotificationsController::class)->middleware(['role:logistics', 'throttle:60,1'])->name('logistics.notifications');
            Route::post('rider-service-areas', [RiderServiceAreaController::class, 'store'])->middleware('role:logistics')->name('rider-service-areas.store');
            Route::get('logistics/rider-coverage', [RiderServiceAreaController::class, 'index'])->middleware('role:logistics')->name('logistics.rider-coverage');
            Route::post('deliveries/{delivery}', [DeliveryController::class, 'update'])->middleware('role:rider,logistics,admin')->middleware('admin.permission:operations')->name('deliveries.update');
            Route::get('deliveries/{delivery}/proof', [DeliveryController::class, 'proof'])->middleware('role:buyer,seller,rider,logistics,admin')->middleware('admin.permission:operations')->name('deliveries.proof');
            Route::get('reports', [ReportController::class, 'index'])->middleware('role:seller,rider,logistics,admin')->middleware('admin.permission:reports')->name('reports');
            Route::get('settlements', [SellerSettlementController::class, 'index'])->middleware(['role:admin,seller', 'admin.permission:finance'])->name('settlements');
            Route::post('settlements/{parcel}', [SellerSettlementController::class, 'store'])->middleware(['role:admin', 'admin.permission:finance', 'throttle:20,1'])->name('settlements.store');
            Route::get('rider-payments', [RiderPaymentController::class, 'index'])->middleware('role:logistics,rider')->name('rider-payments');
            Route::post('rider-payments', [RiderPaymentController::class, 'store'])->middleware(['role:logistics', 'throttle:20,1'])->name('rider-payments.store');
            Route::post('rider-payments/{payment}/pay', [RiderPaymentController::class, 'pay'])->middleware(['role:logistics', 'throttle:20,1'])->name('rider-payments.pay');
            Route::get('seller/costs', [SellerCostController::class, 'index'])->middleware('role:seller')->name('seller.costs');
            Route::post('seller/costs', [SellerCostController::class, 'store'])->middleware(['role:seller', 'throttle:20,1'])->name('seller.costs.store');
            Route::post('seller/costs/{cost}/void', [SellerCostController::class, 'void'])->middleware('role:seller')->name('seller.costs.void');
            Route::get('returns', [ParcelReturnController::class, 'index'])->middleware(['role:admin,buyer,seller,logistics,rider', 'admin.permission:disputes'])->name('returns');
            Route::post('returns', [ParcelReturnController::class, 'store'])->middleware(['role:buyer', 'throttle:10,1'])->name('returns.store');
            Route::patch('returns/{return}', [ParcelReturnController::class, 'update'])->middleware(['role:admin,seller,logistics,rider', 'throttle:30,1'])->name('returns.update');
            Route::get('reports/export', [ReportController::class, 'export'])->middleware('role:admin')->middleware('admin.permission:reports')->name('reports.export');
            Route::get('seller/reports/export', [ReportController::class, 'export'])->middleware('role:seller')->name('seller.reports.export');
            Route::get('admin/commission', [ReportController::class, 'commission'])->middleware('role:admin')->middleware('admin.permission:finance')->name('admin.commission');
            Route::patch('reports/settings', [ReportController::class, 'update'])->middleware('role:admin')->middleware('admin.permission:finance')->name('reports.settings');
            Route::get('accounts', [AccountController::class, 'index'])->middleware('role:admin,logistics')->middleware('admin.permission:accounts')->name('accounts.index');
            Route::get('accounts/{user}', [AccountController::class, 'show'])->middleware('role:admin,logistics')->middleware('admin.permission:accounts')->name('accounts.show');
            Route::patch('accounts/{user}', [AccountController::class, 'update'])->middleware('role:admin,logistics')->middleware('admin.permission:accounts')->name('accounts.update');
            Route::get('admin/compliance', [AdminComplianceController::class, 'index'])->middleware('role:admin')->middleware('admin.permission:compliance')->name('admin.compliance');
            Route::patch('admin/compliance/{product}', [AdminComplianceController::class, 'update'])->middleware('throttle:30,1')->middleware('role:admin')->middleware('admin.permission:compliance')->name('admin.compliance.update');
            Route::get('admin/platform', [PlatformContentController::class, 'index'])->middleware('role:admin')->middleware('admin.permission:system')->name('admin.platform');
            Route::post('admin/platform', [PlatformContentController::class, 'save'])->middleware('role:admin')->middleware('admin.permission:system')->name('admin.platform.store');
            Route::put('admin/platform/{content}', [PlatformContentController::class, 'save'])->whereNumber('content')->middleware('role:admin')->middleware('admin.permission:system')->name('admin.platform.update');
            Route::get('support', [SupportCaseController::class, 'index'])->middleware('role:buyer,seller,rider,logistics,admin')->middleware('admin.permission:messages')->name('support.index');
            Route::post('support', [SupportCaseController::class, 'store'])->middleware('throttle:10,1')->middleware('role:buyer,seller,rider,logistics,admin')->middleware('admin.permission:messages')->name('support.store');
            Route::get('support/{case}', [SupportCaseController::class, 'show'])->middleware('role:buyer,seller,rider,logistics,admin')->middleware('admin.permission:messages')->name('support.show');
            Route::post('support/{case}/messages', [SupportCaseController::class, 'message'])->middleware('throttle:30,1')->middleware('role:buyer,seller,rider,logistics,admin')->middleware('admin.permission:messages')->name('support.message');
            Route::patch('support/{case}', [SupportCaseController::class, 'update'])->middleware('role:admin')->middleware('admin.permission:messages')->name('support.update');
            Route::get('support/{case}/evidence/{message}', [SupportCaseController::class, 'evidence'])->middleware('role:buyer,seller,rider,logistics,admin')->middleware('admin.permission:messages')->name('support.evidence');
            // Preserve dashboard URLs already sent in account emails and bookmarks.
            Route::redirect('dashboard/courier', '/dashboard/rider');
            Route::redirect('dashboard/sorting_center', '/dashboard/logistics');
            Route::get('dashboard/{role}', [DashboardController::class, 'show'])->whereIn('role', ['buyer', 'seller', 'rider', 'admin', 'logistics'])->name('dashboard.role');
            Route::get('reviews', [ApplicationReviewController::class, 'index'])->middleware('role:admin,logistics')->middleware('admin.permission:registrations')->name('reviews.index');
            Route::get('reviews/{application}', [ApplicationReviewController::class, 'show'])->middleware('role:admin,logistics')->middleware('admin.permission:registrations')->name('reviews.show');
            Route::patch('reviews/{application}', [ApplicationReviewController::class, 'update'])->middleware('role:admin,logistics')->middleware('admin.permission:registrations')->name('reviews.update');
        });
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/account.php';
require __DIR__.'/auth.php';
