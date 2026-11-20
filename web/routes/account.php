<?php

use App\Http\Controllers\Account\ReviewController;
use App\Http\Controllers\Account\SettingsController;
use App\Models\ChangeRequest;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Web middleware provides the existing first-party session and CSRF boundary.
Route::withoutMiddleware(AuthenticateSession::class)
    ->middleware(['auth:sanctum', Laravel\Sanctum\Http\Middleware\AuthenticateSession::class])->group(function () {
        Route::get('settings/account', function () {
            Gate::authorize('create', ChangeRequest::class);

            return Inertia::render('settings/account');
        })->name('account.settings');
        Route::get('admin/change-requests', function () {
            Gate::authorize('viewAny', ChangeRequest::class);

            return Inertia::render('management/change-requests');
        })->name('admin.change-requests');
        Route::prefix('api')->group(function () {
            Route::get('account/settings', [SettingsController::class, 'show']);
            Route::get('account/tin', [SettingsController::class, 'tin'])->middleware('throttle:10,1');
            Route::patch('account/profile', [SettingsController::class, 'update'])->middleware('throttle:10,1');
            Route::post('account/change-requests', [SettingsController::class, 'store'])->middleware('throttle:10,1');
            Route::post('account/reverification', [SettingsController::class, 'reverification'])->middleware('throttle:5,1');
            Route::get('account/locations', [SettingsController::class, 'locations']);
            Route::post('account/otp', [SettingsController::class, 'sendCode'])->middleware('throttle:5,1');
            Route::post('account/otp/verify', [SettingsController::class, 'verifyCode'])->middleware('throttle:10,1');
            Route::get('account/documents/{document}', [SettingsController::class, 'document'])->middleware('signed')->name('account.documents');
            Route::get('admin/change-requests', [ReviewController::class, 'index']);
            Route::post('admin/change-requests/{changeRequest}/approve', [ReviewController::class, 'approve']);
            Route::post('admin/change-requests/{changeRequest}/reject', [ReviewController::class, 'reject']);
            Route::get('admin/change-requests/{changeRequest}/documents/{kind}', [ReviewController::class, 'document'])->middleware('signed')->name('account.review-document');
        });
    });
