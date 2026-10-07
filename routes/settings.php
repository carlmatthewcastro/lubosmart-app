<?php

use App\Http\Controllers\Settings\AddressController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/addresses', [AddressController::class, 'index'])->name('settings.addresses.index');
    Route::post('settings/addresses', [AddressController::class, 'store'])->name('settings.addresses.store');
    Route::put('settings/addresses/{address}', [AddressController::class, 'update'])->name('settings.addresses.update');
    Route::delete('settings/addresses/{address}', [AddressController::class, 'destroy'])->name('settings.addresses.destroy');
    Route::patch('settings/addresses/{address}/default', [AddressController::class, 'default'])->name('settings.addresses.default');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
